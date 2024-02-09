import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { Device } from '#types/tenant'
import type { ActivityLog, ContextType, JSObject } from '#types/index'

import Schemas from './schema'
import { allow, getDeviceId, isConnected, isTenant, random } from '#lib/utils'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Devices = App.db.collection('devices') as Collection

    App
    .addHook('preHandler', isConnected( App ) )
    .addHook('preHandler', isTenant( App ) )
    .addHook('preHandler', allow(['SU:', 'PU:ADMIN', 'PU:MANAGER', 'PU:DEVELOPER', 'HU:ADMIN'], contextType ) )

    // Add new device
    .post('/add', Schemas.add, async ( req, rep ) => {
      const
      { branchId } = req.params as JSObject<string>
      if( !branchId )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'DEVICE::INVALID_REQUEST',
                    message: 'Invalid Request: Expect <branchId>'
                  })

      // Clear devices that got no activated
      await Devices.deleteMany({ tenantId: req.tenant.id, os: { $exists: false } })

      const
      id = getDeviceId(),
      // Generate a new device Activation code
      acode = `${random(100, 999)}-${random(100, 999)}`,
      Now = Date.now(),
      device = {
        id,
        tenantId: req.tenant.id,
        branchId,
        activation: {
          code: acode,
          expiry: Now +( 2 * 3600 * 1000 ) // Activation code expiry in 2 hours
        },
        added: { by: req.email, at: Now }
      }

      await Devices.insertOne( device )
      
      /* -----------------------------------------------------------------------------------------------*/
      // New device log
      const alog: ActivityLog = {
        action: 'CREATE-TENANT-DEVICE',
        uid: req.email,
        context: req.user.account.context,
        data: { tenantId: req.tenant.id, branchId, id },
        datetime: Now
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      // TODO: Send notification to tenant administrator
      
      rep.status(201)
          .send({
            error: false,
            status: 'DEVICE::ADDED',
            id,
            acode
          })
    })
    // Activate the new device
    .patch('/:deviceId/activate', Schemas.activate, async ( req, rep ) => {
      const
      { branchId, deviceId } = req.params as JSObject<string>
      if( !branchId )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'DEVICE::INVALID_REQUEST',
                    message: 'Invalid Request: Expect <branchId>'
                  })

      const
      { acode } = req.body as JSObject<string>,
      condition = { id: deviceId, branchId, tenantId: req.tenant.id, 'activation.code': acode },
      device = await Devices.findOne( condition ) as Device | null
      if( !device )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'DEVICE::INVALID_REQUEST',
                    message: 'Invalid activation credentials'
                  })

      // Check activation code expiry
      if( device.activation.expiry <= Date.now() )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'DEVICE::FAILED',
                    message: 'Activation code is expired'
                  })

      const
      { os, version, model, mac } = req.body as JSObject<any>,
      id = getDeviceId(),
      Now = Date.now(),
      update = {
        version,
        model,
        mac,
        os,
        lastIP: req.ip
      }

      await Devices.updateOne( condition, { $set: update, $unset: { activation: true } } )
      
      /* -----------------------------------------------------------------------------------------------*/
      // Activate new device log
      const alog: ActivityLog = {
        action: 'ACTIVATE-TENANT-DEVICE',
        uid: req.email,
        context: req.user.account.context,
        data: { tenantId: req.tenant.id, branchId, id },
        datetime: Now
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      // TODO: Send notification to tenant administrator
      
      return {
        error: false,
        status: 'DEVICE::ADDED',
        message: 'New device added'
      }
    })
    // Fetch activated devices list
    .get('/', Schemas.fetch, async ( req, rep ) => {
      let { limit } = req.query as JSObject<number>
      limit = Number( limit ) || 50

      const
      condition: any = { tenantId: req.tenant.id, activation: { $exists: false } },
      { branchId } = req.query as JSObject<number>
      if( branchId )
        condition.branchId = branchId
      
      // Timestamp of the last item of previous results
      const { offset } = req.query as JSObject<number>
      if( offset )
        condition['added.at'] = { $lt: Number( offset ) }

      const
      // Fetch only item no assign to any tag
      results = await Devices.find( condition ).limit( limit ).sort({ 'added.at': -1 }).toArray() as unknown as Device[],
      response: any = {
        error: false,
        status: 'DEVICE::FETCHED',
        results
      }

      // Return URL to be call to get more results
      if( results.length == limit )
        response.more = `/?offset=${results[ limit - 1 ].added.at}&limit=${limit}`

      return response
    } )
    // Search devices
    .get( '/search', Schemas.search, async ( req, res ) => {
      const
      { query, filters } = req.query as JSObject<any>,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's profile information
      $or.push({ 'os': matcher })
      $or.push({ 'mac': matcher })
      $or.push({ 'version': matcher })
      $or.push({ 'model': matcher })
      $or.push({ 'branchId': matcher })
      $or.push({ 'tenantId': matcher })
      
      // TODO: Apply filters

      const
      condition: any = { tenantId: req.tenant.id, activation: { $exists: false } },
      { branchId } = req.query as JSObject<number>
      if( branchId )
        condition.branchId = branchId

      condition.$or = $or
      
      return {
        error: false,
        status: 'DEVICE::SEARCH',
        results: await Devices.find( condition ).sort({ 'added.at': -1 }).toArray() as unknown as Device[]
      }
    } )
    // Update device details
    .patch('/:deviceId', Schemas.update, async ( req, rep ) => {
      const 
      { branchId, deviceId } = req.params as JSObject<any>,
      condition: any = { id: deviceId, tenantId: req.tenant.id, activation: { $exists: false } }
      if( branchId )
        condition.branchId = branchId

      if( !(await Devices.findOne( condition )) )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'DEVICE::INVALID_REQUEST',
                    message: `Device Not Found`
                  })

      const
      body = req.body as JSObject<any>,
      updates: any = {}

      for( const key in body )
        updates[ key ] = body[ key ]

      if( !Object.keys( updates ).length )
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: 'Invalid Request Arguments'
                  })
        
      // Record the last connection IP address
      updates.lastIP = req.ip
      
      const device = await Devices.findOneAndUpdate( condition, { $set: updates }, { returnDocument: 'after' }) as Device | null

      /* -----------------------------------------------------------------------------------------------*/
      // Updated device info log
      const alog: ActivityLog = {
        action: 'UPDATE-TENANT-DEVICE',
        uid: req.email,
        context: req.user.account.context,
        data: { id: deviceId, updates },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'DEVICE::UPDATED',
        message: 'Device updated',
        device
      }
    })
    // Retreive device info
    .get('/:deviceId', Schemas.retrieve, async ( req, rep ) => {
      const 
      { branchId, deviceId } = req.params as JSObject<any>,
      condition: any = { id: deviceId, tenantId: req.tenant.id, activation: { $exists: false } }
      if( branchId )
        condition.branchId = branchId

      const device = await Devices.findOne( condition ) as Device | null
      if( !device )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'DEVICE::NOT_FOUND',
                    message: `Device Not Found`
                  })

      return {
        error: false,
        status: 'DEVICE::RETRIEVED',
        device
      }
    })
    // Remove device
    .delete('/:deviceId', Schemas.remove, async ( req, rep ) => {
      const 
      { branchId, deviceId } = req.params as JSObject<any>,
      condition: any = { id: deviceId, tenantId: req.tenant.id }
      if( branchId )
        condition.branchId = branchId

      const { deletedCount } = await Devices.deleteOne( condition )
      if( !deletedCount )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'DEVICE::INVALID_REQUEST',
                    message: `Device Not Found`
                  })

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const
      { reason } = req.body as JSObject<string>,
      alog: ActivityLog = {
        action: 'REMOVE-TENANT-DEVICE',
        uid: req.email,
        context: req.user.account.context,
        data: { id: deviceId, reason },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'DEVICE::REMOVED',
        message: 'Device removed'
      }
    })
  }
}