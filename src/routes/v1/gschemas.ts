
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
      message: _StringType,
      next: _StringType
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

  .addSchema({
    $id: 'Location',
    type: 'object',
    properties: {
      country: _StringType,
      city: _StringType,
      address: _StringType
    },
    required: ['country', 'city'],
    additionalProperties: false
  })
  .addSchema({
    $id: 'Contacts',
    type: 'object',
    properties: {
      phones: { 
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      },
      emails: { 
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      },
    },
    additionalProperties: false
  })
  .addSchema({
    $id: 'DeviceSession',
    type: 'object',
    properties: {
      name: _StringType,
      avatar: _StringType,
      lastConnection: _NumberType,
      datetime: _NumberType
    },
    additionalProperties: false
  })
  .addSchema({
    $id: 'Device',
    type: 'object',
    properties: {
      id: _StringType,
      os: _StringType,
      version: _StringType,
      model: _StringType,
      mac: _StringType,
      lastIP: _StringType,
      sessions: {
        type: 'array',
        items: { $ref: 'DeviceSession#' }
      },
      activation: {
        code: _NumberType,
        expiry: _NumberType
      },
      datetime: _NumberType
    },
    additionalProperties: false
  })

  // User validation schema references
  .addSchema({
    $id: 'UserContext',
    type: 'object',
    properties: {
      type: _StringType,
      role: _StringType,
      id: _StringType,
    },
    required: ['type', 'role'],
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
      location: { $ref: 'Location#' }
    },
    required: ['firstname', 'lastname', 'email', 'avatar', 'location'],
    additionalProperties: false
  })
  .addSchema({
    $id: 'UserAccount',
    type: 'object',
    properties: {
      context: { $ref: 'UserContext#' },
      PIN: _StringType,
      notification: {
        type: 'object',
        properties: {
          push: _StringType,
          email: _BooleanType
        },
        additionalProperties: false
      }
    },
    required: ['context', 'notification'],
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

  // User invitation validation schema reference
  .addSchema({
    $id: 'Invitation',
    type: 'object',
    properties: {
      context: { $ref: 'UserContext#' },
      name: _StringType,
      email: _StringType,
      expiry: _NumberType,
      added: ActionRecord
    },
    required: ['context', 'email', 'expiry', 'added'],
    additionalProperties: false
  })

  // Tenant data validation schema reference
  .addSchema({
    $id: 'Tenant',
    type: 'object',
    properties: {
      type: _StringType,
      id: _StringType,
      name: _StringType,
      logo: _StringType,
      licenseNumber: _StringType,
      contacts: { $ref: 'Contacts#' },
      location: { $ref: 'Location#' },
      registered: ActionRecord
    },
    required: ['type', 'id', 'name', 'logo', 'licenseNumber', 'contacts', 'location', 'registered'],
    additionalProperties: false
  })

  // Branch data validation schema reference
  .addSchema({
    $id: 'Branch',
    type: 'object',
    properties: {
      id: _StringType,
      tenantId: _StringType,
      name: _StringType,
      contacts: { $ref: 'Contacts#' },
      location: { $ref: 'Location#' },
      devices: {
        type: 'array',
        items: { $ref: 'Device#' }
      },
      created: ActionRecord
    },
    required: ['id', 'tenantId', 'name', 'contacts', 'location', 'devices', 'created'],
    additionalProperties: false
  })
  
  done()
} )