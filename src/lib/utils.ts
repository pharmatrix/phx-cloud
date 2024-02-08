
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '#types/user'

import * as bcrypt from 'bcryptjs'
import Encoder from '#lib/Encoder'

export const getImageSource = ( name: string ): string => {
	// Generate Dummy avatar url
	return `https://ui-avatars.com/api/?name=${name.charAt(0).toUpperCase()}&background=000000&size=150&color=ffffff&bold=true&length=1&font-size=0.6`
}

export const hashPassword = ( plain: string, hashed?: string ): Promise<string|boolean> => {
  return new Promise( ( resolve, reject ) => {
    !hashed ?
        // Return hashed password
        bcrypt.genSalt( 10, ( error, salt ) => {
          if( error ) return reject( error )

          bcrypt.hash( plain, salt, ( error, hash ) => {
            return !error ? resolve( hash ) : reject( error )
          } )
        } )
        // Compare hashed and plain password
        : bcrypt.compare( plain, hashed, ( error, isPasswordMatch ) => {
          return !error ? resolve( isPasswordMatch ) : reject( error )
        } )
  } )
}

export const random = ( min: number, max: number ): number => {
  // Generate random number at a range
  return Math.floor( Math.random() * ( max - min + 1 )+( min + 1 ) )
}

export const isValidEmail = ( str: string ): boolean => {
  // Email address validation
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test( str )
}

export const isConnected = ( App: FastifyInstance ) => {
  return async ( req: FastifyRequest, rep: FastifyReply ) => {
    // Middleware check for only connected users request
    const
    errmess = {
      error: true,
      status: 'AUTH::UNAUTHORIZED',
      message: 'Invalid Request Credentials',
      next: 'signin'
    },
    ctoken = req.headers.authorization?.split('Bearer ')[1] as string
    if( !ctoken )
      return rep.code(401).send( errmess )

    const
    { email, token } = Encoder.decode( ctoken ),
    condition = {
      'profile.email': email,
      'connection.token': token,
      'verification.code': { $exists: false }
    },
    user = await App.db.collection('users').findOne( condition ) as User | null
    if( !user )
      return rep.code(401)
                .send({ 
                  error: true,
                  status: 'AUTH::DISCONNECTED',
                  message: 'User is disconnected', next: 'signin'
                })

    req.user = user
    req.email = user.profile.email
  }
}