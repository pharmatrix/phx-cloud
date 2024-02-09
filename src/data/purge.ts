import type { Db } from 'mongodb'
import Admins from './admins.json'
import Packages from './packages.json'

const rootUID = 'admin@phx.io'

export default async ( db: Db ) => {
  // Add initial Super Admin users
  const DBUsers = db.collection('users')
  // Make sure to only purge once.
  if( !(await DBUsers.findOne({ 'profile.email': rootUID, 'account.context.type': 'super', 'account.context.role': 'SU:ADMIN' })) )
    try { await DBUsers.insertMany( Admins ) }
    catch( error ){ console.log('Unexpected error occured: ', error ) }
  
  /*-----------------------------------------------------------------------------------------*/
  // Add initial service packages
  const DBPackages = db.collection('packages')
  // Make sure to only purge once.
  if( !(await DBPackages.findOne({})) )
    try { await DBPackages.insertMany( Packages ) }
    catch( error ){ console.log('Unexpected error occured: ', error ) }
  
  /*-----------------------------------------------------------------------------------------*/
  // 
}
