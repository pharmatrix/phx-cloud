import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { User } from '#types/user'
import type { ActivityLog, JSObject } from '#types/index'

import Schemas from './schema'
import * as rtoken from 'rand-token'
import Encoder from '#lib/Encoder'
import { getImageSource, hashPassword, isConnected, isValidEmail, random  } from '#lib/utils'

export default async ( App: FastifyInstance ) => {
  const
  Logs = App.db.collection('logs') as Collection,
  Users = App.db.collection('users') as Collection

  App
  // Signup
  .post('/signup', Schemas.signup, async ( req, rep ) => {
    // Check for existing user
    let { email } = req.body as JSObject<any>
    if( !isValidEmail( email ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address'
                })

    const exists = await Users.findOne({ 'profile.email': email }) as unknown as User | null
    if( exists )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::EXISTING_USER',
                  message: 'User already exists'
                })

    // Normalize email address
    email = email.trim().toLowerCase()
    if( !email )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid email address'
                })

    const { role } = req.body as JSObject<any>
    if( !['PU:ADMIN'].includes( role ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Unauthorized User Role'
                })

    const { password } = req.body as JSObject<any>
    if( !password )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Password'
                })
    
    const
    { firstname, lastname, agree_terms, location, device } = req.body as JSObject<any>,
    Now = Date.now(),
    user: User = {
      profile: {
        email,
        firstname,
        lastname,
        password: await hashPassword( password ) as string,
        avatar: getImageSource( firstname ),
        location
      },
      account: {
        role,
        PIN: String( random(1000, 9999) ), // Default PIN
        notification: {
          push: rtoken.generate(48) as string, // Push notification token
          email: true
        }
      },
      connection: {
        verification: {
          code: process.env.NOTIFICATION_EMAIL_ADDRESS ? random(1000, 9999) as number : 1000,
          expiry: Date.now() +( 2 * 3600 * 1000 ) // 2 hours
        }
      },
      agree_terms,
      datetime: Now
    }

    await Users.insertOne( user )

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-up log
    const alog: ActivityLog = {
      action: 'SIGNUP',
      uid: email,
      role,
      data: { location, device },
      datetime: Now
    }
    await Logs.insertOne( alog )

    /* -----------------------------------------------------------------------------------------------*/
    // Send verification code by email
    try {
      // NOTE: Do not await for response
      // req.bnd.send.email({
      //   sender: 'General-Email-Sender',
      //   express: true,
      //   priority: 'high',
      //   template: 'Verification Code',
      //   subject: 'Email Address Verification Code',
      //   recipient: { name: getName( req.body ), address: email },
      //   scope: {
      //     name: data.profile.first_name,
      //     tenant: !isTenant( req ) ? process.env.APPNAME : req.tenant.name,
      //     refURL: `${process.env.SUPPORT_PAGE_URL}/auth/verify/code`,
      //     vCode
      //   }
      // })
    }
    catch( error ) { console.log( 'SEND_EMAIL::FAILED >> ', error ) }

    /* -----------------------------------------------------------------------------------------------*/
    console.log( `Verification Code: ${user.connection.verification?.code}` )
    const response = {
      error: false,
      status: 'AUTH::SIGNUP',
      message: `The email verification code is sent to ${email}`,
      next: 'verify'
    }

    // Send vCode out during development mode for Postman Automated Test
    rep.code(201).send( process.env.NODE_ENV == 'development' ? { ...response, code: user.connection.verification?.code } : response )
  })
  // Signin the user
  .post('/signin', Schemas.signin, async ( req, rep ) => {
    const { email }: any = req.body
    if( !isValidEmail( email ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address'
                })

    if( !email )
      return {
        error: false,
        status: 'AUTH::INVALID_CREDENTIALS',
        message: 'Undefined Email',
        next: 'signin'
      }

    // Get the authentication account
    const user = await Users.findOne({ 'profile.email': email }) as User | null
    if( !user )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::USER_NOT_FOUND',
                  message: 'User Account Not Found',
                  next: 'signup'
                })

    // Check whether user email address is verified
    if( user.connection.verification )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::USER_NOT_FOUND',
                  message: 'User Account Verification Required',
                  next: 'verify'
                })

    /* -----------------------------------------------------------------------------------------------*/
    // Checking password
    const { password }: any = req.body
    if( !( await hashPassword( password, user.profile.password ) ) )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_PASSWORD',
                  message: 'Invalid Password'
                })

    // Create new connection token
    const token = rtoken.generate( 24 )
    await Users.updateOne({ 'profile.email': email }, { $set: { 'connection.token': token } })

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-in log
    const 
    { location, device }: any = req.body,
    alog: ActivityLog = {
      action: 'SIGNIN',
      uid: email,
      role: user.account.role,
      data: { location, device },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    return {
      error: false,
      status: 'AUTH::CONNECTED',
      ctoken: Encoder.encode({ email, token })
    }
  })
  // User account verification
  .post('/verify/email', Schemas.verify, async ( req, rep ) => {
    const { email }: any = req.body
    if( !isValidEmail( email ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address'
                })
    
    const
    { code }: any = req.body,
    condition = {
      'profile.email': email,
      'connection.verification.code': code
      // RIVIEW: 'connection.verification.expiry': { $gt: Date.now() }
    },
    user = await Users.findOne( condition ) as User | null
    if( !user )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_PVC',
                  message: 'Verification Code is invalid or has expired'
                })
    
    // User email is verified: Create new connection token
    const 
    token = rtoken.generate( 24 ),
    toUpdate = {
      $set: { 'connection.token': token },
      $unset: { 'connection.verification': true }
    }
    
    await Users.updateOne({ 'profile.email': email }, toUpdate )
    return {
      error: false,
      status: 'AUTH::CONNECTED',
      ctoken: Encoder.encode({ email, token })
    }
  })
  // User sign-out
  .get( '/signout', { preHandler: [ isConnected( App ) ] }, async ( req, rep ) => {
    const 
    { email } = req.user.profile,
    user = await Users.findOneAndUpdate({ 'profile.email': email }, 
                                        { $unset: { 'connection.token': true } },
                                        { returnDocument: 'after' }) as User | null
    if( !user )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::USER_NOT_FOUND',
                  message: 'User Account Not Found',
                  next: 'signup'
                })

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'SIGNOUT',
      uid: email,
      role: user.account.role,
      data: {},
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    return { error: false, status: 'DISCONNECTED', message: 'User is disconnected'}
  })

  /** ------------ Forgottern & Reset Password Processes -----------**/

  // Reset user's new password
  .patch('/reset-pwd', Schemas.resetPassword, async ( req, rep ) => {
    const
    { token, new_password }: any = req.body,
    errmess = {
      error: true,
      status: 'AUTH::RESET_FAILED',
      message: 'Password Reset Token is invalid or has expired',
      next: 'reset-pwd'
    }

    try {
      const { email, vtoken } = Encoder.decode( token )
      if( !email || !vtoken )
        return rep.code(400).send( errmess )

      const user = await Users.findOneAndUpdate({
                                                  'profile.email': email,
                                                  'connection.resetPwd.vtoken': vtoken,
                                                  'connection.resetPwd.expiry': { $gt: Date.now() }
                                                },
                                                { // Set the new password
                                                  $set: { 'profile.password': await hashPassword( new_password ) },
                                                  // Remove reset request record
                                                  $unset: { 'connection.resetPwd': true }
                                                },
                                                { returnDocument: 'after' }) as User | null
      if( !user )
        return rep.code(400).send( errmess )

      /* -----------------------------------------------------------------------------------------------*/
      // New sign-out log
      const alog: ActivityLog = {
        action: 'RESET-PASSWORD',
        uid: email,
        role: user.account.role,
        data: { vtoken },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      try {
        // NOTE: Do not await for response
        // req.bnd.send.email({
        //                     sender: 'General-Email-Sender',
        //                     template: 'Password Reset Confirmation',
        //                     subject: 'Password Reset Confirmation',
        //                     recipient: { name: getName( updates.profile ), address: email },
        //                     scope: {
        //                         tenant: !isTenant( req ) ? process.env.APPNAME : req.tenant.name,
        //                         domain,
        //                         signinLink: `${domain }/signin`,
        //                         supportEmail: !isTenant( req ) ?
        //                                             process.env.DEFAULT_SUPPORT_EMAIL
        //                                             : req.tenant.contacts.support || process.env.DEFAULT_SUPPORT_EMAIL
        //                     }
        //                   })
      }
      catch( error ) { console.log( 'SEND_EMAIL::FAILED >> ', error ) }

      return {
        error: false,
        status: 'AUTH::PASSWORD_RESET',
        message: 'Password Reset Successfully',
        next: 'signin'
      }
    }
    catch( error ) {
      console.log('[RESET_PWD] Error: ', error )
      rep.code(400).send( errmess )
    }
  })
  // Request reset password Link
  .post('/reset-pwd/link', Schemas.resetPasswordLink, async ( req, rep ) => {
    const { email }: any = req.body
    if( !isValidEmail( email ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address'
                })

    const
    condition = { 'profile.email': email },
    user = await Users.findOne( condition ) as User | null
    if( !user )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address',
                  next: 'signin'
                })

    /* ----------------------------------------------------------------------*/
    // Requirements to generate a reset-password Link
    const
    vtoken = rtoken.generate(24),
    toSet = {
      // URI expires in 2 hours
      'connection.resetPwd': { 
        vtoken,
        expiry: Date.now() +( 2 * 3600 * 1000 ) 
      }
    }
    
    await Users.updateOne( condition, { $set: toSet } )

    /* ----------------------------------------------------------------------*/
    // Generate and send reset Link
    const resetLink = `${req.headers.origin}/reset-pwd?token=${Encoder.encode({ email, vtoken })}`

    /* -----------------------------------------------------------------------------------------------*/
    // New sign-out log
    const alog: ActivityLog = {
      action: 'RESET-PASSWORD-REQUEST',
      uid: email,
      role: user.account.role,
      data: { vtoken },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )

    try {
      // NOTE: Do not await for response
      // req.bnd.send.email({
      //                     sender: 'General-Email-Sender',
      //                     express: true,
      //                     priority: 'high',
      //                     template: 'Reset Password Instruction',
      //                     subject: 'Reset Password Request',
      //                     recipient: { name: getName( user.profile ), address: email },
      //                     scope: {
      //                       name: user.profile.first_name,
      //                       tenant: !isTenant( req ) ? process.env.APPNAME : req.tenant.name,
      //                       domain,
      //                       resetLink
      //                     }
      //                   })
    }
    catch( error ) { console.log( 'SEND_EMAIL::FAILED >> ', error ) }

    console.log('Reset Password Link: ', resetLink )
    return {
      error: false,
      status: 'AUTH::RESET_URL_SENT',
      message: 'We emailed you the instructions to recover your password'
    }
  })

  /** ------------ Resend Email or SMS Handlers -----------**/

  // Request to resend verification Code Email to User
  .post('/resend/email', Schemas.resendEmail, async ( req, rep ) => {
    const { email }: any = req.body
    if( !isValidEmail( email ) )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Email Address'
                })
    
    const
    condition = { 'profile.email': email },
    user = await Users.findOne( condition ) as User | null
    // Check user account status
    if( !user )
      return rep.code(401)
                .send({
                  error: true,
                  status: 'AUTH::UNAUTHORIZED',
                  message: 'Unauthorized Request'
                })

    // Invalid request
    if( !user.connection.verification )
      return rep.code(400)
                .send({
                  error: true,
                  status: 'AUTH::INVALID_REQUEST',
                  message: 'Invalid Request'
                })

    /* -----------------------------------------------------------------------------------------------*/
    // Resending Email interval delay controls
    const
    Now = Date.now(),
    { resend } = user.connection.verification

    if( resend && Now < ( resend.sentAt + ( resend.delay * 1000 ) ) ) {
      // Calculate time left before the next email could be send
      const delay = resend.delay - parseInt( String( ( Now - resend.sentAt ) / 1000 ) )

      return {
        error: false,
        status: 'AUTH::RESENT_EMAIL_ONHOLD',
        message: `Wait for ${delay} seconds to resend the email`,
        delay
      }
    }

    /*
     * Give 60 second for the next temptation of sending email
     * increase the time it will take the user to resend
     * another email (seconds)
     */
    const delay = resend ? Number( resend.delay ) * 4 : 60
    await Users.updateOne( condition, { $set: { 'connection.verification.resend': { delay, sentAt: Now } } })

    /* -----------------------------------------------------------------------------------------------*/
    // Resend verification code email
    try {
      // await req.bnd.send.email({
      //                           sender: 'General-Email-Sender',
      //                           express: true,
      //                           priority: 'high',
      //                           template: 'Verification Code',
      //                           subject: 'Email Address Verification Code',
      //                           recipient: { name: getName( user.profile ), address: email },
      //                           scope: {
      //                             name: user.profile.first_name,
      //                             tenant: !isTenant( req ) ? process.env.APPNAME : req.tenant.name,
      //                             vCode: user.connection.verification.code
      //                           }
      //                         })
    }
    catch( error ) { console.log( 'SEND_EMAIL::FAILED >> ', error ) }
    return { error: false, status: 'AUTH::PVC_EMAIL', message: 'Email resent', delay }
  })
}