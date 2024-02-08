import type { Db } from 'mongodb'
import Admins from './admins.json'

const rootUID = 'admin@phx.io'

export default async ( db: Db ) => {
  const DBUsers = db.collection('users')
  // Make sure to only purge once.
  if( await DBUsers.findOne({ 'profile.email': rootUID, 'account.context.type': 'super', 'account.context.role': 'SU:ADMIN' }) ) return

  // Add initial Super Admin users
  try { await DBUsers.insertMany( Admins ) }
  catch( error ){ console.log('Unexpected error occured: ', error ) }
  
  // 
}
