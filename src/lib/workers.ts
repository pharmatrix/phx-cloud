import type { Db, Collection } from 'mongodb'
import type { ActionRecord } from '#types/index'

import moment from 'moment'

type CheckReference = {
  reference: string
  duration: {
    start: number
    end: number
  }
  subscribed: ActionRecord
}

export const SubscriptionWorker = async ( db: Db ) => {
  const
  Subscriptions = db.collection('subscriptions') as Collection,
  ROUND_LIMIT = 25
  let DAILY_CHECKER: NodeJS.Timeout

  async function fetchActives( offset = 0 ){
    const
    condition = { status: 'ACTIVE', 'subscribed.at': { $gt: offset } },
    list = await Subscriptions.find( condition, { limit: ROUND_LIMIT })

    if( !Array.isArray( list ) || !list.length ) return {}
    return {
      list,
      offset: list.length == ROUND_LIMIT ?
                      list[ list.length - 1 ].subscribed.at // Last item to continue query from
                      : 0 // Last items fetched so go back to 0
    }
  }

  async function checkExpiry({ reference, duration, subscribed }: CheckReference ){
    /*
    {
      type,
      per,
      duration: {
        start: from,
        end: from + ( seconds * Number( duration ) )
      },
      reference: ruuid(),
      status: 'ACTIVE',
      
      payment,
      subscribed: {
        at: Now,
        by: req.email
      }
    }
    */

    if( duration.end <= Date.now() ){
      console.log('-- Subscription Expired --')
      // Subscription expired
      await Subscriptions.updateOne({ reference, status: 'ACTIVE' }, { $set: { status: 'EXPIRED' } })

      // TODO: Send expired subscription email to user
      // && mailer.send({

      // })
    }

    else if( duration.end <= ( Date.now() +( 1000 * 3600 * 24 * 10 ) ) ){
      // Number of days left
      const left = moment( duration.end ).diff( moment(), 'days' )

      console.log(`-- Subscription Expiry in ${left} days --`)

      // TODO: Send warning email to user when expiry is within 10 days
      
    }
  }

  async function run( from = 0 ){
    clearTimeout( DAILY_CHECKER )
    
    console.log('-- Fetch Active Subscription --')
    const { list, offset } = await fetchActives( from )
    
    // Check each subscription expiry date
    list && await Promise.all( list.map( checkExpiry ) )
    
    if( !list || offset == 0 ){
      // Resume in next 24 hours
      console.log('-- Check Expiry in next 24 hours --')
      DAILY_CHECKER = setTimeout( async () => await run( offset ), 1000 * 3600 * 24 )
    }
    else setTimeout( async () => await run( offset ), 1000 * 15 ) // Continue in 15 seconds
  }

  run()
}