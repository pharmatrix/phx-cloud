import type { FastifyInstance } from 'fastify'
import type { Collection } from 'mongodb'
import type { ActivityLog, JSObject, Printer } from '#types/index'

import Schemas from './schema'
import { allow, isConnected } from '#lib/utils'

export default async ( App: FastifyInstance ) => {
  const
  Logs = App.db.collection('logs') as Collection,
  Printers = App.db.collection('printers') as Collection

  App
  .addHook('preHandler', isConnected( App ) )
  .addHook('preHandler', allow(['SU:']) )

  // Add new printer
  .post('/add', Schemas.add, async ( req, rep ) => {
    const
    printer = req.body as Printer,
    exists = await Printers.findOne({ name: printer.name, model: printer.model }) as Printer | null
    if( exists )
      return rep.status(400)
                .send({
                  error: true,
                  status: 'PRINTER::INVALID_REQUEST',
                  message: `${printer.name} - model ${printer.model} already exists`
                })

    const Now = Date.now()
    
    printer.added = {
      by: req.email,
      at: Now
    }

    await Printers.insertOne( printer )
    
    /* -----------------------------------------------------------------------------------------------*/
    // New printer log
    const alog: ActivityLog = {
      action: 'ADD-PRINTER',
      uid: req.email,
      context: req.user.account.context,
      data: { printer },
      datetime: Now
    }
    await Logs.insertOne( alog )

    /* -----------------------------------------------------------------------------------------------*/
    // TODO: Send notification to tenant administrator
    
    rep.status(201)
        .send({
          error: false,
          status: 'PRINTER::ADDED',
          message: 'New printer added'
        })
  })

  // Fetch printers list
  .get('/', Schemas.fetch, async ( req, rep ) => {
    let { limit } = req.query as JSObject<number>
    limit = Number( limit ) || 50

    const
    condition: any = {},
    { offset } = req.query as JSObject<number>

    // Timestamp of the last item of previous results
    if( offset )
      condition['added.at'] = { $lt: Number( offset ) }

    const
    // Fetch only item no assign to any tag
    results = await Printers.find( condition ).limit( limit ).sort({ 'added.at': -1 }).toArray() as unknown as Printer[],
    response: any = {
      error: false,
      status: 'PRINTER::FETCHED',
      results
    }

    // Return URL to be call to get more results
    if( results.length == limit )
      response.more = `/?offset=${results[ limit - 1 ].added.at}&limit=${limit}`

    return response
  } )

  // Search printers
  .get( '/search', Schemas.search, async ( req, res ) => {
    const
    { query, filters } = req.query as JSObject<any>,
    matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
    $or = []

    // User's profile information
    $or.push({ 'name': matcher })
    $or.push({ 'model': matcher })
    $or.push({ 'driverURL': matcher })
    $or.push({ 'specs.color': matcher })
    $or.push({ 'specs.paperSize': matcher })
    $or.push({ 'specs.injection': matcher })
    
    // TODO: Apply filters

    return {
      error: false,
      status: 'PRINTER::SEARCH',
      results: await Printers.find({ $or }).sort({ 'added.at': -1 }).toArray() as unknown as Printer[]
    }
  } )

  // Update printer details
  .patch('/:query', Schemas.update, async ( req, rep ) => {
    const
    { query } = req.params as JSObject<any>,
    condition = { $or: [{ name: query }, { model: query }] }
    if( !(await Printers.findOne( condition )) )
      return rep.status(404)
                .send({
                  error: true,
                  status: 'PRINTER::INVALID_REQUEST',
                  message: `Printer Not Found`
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
                  status: 'PRINTER::INVALID_REQUEST',
                  message: 'Invalid Request Arguments'
                })
    
    const printer = await Printers.findOneAndUpdate( condition, { $set: updates }, { returnDocument: 'after' }) as Printer | null

    /* -----------------------------------------------------------------------------------------------*/
    // Updated printer info log
    const alog: ActivityLog = {
      action: 'UPDATE-PRINTER',
      uid: req.email,
      context: req.user.account.context,
      data: { query, updates },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'PRINTER::UPDATED',
      message: 'Printer updated',
      printer
    }
  })

  // Retreive printer info
  .get('/:query', Schemas.retrieve, async ( req, rep ) => {
    const
    { query } = req.params as JSObject<any>,
    condition = { $or: [{ name: query }, { model: query }] },
    printer = await Printers.findOne( condition ) as Printer | null
    if( !printer )
      return rep.status(404)
                .send({
                  error: true,
                  status: 'PRINTER::NOT_FOUND',
                  message: `Printer Not Found`
                })

    return {
      error: false,
      status: 'PRINTER::RETRIEVED',
      printer
    }
  })

  // Delete printer
  .delete('/:query', Schemas.remove, async ( req, rep ) => {
    const
    { query } = req.params as JSObject<any>,
    condition = { $or: [{ name: query }, { model: query }] },
    { deletedCount } = await Printers.deleteOne( condition )
    if( !deletedCount )
      return rep.status(404)
                .send({
                  error: true,
                  status: 'PRINTER::INVALID_REQUEST',
                  message: `Printer Not Found`
                })

    /* -----------------------------------------------------------------------------------------------*/
    // New invitation log
    const 
    { reason } = req.body as JSObject<string>,
    alog: ActivityLog = {
      action: 'DELETE-PRINTER',
      uid: req.email,
      context: req.user.account.context,
      data: { query, reason },
      datetime: Date.now()
    }
    await Logs.insertOne( alog )
    
    return {
      error: false,
      status: 'PRINTER::DELETED',
      message: 'Printer deleted'
    }
  })
}