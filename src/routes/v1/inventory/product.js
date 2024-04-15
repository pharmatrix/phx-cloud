
  import {
          isAllowed,
          isConnected,
          getImageSource
        } from '../../lib/common'
  import { checkFormSchema } from '../../lib/Validator'

  const
  addSchema = [
    { type: 'string', name: 'name' },
    { type: 'string', name: 'description' },
    { type: 'number', name: 'price' },
    { type: 'number', name: 'cost', optional: true },
    { type: 'number', name: 'discounted_price', optional: true },
    { type: 'number', name: 'quantity', optional: true },
    { type: 'object', name: 'variants', optional: true },
    { type: 'string', name: 'poster', optional: true },
    { type: 'array', name: 'posters', optional: true },
    { type: 'string', name: 'currency', optional: true },
    { type: 'string', name: 'tagId', optional: true },
    { type: 'array', name: 'tags', optional: true },
    { type: 'string', name: 'category', optional: true },
    { type: 'array', name: 'categories', optional: true },
    { type: 'string', name: 'SKU', optional: true },
    { type: [ 'number', 'string' ], name: 'barcode', optional: true },
    { type: [ 'boolean', 'string' ], name: 'active', optional: true },
    { type: [ 'boolean', 'string' ], name: 'shipment', optional: true }
  ],
  retreiveSchema = [
    { type: 'string', name: 'productId' }
  ],
  searchSchema = [
    { type: 'string', name: 'query' },
    { type: [ 'object', 'string' ], name: 'filters', optional: true }
  ],
  updateSchema = [
    { type: 'string', name: 'name', optional: true },
    { type: 'string', name: 'description', optional: true },
    { type: 'string', name: 'poster', optional: true },
    { type: 'array', name: 'posters', optional: true },
    { type: 'array', name: 'categories', optional: true },
    { type: 'array', name: 'tags', optional: true },
    { type: 'number', name: 'cost', optional: true },
    { type: 'number', name: 'price', optional: true },
    { type: 'number', name: 'discounted_price', optional: true },
    { type: 'string', name: 'currency', optional: true },
    { type: 'number', name: 'quantity', optional: true },
    { type: 'object', name: 'variants', optional: true },
    { type: 'string', name: 'SKU', optional: true },
    { type: [ 'number', 'string' ], name: 'barcode', optional: true },
    { type: [ 'boolean', 'string' ], name: 'active', optional: true },
    { type: [ 'boolean', 'string' ], name: 'shipment', optional: true }
  ],
  deleteSchema = [
    { type: 'string', name: 'productId' }
  ]

  export default require('express').Router()

  .use( isConnected, isAllowed )

  // Add new product
  .post( '/add', checkFormSchema( addSchema ), async ( req, res ) => {

    const
    data = req.body

    data.productId = ruuid() // Assign unique ID to the new product
    data.active = String( data.active ).includes('true')

    data.price = Number( data.price )
    data.discounted_price = Number( data.discounted_price )
    data.cost = Number( data.cost )
    data.quantity = Number( data.quantity ) || 'unlimited'
    data.quantitySold = 0

    data.reviews = []
    data.SKU = data.SKU || ''
    data.barcode = data.barcode || ''

    /*------------------------------------------------------------------------------------*/
    /* Send the base64encoded picture to CDN server
      or allocate default logo image link by default
    */
    data.poster = data.poster && await getImageSource({
                                                        type: 'product',
                                                        name: data.name,
                                                        namespace: req.business.resource.namespace,
                                                        body: data.poster
                                                      })

    // Same process for the Additional list of Posters sent as array
    if( data.posters )
      for( let o = 0; o < data.posters.length; o++ )
        data.posters[o] = await getImageSource({
                                                type: 'product',
                                                name: data.name +'-POSTER-'+ o,
                                                namespace: req.business.resource.namespace,
                                                body: data.posters[o]
                                              })

    /*------------------------------------------------------------------------------------*/
    // Define categories table
    data.categories = data.categories || []

    if( data.category ){
      data.categories.push( data.category )
      delete data.category
    }

    /*------------------------------------------------------------------------------------*/
    // Assign this product to tags
    data.tags = data.tags || []

    if( data.tagId ){
      data.tags.push( data.tagId )
      delete data.tagId
    }

    /*------------------------------------------------------------------------------------*/
    // Creation properties
    data.added_by = req.userId
    data.added_at = Date.now()

    // Add new product to the inventory
    await req.dp.product.insert( data )

    res.status(201)
        .json({
                error: false,
                status: 'PRODUCT::ADDED',
                message: '"'+ data.name +'" is added',
                productId: data.productId
              })
  } )

  // Retreive a product details
  .get( '/retreive', checkFormSchema( retreiveSchema ), async ( req, res ) => {

    const product = await req.dp.product.findOne({ productId: req.query.productId }, { exclude: ['_id'] } )
    if( !product )
      return res.status(404)
                .json({
                        error: true,
                        status: 'PRODUCT::NOT_FOUND',
                        message: 'Product Not Found'
                      })

    res.json({
              error: false,
              status: 'PRODUCT::RETREIVED',
              product
            })
  } )

  // Fetch products list
  .get( '/list', async ( req, res ) => {

    const
    limit = Number( req.query.limit ) || 20,
    operators = { limit, desc: true, exclude: [ '_id', 'tags', 'reviews' ] }

    // Timestamp of the last item of previous results
    if( req.query.from )
      operators.since = req.query.from

    const
    // Fetch only item no assign to any tag
    // results = await req.dp.product.find({ $or: [ { tags: [] }, { tags: { $exists: false } } ] }, operators ),
    results = await req.dp.product.find({}, operators ),
    response = {
                error: false,
                status: 'PRODUCT::FETCHED',
                results
              }

    // Return URL to be call to get more results
    if( results.length == limit )
      response.more = `/list?from=${results[ limit - 1 ].added_at}&limit=${limit}`

    res.json( response )
  } )

  /** Search product by name, description, barcode, ...

    @params {string} query -
    @params {object} filters - Targeting variantss, price ranges, tags, ...
  */
  .get( '/search', checkFormSchema( searchSchema ), async ( req, res ) => {

      const
      { query, filters } = req.query,
      matcher = { $regex: String( query ).replace(/\s+/g,'|'), $options: 'i' },
      $or = []

      // User's personal information
      $or.push({ 'name': matcher })
      $or.push({ 'description': matcher })
      $or.push({ 'SKU': matcher })
      $or.push({ 'barcode': matcher })

      // Deep search fields
      $or.push({ 'categories': { $elemMatch: matcher } })

      // TODO: Apply filters: variants, prices, ...



      const results = await req.dp.product.find( { $or }, { desc: true, exclude: [ '_id' ] } )

      res.json({ error: false, status: 'PRODUCT::SEARCH', results })
  } )

  // Update product details
  .put( '/update', checkFormSchema( updateSchema ), async ( req, res ) => {

    if( !req.query.productId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'PRODUCT::INVALID_REQUEST',
                        message: 'Undefined Product ID'
                      })

    // Index the right product
    const toSet = {}

    for( let key in req.body ){

      let value = req.body[ key ]

      // Format string-boolean to boolean type
      if( /true|false/.test( value ) )
        value = ( String( value ) == 'true' )

      // Auto-convert from string to number
      if( [ 'price', 'discounted_price', 'cost', 'quantity' ].includes( key ) )
        value = Number( value )

      // Change main poster image
      if( key == 'poster' )
        value = await getImageSource({
                                      type: 'product',
                                      name: 'Updated-poster',
                                      namespace: req.business.resource.namespace,
                                      body: value
                                    })

      // Same process for the Additional list of Posters sent as array
      if( key == 'posters'
          && Array.isArray( value )
          && value.length )
        for( let o = 0; o < value.length; o++ ){
          // Escape links contain in the array
          if( /https:\/\//.test( value[o] ) ) continue
          // New Posters
          value[o] = await getImageSource({
                                            type: 'product',
                                            name: 'Updated-POSTER-'+ o,
                                            namespace: req.business.resource.namespace,
                                            body: value[o]
                                          })
        }

      if( key == 'tags' && value == null ) value = []
      if( key == 'variants' && value == null ) value = {}
      if( key == 'categories' && value == null ) value = []

      toSet[ key ] = value
    }

    if( isEmpty( toSet ) )
      return res.status(400)
                .json({
                        error: true,
                        status: 'PRODUCT::INVALID_REQUEST',
                        message: 'Invalid Request Arguments'
                      })

    const product = await req.dp.product.updateOne( { productId: req.query.productId }, { $set: toSet }, { returnUpdate: true } )
    if( !product )
      return res.status(404)
                .json({
                        error: true,
                        status: 'PRODUCT::NOT_FOUND',
                        message: 'Product Not Found'
                      })

    res.json({
              error: false,
              status: 'PRODUCT::UPDATED',
              message: 'Product Updated',
              product
            })
  } )

  // Close existing product
  .delete( '/delete', checkFormSchema( deleteSchema ), async ( req, res ) => {

    const deleted = await req.dp.product.delete({ productId: req.query.productId })
    if( !deleted )
      return res.status(404)
                .json({
                        error: true,
                        status: 'PRODUCT::NOT_FOUND',
                        message: 'Product Not Found'
                      })

    res.json({
              error: false,
              status: 'PRODUCT::DELETED',
              message: 'Product is definitively deleted'
            })
  } )
