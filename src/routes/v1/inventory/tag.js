
  import {
          isAllowed,
          isConnected,
          getImageSource
        } from '../../lib/common'
  import { checkFormSchema } from '../../lib/Validator'

  const
  addSchema = [
    { type: 'string', name: 'name' },
    { type: 'string', name: 'description', optional: true },
    { type: 'string', name: 'poster', optional: true }
  ],
  updateSchema = [
    { type: 'string', name: 'name', optional: true },
    { type: 'string', name: 'description', optional: true },
    { type: 'string', name: 'poster', optional: true }
  ],
  commonSchema = [
    { type: 'string', name: 'tagId' }
  ],
  opItemSchema = [
    { type: 'string', name: 'itemId', optional: true },
    { type: 'array', name: 'items', optional: true }
  ],
  toShopSchema = [
    { type: 'string', name: 'shopId', optional: true },
    { type: 'array', name: 'shops', optional: true }
  ]

  export default require('express').Router()

  .use( isConnected, isAllowed )

  // Create new tag
  .post( '/create', checkFormSchema( addSchema ), async ( req, res ) => {

    const
    tag = req.body,
    tagId = ruuid()

    tag.tagId = tagId
    tag.created_by = req.userId
    tag.created_at = Date.now()

    if( tag.poster )
      tag.poster = await getImageSource({
                                          type: 'tag',
                                          name: tag.name,
                                          namespace: req.business.resource.namespace,
                                          body: tag.poster
                                        })

    // insert to tag array list
    await req.dp.business.updateOne( req.condition, { $set: { [ 'tags.'+ tagId ]: tag } } )

    res.json({
              error: false,
              status: 'TAG::CREATED',
              message: '"'+ tag.name +'" tag created',
              tagId
            })
  } )

  // Update tag details
  .put( '/update', checkFormSchema( updateSchema ), async ( req, res ) => {

    if( !req.query.tagId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Undefined Tag ID'
                      })

    // Index the right tag
    const
    tagId = req.query.tagId,
    toSet = {}

    if( req.business.tags && !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                      error: true,
                      status: 'TAG::NOT_FOUND',
                      message: 'Tag is Not Found'
                    })

    for( let key in req.body ){

      let value = req.body[ key ]

      // Format string-boolean to boolean type
      if( /true|false/.test( value ) )
        value = ( String( value ) == 'true' )

      // Change main poster image
      if( key == 'poster' )
        value = await getImageSource({
                                      type: 'tag',
                                      name: 'Updated-poster',
                                      namespace: req.business.resource.namespace,
                                      body: value
                                    })

      toSet[ 'tags.'+ tagId +'.'+ key ] = value
    }

    if( isEmpty( toSet ) )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Invalid Request Arguments'
                      })

    const updates = await req.dp.business.updateOne( req.condition, { $set: toSet }, { returnUpdate: true, select: ['tags'] } )
    if( !updates )
      return res.status(404)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag Not Found'
                      })

    res.json({
              error: false,
              status: 'TAG::UPDATED',
              message: 'Tag Updated',
              tag: updates.tags[ tagId ]
            })
  } )

  // Return all tag list
  .get( '/list', async ( req, res ) => {

    res.json({
              error: false,
              status: 'TAG::FETCHED',
              results: req.business.tags && Object.values( req.business.tags ) || []
            })
  } )

  // Return all content of a tag
  .get( '/open', checkFormSchema( commonSchema ), async ( req, res ) => {

    const contents = await req.dp.product.find({ tags: { $elemMatch: { $eq: req.query.tagId } } },
                                                { exclude: [ '_id', 'tags', 'reviews' ] } )

    res.json({
              error: false,
              status: 'TAG::OPENED',
              contents
            })
  } )

  // Empty a tag: Remove all products assigned
  .get( '/empty', checkFormSchema( commonSchema ), async ( req, res ) => {

    const tagId = req.query.tagId

    if( req.business.tags && !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag is Not Found'
                      })

    await req.dp.product.update({ tags: { $elemMatch: { $eq: tagId } } },
                                { $pull: { 'tags': tagId } } )

    res.json({
              error: false,
              status: 'TAG::EMPTY',
              message: 'Tag is hence empty'
            })
  } )

  // Delete existing tags
  .delete( '/delete', checkFormSchema( commonSchema ), async ( req, res ) => {

    const
    tagId = req.query.tagId,
    result = await req.dp.business.updateOne( req.condition, { $unset: { [ 'tags.'+ tagId ]: 1 } } )

    if( result != 'Updated' )
      return res.status(404)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag Not Found'
                      })

    await req.dp.product.update( { tags: { $elemMatch: { $eq: tagId } } },
                                  { $pull: { 'tags': tagId } } )
    await req.dp.shop.update( { tags: { $elemMatch: { $eq: tagId } } },
                              { $pull: { 'tags': tagId } } )

    res.json({
              error: false,
              status: 'TAG::DELETED',
              message: 'Tag is deleted'
            })
  } )

  // Add new item(s) to tag
  .post( '/addItem', checkFormSchema( opItemSchema ), async ( req, res ) => {

    if( !req.query.tagId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::UNDEFINED_PARAMS',
                        message: 'Undefined Tag ID'
                      })

    const tagId = req.query.tagId

    if( !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag is Not Found'
                      })

    if( !req.body.itemId && !req.body.items )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Empty Arguments'
                      })

    const
    { itemId, items } = req.body, // captcher "item" or "items"
    condition = { tags: { $ne: tagId } },
    tagName = req.business.tags[ tagId ].name

    let queryFn = 'updateOne'

    if( itemId ) condition['productId'] = itemId
    else {
      condition['$or'] = items.map( each => { return { productId: each } } )
      queryFn = 'updateMany'
    }

    const result = await req.dp.product[ queryFn ]( condition, { $push: { 'tags': tagId } } )
    if( result != 'Updated' )
      return res.json({
                        error: false,
                        status: 'TAG::NOT_FOUND',
                        message: 'Item(s) not found'
                      })

    const message = itemId ?
                      'Item added to '+ tagName +' tag'
                      : 'Items added to '+ tagName +' tag'

    res.json({
              error: false,
              status: 'TAG::ADDED',
              message
            })
  } )

  // Remove existing item(s) from the tag
  .put( '/removeItem', checkFormSchema( opItemSchema ), async ( req, res ) => {

    if( !req.query.tagId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::UNDEFINED_PARAMS',
                        message: 'Undefined Tag ID'
                      })

    const tagId = req.query.tagId

    if( !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag is Not Found'
                      })

    if( !req.body.itemId && !req.body.items )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Empty Arguments'
                      })

    const
    { itemId, items } = req.body, // captcher "item" or "items"
    condition = { tags: { $elemMatch: { $eq: tagId } } },
    tagName = req.business.tags[ tagId ].name

    let queryFn = 'updateOne'

    if( itemId ) condition['productId'] = itemId
    else {
      condition['$or'] = items.map( each => { return { productId: each } } )
      queryFn = 'updateMany'
    }

    const result = await req.dp.product[ queryFn ]( condition, { $pull: { 'tags': tagId } } )
    if( result != 'Updated' )
      return res.json({
                        error: false,
                        status: 'TAG::NOT_FOUND',
                        message: 'Item not found or Tag is empty'
                      })

    const message = itemId ?
                      'Item removed from '+ tagName +' tag'
                      : 'Items removed from '+ tagName +' tag'

    res.json({
              error: false,
              status: 'TAG::REMOVED',
              message
            })
  } )

  // Assign Tag(s) to shop(s)
  .post( '/assign', checkFormSchema( toShopSchema ), async ( req, res ) => {

    if( !req.query.tagId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::UNDEFINED_PARAMS',
                        message: 'Undefined Tag ID'
                      })

    const tagId = req.query.tagId

    if( !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag is Not Found'
                      })

    if( !req.body.shopId && !req.body.shops )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Empty Arguments'
                      })

    const
    { shopId, shops } = req.body, // captcher "shopId" or "shops"
    condition = { tags: { $ne: tagId } }
    let queryFn = 'updateOne'

    if( shopId ) condition['shopId'] = shopId
    else {
      condition['$or'] = shops.map( each => { return { shopId: each } } )
      queryFn = 'updateMany'
    }

    const result = await req.dp.shop[ queryFn ]( condition, { $push: { 'tags': tagId } } )
    if( result != 'Updated' )
      return res.json({
                        error: false,
                        status: 'TAG::NOT_FOUND',
                        message: 'Shop(s) not found or Tag already Assigned'
                      })

    res.json({
              error: false,
              status: 'TAG::ASSIGNED',
              message: 'Tag(s) assigned'
            })
  } )

  // Unassign Tag(s) to shop(s)
  .post( '/unassign', checkFormSchema( toShopSchema ), async ( req, res ) => {

    if( !req.query.tagId )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::UNDEFINED_PARAMS',
                        message: 'Undefined Tag Name'
                      })

    const tagId = req.query.tagId

    if( !req.business.tags[ tagId ] )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::NOT_FOUND',
                        message: 'Tag Not Found'
                      })

    if( !req.body.shopId && !req.body.shops )
      return res.status(400)
                .json({
                        error: true,
                        status: 'TAG::INVALID_REQUEST',
                        message: 'Empty Arguments'
                      })

    const
    { shopId, shops } = req.body, // captcher "shopId" or "shops"
    condition = { tags: { $elemMatch: { $eq: tagId } } }
    let queryFn = 'updateOne'

    if( shopId ) condition['shopId'] = shopId
    else {
      condition['$or'] = shops.map( each => { return { shopId: each } } )
      queryFn = 'updateMany'
    }

    const result = await req.dp.shop[ queryFn ]( condition, { $pull: { 'tags': tagId } } )
    if( result != 'Updated' )
      return res.json({
                        error: false,
                        status: 'TAG::NOT_FOUND',
                        message: 'Shop(s) not found or Tag already Unassigned'
                      })

    res.json({
              error: false,
              status: 'TAG::UNASSIGNED',
              message: 'Tag(s) unassigned'
            })
  } )
