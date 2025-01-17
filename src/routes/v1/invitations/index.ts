import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { User } from '#types/user'
import type { Tenant } from '#types/tenant'
import type { ActivityLog, Context, ContextType, Invitation, JSObject } from '#types/index'

import * as rtoken from 'rand-token'
import Encoder from '#lib/Encoder'
import Schemas from './schema'
import { isConnected, isValidEmail, random  } from '#lib/utils'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Users = App.db.collection('users') as Collection,
    Tenants = App.db.collection('tenants') as Collection,
    Invitations = App.db.collection('invitations') as Collection

    App
    // Send invitation to user
    .post('/send', { ...Schemas.invite, preHandler: [ isConnected( App ) ] }, async ( req, rep ) => {
      let { email } = req.body as JSObject<any>
      // Normalize email address
      email = email.trim().toLowerCase()
      if( !isValidEmail( email ) )
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'INVITATION::INVALID_REQUEST',
                    message: 'Invalid Email Address'
                  })
                  
      const { role } = req.body as JSObject<any>
      if( ['SU:ADMIN'].includes( role ) )
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'INVITATION::INVALID_REQUEST',
                    message: 'Unauthorized User Role'
                  })
      
      // Check whether user account already bear this role
      const exists = await Users.findOne({ 'profile.email': email, 'account.context.type': contextType, 'account.context.role': role }) as User | null
      if( exists )
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'INVITATION::INVALID_REQUEST',
                    message: 'This user account already bear this role'
                  })
      
      let context: Context = { type: contextType, role }
      switch( contextType ){
        case 'pharmacy': {
          const pharmacy = await Tenants.findOne({ type: 'pharmacy', id: req.user.account.context.id }) as Tenant | null
          if( !pharmacy )
            return rep.code(401)
                      .send({
                        error: true,
                        status: 'INVITATION::ACCESS_DENIED',
                        message: 'Unauthorized invitation request'
                      })

          // Possible pharmacy user roles authorized to invite
          if( !['PU:ADMIN', 'PU:MANAGER', 'PU:OPERATOR', 'PU:SUPPORT', 'PU:DEVELOPER'].includes( role ) )
            return rep.code(400)
                      .send({
                        error: true,
                        status: 'INVITATION::INVALID_REQUEST',
                        message: 'Unauthorized invitation role'
                      })

          // User roles authorized to invite a given pharmacy user
          if( !['SU:ADMIN', 'SU:MANAGER', 'PU:ADMIN', 'PU:MANAGER'].includes( req.user.account.context.role ) )
            return rep.code(400)
                      .send({
                        error: true,
                        status: 'INVITATION::INVALID_REQUEST',
                        message: 'Unauthorized invitation role'
                      })

          context.id = req.user.account.context.id
        } break

        case 'hospital': {
          const hospital = await Tenants.findOne({ type: 'hospital', id: req.user.account.context.id }) as Tenant | null
          if( !hospital )
            return rep.code(401)
                      .send({
                        error: true,
                        status: 'INVITATION::ACCESS_DENIED',
                        message: 'Unauthorized invitation request'
                      })

          // Possible hospital user roles authorized to invite
          if( !['HU:ADMIN', 'HU:PRACTICIAN'].includes( role ) )
            return rep.code(400)
                      .send({
                        error: true,
                        status: 'INVITATION::INVALID_REQUEST',
                        message: 'Unauthorized invitation role'
                      })

          // User roles authorized to invite a given hospital user
          if( !['SU:ADMIN', 'SU:MANAGER', 'HU:ADMIN'].includes( req.user.account.context.role ) )
            return rep.code(400)
                      .send({
                        error: true,
                        status: 'INVITATION::INVALID_REQUEST',
                        message: 'Unauthorized invitation role'
                      })

          context.id = req.user.account.context.id
        } break
        
        default: {
          // User roles authorized to invite any user
          if( !['SU:ADMIN', 'SU:MANAGER'].includes( req.user.account.context.role ) )
            return rep.code(400)
                      .send({
                        error: true,
                        status: 'INVITATION::INVALID_REQUEST',
                        message: 'Unauthorized invitation role'
                      })

          /**
           * In case user is directly invited to join a
           * tenant by a Super-Admin
           */
          const { tenantId } = req.body as JSObject<any>
          if( tenantId ){
            // Tenant must exists
            if( !(await Tenants.findOne({ id: tenantId })) )
              return rep.code(400)
                        .send({
                          error: true,
                          status: 'INVITATION::INVALID_REQUEST',
                          message: 'Tenant Not Found'
                        })

            context.id = tenantId
          }
        }
      }
      
      const
      Now = Date.now(),
      expiry = Now + ( 24 * 3600 * 1000),
      { name } = req.body as JSObject<any>,
      invitation: Invitation = {
        context,
        name,
        email,
        expiry,
        added: { by: req.email, at: Now }
      }

      await Invitations.updateOne({ context, email }, { $set: invitation }, { upsert: true })

      /* -----------------------------------------------------------------------------------------------*/
      // New invitation log
      const alog: ActivityLog = {
        action: 'INVITATION',
        uid: req.email,
        context,
        data: { context, invited: email },
        datetime: Now
      }
      await Logs.insertOne( alog )
      
      return {
        error: false,
        status: 'INVITATION::SENT',
        message: 'Invitation sent',
        itoken: Encoder.encode({ context, email })
      }
    })

    // Fetch the list of pending invitations
    .get('/', { ...Schemas.fetch, preHandler: [ isConnected( App ) ] }, async ( req ) => {
      let { limit, page } = req.query as JSObject<number>

      limit = Number( limit ) || 50
      page = Number( page ) || 1

      const invitations = await Invitations.find({ 'context.type': contextType })
                                            .skip( limit * ( page - 1 ) )
                                            .limit( limit )
                                            .sort({ 'added.at': -1 })
                                            .toArray() as unknown as Invitation[]

      return {
        error: false,
        status: 'INVITATION::FETCHED',
        invitations,
        more: invitations.length == limit
      }
    })

    // Accept invitation
    .patch('/accept', Schemas.accept, async ( req, rep ) => {
      try {
        const
        { itoken } = req.body as JSObject<any>,
        { context, email } = Encoder.decode( itoken ),
        invitation = await Invitations.findOne({ context, email }) as Invitation | null
        if( !invitation )
          return rep.code(400)
                    .send({
                      error: true,
                      status: 'INVITATION::INVALID_REQUEST',
                      message: 'No Invitation Found'
                    })

        const 
        condition = { 'profile.email': email },
        user = await Users.findOne( condition ) as User | null
        let userExists = false

        // Update existing user account info
        if( user ){
          userExists = true
          
          const { modifiedCount } = await Users.updateOne( condition, { $set: { 'account.context': context } } )
          if( !modifiedCount )
            return rep.code(500)
                      .send({
                        error: true,
                        status: 'INVITATION::INTERNAL_ERROR',
                        message: 'Unexpect Error Occured. Retry later'
                      })
        }
        
        // User doesn't exists
        else await Users.insertOne({
          profile: {
            email
          },
          account: {
            context,
            PIN: String( random(1000, 9999) ), // Default PIN
            settings: {
              notification: {
                push: rtoken.generate(48) as string, // Push notification token
                email: true
              }
            }
          },
          connection: {
            restricted: {
              action: 'COMPLETE-SIGNUP',
              message: 'Must complete sign-up'
            }
          }
        })
        
        // Delete invitation
        await Invitations.deleteOne({ context, email })

        return {
          error: false,
          status: 'INVITATION::ACCEPTED',
          message: `Invitation accepted`,
          next: userExists ? 'signin' : 'complete-signup'
        }
      }
      catch( error ){
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'INVITATION::INVALID_REQUEST',
                    message: 'Invalid Invitation Token'
                  })
      }
    })

    // Delete invitation
    .delete('/:token', Schemas.accept, async ( req, rep ) => {
      try {
        const
        { itoken } = req.params as JSObject<any>,
        { context, email } = Encoder.decode( itoken ),
        invitation = await Invitations.findOne({ context, email }) as Invitation | null
        if( !invitation )
          return rep.code(400)
                    .send({
                      error: true,
                      status: 'INVITATION::INVALID_REQUEST',
                      message: 'No Invitation Found'
                    })

        // Delete invitation
        await Invitations.deleteOne({ context, email })

        return {
          error: false,
          status: 'INVITATION::DELETED',
          message: `Invitation deleted`
        }
      }
      catch( error ){
        return rep.code(400)
                  .send({
                    error: true,
                    status: 'INVITATION::INVALID_REQUEST',
                    message: 'Invalid Invitation Token'
                  })
      }
    })
  }
}