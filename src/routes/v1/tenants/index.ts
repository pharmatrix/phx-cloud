import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { Tenant, TenantType } from '#types/tenant'
import type { ActivityLog, ContextType, JSObject } from '#types/index'

import Schemas from './schema'
import { allow, getTenantId, isConnected } from '#lib/utils'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Users = App.db.collection('users') as Collection,
    Tenants = App.db.collection('tenants') as Collection,
    Branches = App.db.collection('branches') as Collection

    App
    .addHook('preHandler', isConnected( App ) )

    // Create new tenant
    .post('/register', { ...Schemas.register, preHandler: [ allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) ] }, async ( req, rep ) => {
      const { name } = req.body as JSObject<any>
      if( await Tenants.findOne({ name }) )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: `Tenant <${name}> already exists`
                  })

      // Specified tenant type: Optional 
      let { type } = req.body as JSObject<any>
      if( ['pharmacy', 'hospital'].includes( contextType ) ){
        type = contextType as TenantType

        /**
         * Prevent a current Super-User to use `pharmacy` or `hospital`
         * context endpoints pathname to register a new tenant. 
         * 
         * Eg: Use `/super/v1/tenants/register` instead of `/pharmacy/v1/tenants/register`
         */
        if( /^SU:/.test( req.user.account.context.role ) )
          return rep.status(400)
                    .send({
                      error: true,
                      status: 'TENANT::INVALID_REQUEST',
                      message: 'Use super endpoints to register the tenant instead'
                    })

        // Only user with PU:ADMIN beside super user, can register a new pharmacy
        if( type == 'pharmacy' && req.user.account.context.role !== 'PU:ADMIN' )
          return rep.status(400)
                    .send({
                      error: true,
                      status: 'TENANT::INVALID_REQUEST',
                      message: 'Invalid User Role'
                    })

        // Only user with HU:ADMIN beside super user, can register a new hospital
        if( type == 'hospital' && req.user.account.context.role !== 'HU:ADMIN' )
          return rep.status(400)
                    .send({
                      error: true,
                      status: 'TENANT::INVALID_REQUEST',
                      message: 'Invalid User Role'
                    })
      }
      
      // Operation process by super user
      else if( !type )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: 'Tenant type is required'
                  })

      // Final tenant type must be `pharmacy` or `hospital`
      if( !['pharmacy', 'hospital'].includes( type ) )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: 'Invalid Tenant type'
                  })
      
      const
      { logo, phones, emails, licenseNumber, location } = req.body as JSObject<any>,
      id = getTenantId( type ),
      Now = Date.now(),
      tenant: Tenant = {
        type,
        id,
        name,
        logo,
        contacts: { phones, emails },
        licenseNumber,
        location,
        registered: {
          by: req.email,
          at: Now
        }
      }

      await Tenants.insertOne( tenant )

      // Assign tenant ID to user context
      if( ['PU:ADMIN', 'HU:ADMIN'].includes( req.user.account.context.role ) )
        await Users.updateOne({ 'profile.email': req.email }, { $set: { 'account.context.id': id } })

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const alog: ActivityLog = {
        action: 'CREATE-TENANT',
        uid: req.email,
        context: req.user.account.context,
        data: { id, name },
        datetime: Now
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      // TODO: Send notification to tenant administrator
      
      rep.status(201)
          .send({
            error: false,
            status: 'TENANT::REGISTERED',
            message: 'New tenant registered',
            id
          })
    })

    // Fetch tenants list
    .get( '/', { ...Schemas.fetch, preHandler: [ allow(['SU:'], contextType ) ] }, async ( req, rep ) => {
      let { limit, page } = req.query as JSObject<number>

      limit = Number( limit ) || 50
      page = Number( page ) || 1

      const
      condition: any = {},
      // Fetch only item no assign to any tag
      results = await Tenants.find( condition )
                              .skip( limit * ( page - 1 ) )
                              .limit( limit )
                              .sort({ 'registered.at': -1 })
                              .toArray() as unknown as Tenant[]
                              
      return {
        error: false,
        status: 'TENANT::FETCHED',
        results,
        more: results.length == limit
      }
    } )

    // Search tenant
    .get( '/search', { ...Schemas.search, preHandler: [ allow(['SU:'], contextType ) ] }, async ( req, res ) => {
      const
      { query, filters } = req.query as JSObject<any>,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's profile information
      $or.push({ 'name': matcher })
      $or.push({ 'licenseNumber': matcher })
      $or.push({ 'location.country': matcher })
      $or.push({ 'location.city': matcher })
      $or.push({ 'location.address': matcher })
      
      // TODO: Apply filters

      return {
        error: false,
        status: 'TENANT::SEARCH',
        results: await Tenants.find({ $or }).sort({ 'registered.at': -1 }).toArray() as unknown as Tenant[]
      }
    } )

    // Update tenant details
    .patch('/:id', { ...Schemas.update, preHandler: [ allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) ] }, async ( req, rep ) => {
      let { id } = req.params as JSObject<any>
      // Refer to current's user context ID
      if( id === 'me' ) id = req.user.account.context.id

      if( !(await Tenants.findOne({ id })) )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: `Tenant Not Found`
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
      
      const tenant = await Tenants.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' }) as Tenant | null

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const alog: ActivityLog = {
        action: 'UPDATE-TENANT',
        uid: req.email,
        context: req.user.account.context,
        data: { id, updates },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'TENANT::UPDATED',
        message: 'Tenant updated',
        tenant
      }
    })

    // Retreive tenant account
    .get('/:id', { ...Schemas.retrieve, preHandler: [ allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) ] }, async ( req, rep ) => {
      let { id } = req.params as JSObject<any>
      // Refer to current's user context ID
      if( id === 'me' ) id = req.user.account.context.id

      const tenant = await Tenants.findOne({ id }) as Tenant | null
      if( !tenant )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'TENANT::NOT_FOUND',
                    message: `Tenant Not Found`
                  })

      return {
        error: false,
        status: 'TENANT::RETRIEVED',
        tenant
      }
    })

    // Delete tenant account
    .delete('/:id', { ...Schemas.remove, preHandler: [ allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) ] }, async ( req, rep ) => {
      let { id } = req.params as JSObject<any>
      // Refer to current's user context ID
      if( id === 'me' ) id = req.user.account.context.id

      const { deletedCount } = await Tenants.deleteOne({ id })
      if( !deletedCount )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'TENANT::INVALID_REQUEST',
                    message: `Tenant Not Found`
                  })

      // Delete all branches attached to this tenant account
      await Branches.deleteMany({ tenantId: id })
      /**
       * Detach all users attached to this tenant 
       * account except tenant's admins, so that they
       * have possibility to recreate a new tenant.
       */
      await Users.updateMany({ 'account.context.id': id, 'account.context.role': { $nin: ['PU:ADMIN', 'HU:ADMIN'] } }, { $set: { 'account.context': {} } })

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const 
      { reason } = req.body as JSObject<string>,
      alog: ActivityLog = {
        action: 'DELETE-TENANT',
        uid: req.email,
        context: req.user.account.context,
        data: { id, reason },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'TENANT::DELETED',
        message: 'Tenant account closed'
      }
    })
  }
}