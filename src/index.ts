import type HttpServer from '@ckenx/kenx-http'
import type MongodbPugin from '@ckenx/kenx-mongodb'
import type SocketIOServer from '@ckenx/kenx-socketio'
import type { ServerPlugin } from '@ckenx/node/types/index'

import Auth_v1 from '#routes/v1/auth'
import Users_v1 from '#routes/v1/users'
import Account_v1 from '#routes/v1/account'
import Tenants_v1 from '#routes/v1/tenants'
import Devices_v1 from '#routes/v1/devices'
import Branches_v1 from '#routes/v1/branches'
import Security_v1 from '#routes/v1/security'
import Utilities_v1 from '#routes/v1/utilities'
import Invitations_v1 from '#routes/v1/invitations'
import GlobalSchemas_v1 from './routes/v1/gschemas'
import Purge from './data/purge'

export default async ( http: ServerPlugin<HttpServer>, database: MongodbPugin, io: SocketIOServer ) => {
  if( !http.app ) 
    throw new Error('Undefined HTTP Server')

  // Purge the database with static data
  const db = database.getConnection()
  await Purge( db )

  // Initialize applications
  http.app
  // Database access
  .attach('db', db )
  // Socket.io server
  .attach('io', io )
  // Global schema validation references
  .register( GlobalSchemas_v1 )

  // Register routes
  .router('/', Utilities_v1 )
  .router('/auth/v1', Auth_v1 )
  .router('/account/v1', Account_v1 )
  .router('/security/v1', Security_v1 )

  .router('/super/v1/invitations', Invitations_v1('super') )
  .router('/pharmacy/v1/invitations', Invitations_v1('pharmacy') )
  .router('/hospital/v1/invitations', Invitations_v1('hospital') )

  .router('/pharmacy/v1', Tenants_v1('pharmacy') )
  .router('/hospital/v1', Tenants_v1('hospital') )
  .router('/super/v1/tenants', Tenants_v1('super') )

  .router('/super/v1/users', Users_v1('super') )
  .router('/pharmacy/v1/:id/users', Users_v1('pharmacy') )
  .router('/hospital/v1/:id/users', Users_v1('hospital') )
  
  .router('/pharmacy/v1/:id/branches', Branches_v1('pharmacy') )
  .router('/super/v1/tenants/:id/branches', Branches_v1('super') )
  
  .router('/pharmacy/v1/:id/devices', Devices_v1('pharmacy') )
  .router('/super/v1/tenants/:id/devices', Devices_v1('super') )
  .router('/pharmacy/v1/:id/branches/:branchId/devices', Devices_v1('pharmacy') )
  .router('/super/v1/tenants/:id/branches/:branchId/devices', Devices_v1('super') )

  // Handle application exception errors
  .on('error', async ( error: Error, req, res ) => {
    console.log( error )
    res.status( error.message.includes('Not Found') ? 404 : 500 ).send( error )
  })
  
  await http.listen( true )
}