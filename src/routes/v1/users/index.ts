import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { User } from '#types/user'
import type { ActivityLog, ContextType, JSObject } from '#types/index'

import Schemas from './schema'
import { allow, isConnected, isTenant } from '#lib/utils'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Users = App.db.collection('users') as Collection

    App
    .addHook('preHandler', isConnected( App ) )
    .addHook('preHandler', isTenant( App ) )
    .addHook('preHandler', allow(['SU:', 'PU:ADMIN', 'PU:MAMANGER', 'HU:ADMIN'], contextType ) )

    // Fetch users list
    .get('/', Schemas.fetch, async ( req, rep ) => {
      let { limit } = req.query as JSObject<number>
      limit = Number( limit ) || 50

      const condition: any = {}
      
      // Fetch users by tenant scope
      if( ['pharmacy', 'hospital'].includes( contextType ) )
        condition['account.context.id'] = req.tenant.id

      // Timestamp of the last item of previous results
      const { offset } = req.query as JSObject<number>
      if( offset )
        condition.datetime = { $lt: Number( offset ) }

      const
      // Fetch only item no assign to any tag
      results = await Users.find( condition ).limit( limit ).sort({ datetime: -1 }).toArray() as unknown as User[],
      response: any = {
        error: false,
        status: 'USER::FETCHED',
        results
      }

      // Return URL to be call to get more results
      if( results.length == limit )
        response.more = `/?offset=${results[ limit - 1 ].datetime}&limit=${limit}`

      return response
    })

    // Search a user
    .get( '/search', Schemas.search, async ( req, rep ) => {
      const
      { query, filters } = req.query as JSObject<any>,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's profile information
      $or.push({ 'profile.email': matcher })
      $or.push({ 'profile.firstname': matcher })
      $or.push({ 'profile.lastname': matcher })
      $or.push({ 'profile.licenseNumber': matcher })
      $or.push({ 'profile.location.country': matcher })
      $or.push({ 'profile.location.city': matcher })
      $or.push({ 'profile.location.address': matcher })
      
      // TODO: Apply filters

      
      // Fetch users by tenant scope
      const condition: any = { $or }
      if( ['pharmacy', 'hospital'].includes( contextType ) )
        condition['account.context.id'] = req.tenant.id

      return {
        error: false,
        status: 'USER::SEARCH',
        results: await Users.find( condition ).sort({ datetime: -1 }).toArray() as unknown as User[]
      }
    })

    // Update a user details
    .patch('/:email/:section', Schemas.update, async ( req, rep ) => {
      const 
      { email } = req.params as JSObject<any>,
      condition: any = { 'profile.email': email }

      if( ['pharmacy', 'hospital'].includes( contextType ) )
        condition['account.context.id'] = req.tenant.id

      if( !(await Users.findOne( condition )) )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'USER::INVALID_REQUEST',
                    message: `User Not Found`
                  })

      const
      { section } = req.params as JSObject<string>,
      body = req.body as JSObject<any>,
      updates: any = {}

      /**
       * IMPORTANT: Admins cannot operate on anything but
       * the user profile data.
       */
      if( !['account', 'connection'].includes( section ) )
        return rep.status(400)
                  .send({
                    error: true,
                    status: 'USER::UNAUTHORIZED',
                    message: 'Unauthorized Operation Request'
                  })

      for( const key in body )
        updates[`${section}.${key}`] = body[ key ]

      if( !Object.keys( updates ).length )
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'USER::INVALID_REQUEST',
                    message: 'Invalid Request Arguments'
                  })
      
      const user = await Users.findOneAndUpdate( condition, { $set: updates }, { returnDocument: 'after' }) as User | null

      /* -----------------------------------------------------------------------------------------------*/
      // Update user log
      const alog: ActivityLog = {
        action: 'UPDATE-USER',
        uid: req.email,
        context: req.user.account.context,
        data: { email, updates },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'USER::UPDATED',
        message: 'User updated',
        user
      }
    })

    // Retreive a user account
    .get('/:email', Schemas.retrieve, async ( req, rep ) => {
      const 
      { email } = req.params as JSObject<any>,
      condition: any = { 'profile.email': email }
      
      if( ['pharmacy', 'hospital'].includes( contextType ) )
        condition['account.context.id'] = req.tenant.id

      const user = await Users.findOne( condition ) as User | null
      if( !user )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'USER::NOT_FOUND',
                    message: `User Not Found`
                  })

      return {
        error: false,
        status: 'USER::RETRIEVED',
        user
      }
    })

    // Delete a user account
    .delete('/:email', Schemas.remove, async ( req, rep ) => {
      const 
      { email } = req.params as JSObject<any>,
      condition: any = { 'profile.email': email }
      
      if( ['pharmacy', 'hospital'].includes( contextType ) )
        condition['account.context.id'] = req.tenant.id

      const { deletedCount } = await Users.deleteOne( condition )
      if( !deletedCount )
        return rep.status(404)
                  .send({
                    error: true,
                    status: 'USER::INVALID_REQUEST',
                    message: `User Not Found`
                  })

      /* -----------------------------------------------------------------------------------------------*/
      // Delete user log
      const 
      { reason } = req.body as JSObject<string>,
      alog: ActivityLog = {
        action: 'DELETE-USER',
        uid: req.email,
        context: req.user.account.context,
        data: { email, reason },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'USER::DELETED',
        message: 'User account deleted'
      }
    })
  }
}