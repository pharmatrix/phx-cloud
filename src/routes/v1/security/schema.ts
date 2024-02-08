
import { RouteShorthandOptions } from 'fastify'

export const pin: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        PIN: { type: 'string' }
      },
      required: ['PIN'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          valid: { type: [ 'boolean', 'null' ] }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const check: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          confirmed: { type: 'boolean' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const change: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        PIN: { type: 'string' },
        nPIN: { type: 'string' }
      },
      required: ['PIN', 'nPIN'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export default {
  pin,
  check,
  change
}