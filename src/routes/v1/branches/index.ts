import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { Branch } from '#types/tenant'
import type { ActivityLog, ContextType, JSObject } from '#types/index'

import Schemas from './schema'
import { allow, getBranchId, isConnected, isTenant } from '#lib/utils'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Branches = App.db.collection('branches') as Collection

    App
    .addHook('preHandler', isConnected( App ) )
    .addHook('preHandler', isTenant( App ) )
    .addHook('preHandler', allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) )

    // Create new branch
    .post('/create', Schemas.create, async ( req, rep ) => {
      const
      { name, phones, emails, location } = req.body as JSObject<any>,
      id = getBranchId(),
      Now = Date.now(),
      branch: Branch = {
        id,
        tenantId: req.tenant.id,
        name,
        contacts: { phones, emails },
        location,
        created: {
          by: req.email,
          at: Now
        }
      }

      await Branches.insertOne( branch )
      
      /* -----------------------------------------------------------------------------------------------*/
      // New branch log
      const alog: ActivityLog = {
        action: 'CREATE-TENANT-BRANCH',
        uid: req.email,
        context: req.user.account.context,
        data: { id: req.tenant.id, name, location },
        datetime: Now
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      // TODO: Send notification to tenant administrator
      
      rep.status(201)
          .send({
            error: false,
            status: 'BRANCH::CREATED',
            message: 'New branch created',
            id
          })
    })

    // Fetch branches list
    .get('/', Schemas.fetch, async ( req, rep ) => {
      let { limit, page } = req.query as JSObject<number>

      limit = Number( limit ) || 50
      page = Number( page ) || 1

      const
      condition: any = { tenantId: req.tenant.id },
      // Fetch only item no assign to any tag
      results = await Branches.find( condition )
                              .skip( limit * ( page - 1 ) )
                              .limit( limit )
                              .sort({ 'created.at': -1 })
                              .toArray() as unknown as Branch[]
                              
      return {
        error: false,
        status: 'BRANCH::FETCHED',
        results,
        more: results.length == limit
      }
    } )

    // Search branches
    .get( '/search', Schemas.search, async ( req, res ) => {
      const
      { query, filters } = req.query as JSObject<any>,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's profile information
      $or.push({ 'name': matcher })
      $or.push({ 'location.country': matcher })
      $or.push({ 'location.city': matcher })
      $or.push({ 'location.address': matcher })
      
      // TODO: Apply filters

      return {
        error: false,
        status: 'BRANCH::SEARCH',
        results: await Branches.find({ tenantId: req.tenant.id, $or }).sort({ 'created.at': -1 }).toArray() as unknown as Branch[]
      }
    } )

    // Update branch details
    .patch('/:branchId', Schemas.update, async ( req, rep ) => {
      const 
      { branchId } = req.params as JSObject<any>,
      condition = { id: branchId, tenantId: req.tenant.id }
      if( !(await Branches.findOne( condition )) )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'BRANCH::INVALID_REQUEST',
                    message: `Branch Not Found`
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
                    status: 'BRANCH::INVALID_REQUEST',
                    message: 'Invalid Request Arguments'
                  })
      
      const branch = await Branches.findOneAndUpdate( condition, { $set: updates }, { returnDocument: 'after' }) as Branch | null

      /* -----------------------------------------------------------------------------------------------*/
      // Updated branch info log
      const alog: ActivityLog = {
        action: 'UPDATE-TENANT-BRANCH',
        uid: req.email,
        context: req.user.account.context,
        data: { id: req.tenant.id, branchId, updates },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'BRANCH::UPDATED',
        message: 'Branch updated',
        branch
      }
    })

    // Retreive branch info
    .get('/:branchId', Schemas.retrieve, async ( req, rep ) => {
      const 
      { branchId } = req.params as JSObject<any>,
      condition = { id: branchId, tenantId: req.tenant.id },
      branch = await Branches.findOne( condition ) as Branch | null
      if( !branch )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'BRANCH::NOT_FOUND',
                    message: `Branch Not Found`
                  })

      return {
        error: false,
        status: 'BRANCH::RETRIEVED',
        branch
      }
    })

    // Delete branch
    .delete('/:branchId', Schemas.remove, async ( req, rep ) => {
      const 
      { branchId } = req.params as JSObject<any>,
      condition = { id: branchId, tenantId: req.tenant.id },
      { deletedCount } = await Branches.deleteOne( condition )
      if( !deletedCount )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'BRANCH::INVALID_REQUEST',
                    message: `Branch Not Found`
                  })

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const 
      { reason } = req.body as JSObject<string>,
      alog: ActivityLog = {
        action: 'DELETE-TENANT-BRANCH',
        uid: req.email,
        context: req.user.account.context,
        data: { id: req.tenant.id, branchId, reason },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'BRANCH::DELETED',
        message: 'Branch closed'
      }
    })
  }
}