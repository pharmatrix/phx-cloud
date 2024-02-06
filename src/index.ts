import Info from './routes/info'
// import Auth from './routes/auth'
// import User from './routes/user'
// import Modules from './routes/modules'
// import Sessions from './routes/sessions'
// import Connects from './routes/connects'
import GlobalSchemas from './gschemas'
// import * as Purge from '../data/purge'

export default async ( http, database, io ) => {
  // Purge the database with static data
  const db = database.getConnection()
  // await Purge( db )

  // Initialize applications
  http.app
  // Database access
  .attach('db', db )
  // Socket.io server
  .attach('io', io )
  // Global schema validation references
  .register( GlobalSchemas )

  // Register routes
  .router('/', Info )

  // Handle application exception errors
  .on('error', async ( error: Error, req, res ) => {
    console.log( error )
    res.status( error.message.includes('Not Found') ? 404 : 500 ).send( error )
  })
  
  await http.listen( true )
}