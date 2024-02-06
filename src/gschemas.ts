
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
  
  done()
} )