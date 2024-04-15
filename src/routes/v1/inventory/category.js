
  import { isAllowed, isConnected } from '../../lib/common'
  import { checkFormSchema } from '../../lib/Validator'

  const
  addSchema = [
    { type: 'string', name: 'name', optional: true },
    { type: 'array', name: 'names', optional: true },
    { type: 'string', name: 'nature', optional: true }
  ],
  deleteSchema = [
    { type: 'string', name: 'name' }
  ]

  export default require('express').Router()

  .use( isConnected, isAllowed )

  // Add new category
  .post( '/add', checkFormSchema( addSchema ), async ( req, res ) => {

    if( !req.body.name && !req.body.names )
      return res.status(400)
                .json({
                        error: true,
                        status: 'CATEGORY::INVALID_REQUEST',
                        message: 'Empty Arguments'
                      })

    let
    { name, names, nature } = req.body, // captcher "name" or "names"
    categories = req.business.categories || []

    if( name ){
      // single category sent
      name = name.toLowerCase()

      if( categories.includes( name ) )
        return res.json({
                          error: false,
                          status: 'CATEGORY::EXIST',
                          message: name.toCapitalCase() +' category already exist'
                        })

      categories.push( name )
    }

    if( Array.isArray( names ) ){
      // Multiple categories set
      names = names.map( each => each.toLowerCase() )
      categories = [ ...new Set( [ ...categories, ...names ] ) ]
    }

    // Add to category array list
    await req.dp.business.updateOne( req.condition, { $set: { categories, nature } } )

    const message = name ?
                      name.toCapitalCase() +' category is added'
                      : names.join(', ') +' categories are added'
    res.json({
              error: false,
              status: 'CATEGORY::ADDED',
              message
            })
  } )

  // Return all category list
  .get( '/list', async ( req, res ) => {

    res.json({
              error: false,
              status: 'CATEGORY::FETCHED',
              results: req.business.categories || []
            })
  } )

  // Delete existing categories
  .delete( '/delete', checkFormSchema( deleteSchema ), async ( req, res ) => {

    const result = await req.dp.business.updateOne( req.condition, { $pull: { 'categories': req.query.name.toLowerCase() } } )
    if( result != 'Updated' )
      return res.status(404)
                .json({
                        error: true,
                        status: 'CATEGORY::NOT_FOUND',
                        message: 'Category Not Found'
                      })

    res.json({
              error: false,
              status: 'CATEGORY::DELETED',
              message: '"'+ req.query.name.toCapitalCase() +'" category is deleted'
            })
  } )
