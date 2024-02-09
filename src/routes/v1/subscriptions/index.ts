import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { ActivityLog, ContextType, JSObject } from '#types/index'

import { v4 as uid4 } from 'uuid'
import Schemas from './schema'
import { allow, getDurationRange, isConnected, isTenant } from '#lib/utils'
import { Subscription } from '#types/tenant'

export default ( contextType: ContextType ) => {
  return async ( App: FastifyInstance ) => {
    const
    Logs = App.db.collection('logs') as Collection,
    Subscriptions = App.db.collection('subscriptions') as Collection

    App
    .addHook('preHandler', isConnected( App ) )
    .addHook('preHandler', isTenant( App ) )
    .addHook('preHandler', allow(['SU:', 'PU:ADMIN', 'HU:ADMIN'], contextType ) )

    // Add new subscription
    .post('/subscribe', Schemas.subscribe, async ( req, res ) => {
      const
      { ptype, per, duration, payment } = req.body as JSObject<any>,
      active = await Subscriptions.findOne({ tenantId: req.tenant.id, status: 'ACTIVE' }) as Subscription | null,
      Now = Date.now(),
      hasActiveSubscription = active?.duration.end && active.duration.end >= Now

      if( hasActiveSubscription
          && active.duration.end > Now + ( 1000 * 3600 * 24 ) )
        return res.status(400)
                  .send({
                    error: true,
                    status: 'SUBSCRIPTION::INVALID_REQUEST',
                    message: 'Renewal is only allowed within the day before or after the expiry of current active subscription'
                  })

      // Get the timestamp at which this subscription will take effect
      const
      renewalDate = hasActiveSubscription ? active.duration.end : Now,
      subscription: Subscription = {
        tenantId: req.tenant.id,
        ptype,
        per,
        duration: getDurationRange( per, duration, renewalDate ),
        reference: uid4(),
        status: 'ACTIVE',
        payment,
        subscribed: {
          at: Now,
          by: req.email
        }
      }

      // Save the subscription
      await Subscriptions.insertOne( subscription )
      
      /* -----------------------------------------------------------------------------------------------*/
      // New subscription log
      const alog: ActivityLog = {
        action: 'SUBSCRIBE',
        uid: req.email,
        context: req.user.account.context,
        data: { subscription },
        datetime: Now
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      // TODO: Send subscription granted email to all SUPER ADMINS

      
      res.status(201)
          .send({
            error: false,
            status: 'SUBSCRIPTION::ADDED',
            message: 'Subscribed successfully',
            reference: subscription.reference
          })
    })

    // Fetch subscriptions
    .get('/', Schemas.fetch, async ( req, rep ) => {
      let { limit } = req.query as JSObject<number>
      limit = Number( limit ) || 50

      const condition: any = {}
      if( req.tenant )
        condition.tenantId = req.tenant.id

      // Timestamp of the last item of previous results
      const { offset } = req.query as JSObject<number>
      if( offset )
        condition['subscribed.at'] = { $lt: Number( offset ) }
      
      // Filter by status
      const { status } = req.query as JSObject<number>
      if( status )
        condition.status = status

      const
      // Fetch only item no assign to any tag
      results = await Subscriptions.find( condition ).limit( limit ).sort({ 'subscribed.at': -1 }).toArray() as unknown as Subscription[],
      response: any = {
        error: false,
        status: 'SUBSCRIPTION::FETCHED',
        results
      }

      // Return URL to be call to get more results
      if( results.length == limit )
        response.more = `/?offset=${results[ limit - 1 ].subscribed.at}&limit=${limit}`

      return response
    })
    
    // Search subscription
    .get('/search', Schemas.search, async ( req, res ) => {
      const
      { query, filters } = req.query as JSObject<any>,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's profile information
      $or.push({ 'ptype': matcher })
      $or.push({ 'status': matcher })
      $or.push({ 'tenantId': matcher })
      $or.push({ 'reference': matcher })
      
      // TODO: Apply filters

      const condition: any = {}
      if( req.tenant )
        condition.tenantId = req.tenant.id

      condition.$or = $or
      
      return {
        error: false,
        status: 'SUBSCRIPTION::SEARCH',
        results: await Subscriptions.find( condition ).sort({ 'subscribed.at': -1 }).toArray() as unknown as Subscription[]
      }
    })

    // Cancel active subscription
    .patch('/cancel', Schemas.cancel, async ( req, res ) => {
      const subscription = await Subscriptions.findOne({ tenantId: req.tenant.id, status: 'ACTIVE' }) as Subscription | null
      if( !subscription )
        return res.status(404)
                  .send({
                    error: true,
                    status: 'SUBSCRIPTION::INVALID_REQUEST',
                    message: 'No active subscription found'
                  })

      const { reason } = req.body as JSObject<string>
      await Subscriptions.updateOne({ reference: subscription.reference }, { $set: { status: 'CANCELLED', reason } })

      /* -----------------------------------------------------------------------------------------------*/
      // New subscription log
      const alog: ActivityLog = {
        action: 'CANCEL-SUBSCRIIPTION',
        uid: req.email,
        context: req.user.account.context,
        data: { subscription, reason },
        datetime: Date.now()
      }
      await Logs.insertOne( alog )

      /* -----------------------------------------------------------------------------------------------*/
      
      // TODO: Operation related to whether to refund subscription payment of not.



      // TODO: Send email to all admin


      return {
        error: false,
        status: 'SUBSCRIPTION::CANCELLED',
        message: 'Subscription is cancelled'
      }
    })
  }
}