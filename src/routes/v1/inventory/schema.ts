
import { RouteShorthandOptions } from 'fastify'

export const invite: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        tenantId: { type: 'string' }
      },
      required: ['name', 'email', 'role']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          itoken: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const fetch: RouteShorthandOptions = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'string' }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          invitations: {
            type: 'array',
            items: { $ref: 'Invitation#' }
          }
          
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const accept: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        itoken: { type: 'string' }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          next: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export default {
  invite,
  fetch,
  accept
}