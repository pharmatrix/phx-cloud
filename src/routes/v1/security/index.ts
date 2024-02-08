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

  // Create account security PIN Code: 4 digit PIN could also contain letters
  .post( '/pin/create', Schemas.pin, async ( req, rep ) => {
    const { PIN } = req.body as JSObject<string>
    if( req.user.account.PIN )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::SECURITY_FAILED',
                  message: 'Use --change-- to change your PIN'
                })

    await Users.updateOne({ 'profile.email': req.email }, { $set: { 'account.PIN': PIN } } )

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'CREATE-PIN',
      uid: req.email,
      context: req.user.account.context,
      data: {},
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    return {
      error: false,
      status: 'ACCOUNT::SECURITY',
      message: 'PIN Saved'
    }
  } )

  // Change account security PIN Code: 4 digit PIN could also contain letters
  .patch( '/pin/change', Schemas.change, async ( req, rep ) => {
    const { PIN, nPIN } = req.body as JSObject<string>
    if( !nPIN )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::SECURITY_FAILED',
                  message: 'Invalid PIN'
                })
                
    const { modifiedCount } = await Users.updateOne({ 'profile.email': req.email, 'account.PIN': PIN }, { $set: { 'account.PIN': nPIN } })
    if( !modifiedCount )
      return { 
        error: true,
        status: 'ACCOUNT::SECURITY_FAILED',
        message: 'Invalid PIN or Up-to-date'
      }
    
    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'CHANGE-PIN',
      uid: req.email,
      context: req.user.account.context,
      data: {},
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    return { 
      error: false,
      status: 'ACCOUNT::SECURITY_UPDATED',
      message: 'PIN Changed'
    }
  } )

  // Verify or check account security: 4 digit PIN could also contain letters
  .get( '/pin/check', Schemas.check, async req => {
    const user = await Users.findOne({ 'profile.email': req.email, 'account.PIN': { $exists: true } }) as User | null
    return { error: false, status: 'ACCOUNT::SECURE', confirmed: !!user }
  } )

  // Verify security PIN Code
  .post( '/pin/verify', Schemas.pin, async req => {
    const
    { PIN } = req.body as JSObject<string>,
    user = await Users.findOne({ 'profile.email': req.email, 'account.PIN': PIN })

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'VERIFY-PIN',
      uid: req.email,
      context: req.user.account.context,
      data: {},
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    return { error: false, status: 'ACCOUNT::SECURITY', valid: !!user }
  } )

  // Manage account security: 4 digit PIN could also contain letters
  .patch( '/pin/dismiss', Schemas.pin, async ( req, rep ) => {
    const { PIN } = req.body as JSObject<string>
    if( !PIN )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'ACCOUNT::SECURITY_FAILED',
                  message: 'Invalid PIN'
                })

    const { modifiedCount } = await Users.updateOne({ 'profile.email': req.email, 'account.PIN': PIN }, { $unset: { 'account.PIN': true } } )
    if( !modifiedCount )
      return {
        error: true,
        status: 'ACCOUNT::SECURITY_FAILED',
        message: 'Invalid PIN'
      }

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'DISMISS-PIN',
      uid: req.email,
      context: req.user.account.context,
      data: {},
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'ACCOUNT::SECURITY_UPDATED',
      message: 'PIN Removed'
    }
  } )
}