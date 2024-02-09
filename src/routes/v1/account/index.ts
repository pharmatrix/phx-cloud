import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { User } from '#types/user'
import type { ActivityLog, JSObject } from '#types/index'

import Schemas from './schema'
import { isConnected } from '#lib/utils'

export default async ( App: FastifyInstance ) => {
  const
  Logs = App.db.collection('logs') as Collection,
  Users = App.db.collection('users') as Collection

  App
  .addHook('preHandler', isConnected( App ) )

  // Retreive my account
  .get('/', Schemas.retrieve, async ( req, rep ) => {
    return {
      error: false,
      status: 'ACCOUNT::RETRIEVED',
      user: req.user
    }
  })

  // Update my profile
  .patch('/profile', Schemas.profile, async ( req, rep ) => {
    const
    body = req.body as JSObject<any>,
    updates: any = {}

    for( const key in body )
      updates[`profile.${key}`] = body[ key ]

    if( !Object.keys( updates ).length )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::INVALID_REQUEST',
                  message: 'Invalid Request Arguments'
                })
    
    const user = await Users.findOneAndUpdate({ 'profile.email': req.email }, { $set: updates }, { returnDocument: 'after' }) as User | null

    /* -----------------------------------------------------------------------------------------------*/
    // Update user profile log
    const alog: ActivityLog = {
      action: 'UPDATE-USER-PROFILE',
      uid: req.email,
      context: req.user.account.context,
      data: { updates },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'ACCOUNT::UPDATED',
      message: 'User profile updated',
      user
    }
  })

  // Update my account settings
  .patch('/settings', Schemas.settings, async ( req, rep ) => {
    const
    body = req.body as JSObject<any>,
    updates: any = {}

    for( const key in body )
      updates[`account.settings.${key}`] = body[ key ]

    if( !Object.keys( updates ).length )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::INVALID_REQUEST',
                  message: 'Invalid Request Arguments'
                })
    
    const user = await Users.findOneAndUpdate({ 'profile.email': req.email }, { $set: updates }, { returnDocument: 'after' }) as User | null

    /* -----------------------------------------------------------------------------------------------*/
    // Update user account settings log
    const alog: ActivityLog = {
      action: 'UPDATE-USER-SETTINGS',
      uid: req.email,
      context: req.user.account.context,
      data: { updates },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'ACCOUNT::UPDATED',
      message: 'User account settings updated',
      user
    }
  })

  // Close my account
  .delete('/', Schemas.close, async ( req, rep ) => {
    /**
     * Prevent Super Admin users to self-close
     * their account.
     * 
     * Must be done by another admin base on the policy
     * that there should be at least one admin left to
     * manage and restore services and any other account.
     */
    if( req.user.account.context.role === 'SU:ADMIN' )
      return rep.status(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::INVALID_REQUEST',
                  message: 'Authorization Denied: Contact administrator'
                })

    const { deletedCount } = await Users.deleteOne({ 'profile.email': req.email })
    if( !deletedCount )
      return rep.status(404)
                .send({
                  error: true,
                  status: 'ACCOUNT::INVALID_REQUEST',
                  message: `User Not Found`
                })

    /* -----------------------------------------------------------------------------------------------*/
    // Delete user log
    const 
    { reason } = req.body as JSObject<string>,
    alog: ActivityLog = {
      action: 'CLOSE-USER-ACCOUNT',
      uid: req.email,
      context: req.user.account.context,
      data: { reason },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'ACCOUNT::CLOSED',
      message: 'User account closed'
    }
  })
}