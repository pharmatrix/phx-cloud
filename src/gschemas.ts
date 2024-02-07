
import plugin from 'fastify-plugin'
import { FastifyInstance, RouteShorthandOptions } from 'fastify'

export default plugin( ( App: FastifyInstance, opts: RouteShorthandOptions, done: any ) => {
  const
  _StringType = { type: 'string' },
  _NumberType = { type: 'number' },
  _BooleanType = { type: 'boolean' },
  _AnyObjectType = {
    type: 'object',
    patternProperties: {
      '^.*$': { type: [ 'string' ] }
    }
  },

  ActionRecord = {
    type: 'object',
    properties: {
      at: _NumberType,
      by: _StringType
    }
  }

  App
  // Common Error validation schema reference
  .addSchema({
    $id: 'RequestErrorSchema',
    type: 'object',
    properties: {
      error: _BooleanType,
      status: _StringType,
      message: _StringType
    }
  })
  .addSchema({
    $id: 'AnyObject',
    ..._AnyObjectType
  })
  .addSchema({
    $id: 'StringArray',
    type: 'array',
    items: { type: 'string' }
  })

  // User validation schema reference
  .addSchema({
    $id: 'UserLocation',
    type: 'object',
    properties: {
      country: _StringType,
      city: _StringType
    },
    required: ['country', 'city'],
    additionalProperties: false
  })
  .addSchema({
    $id: 'UserDevice',
    type: 'object',
    properties: {
      model: _StringType,
      os: _StringType,
      ip: _StringType
    },
    required: ['os', 'model'],
    additionalProperties: false
  })
  .addSchema({
    $id: 'UserProfile',
    type: 'object',
    properties: {
      firstname: _StringType,
      lastname: _StringType,
      email: _StringType,
      password: _StringType,
      dob: _StringType,
      gender: _StringType,
      avatar: _StringType,
      location: { $ref: 'UserLocation#' }
    },
    required: ['firstname', 'lastname', 'email', 'avatar', 'location'],
    additionalProperties: false
  })
  .addSchema({
    $id: 'UserAccount',
    type: 'object',
    properties: {
      role: _StringType,
      PIN: _StringType,
      notification: {
        type: 'object',
        properties: {
          push: _StringType,
          email: _BooleanType
        },
        additionalProperties: false
      }
    }
  })
  .addSchema({
    $id: 'User',
    type: 'object',
    properties: {
      profile: { $ref: 'UserProfile#' },
      account: { $ref: 'UserAccount#' },
      datetime: _NumberType
    },
    required: ['profile', 'account', 'datetime'],
    additionalProperties: false
  })

  
  done()
} )