
import { RouteShorthandOptions } from 'fastify'

export const retrieve: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          user: { $ref: 'User#' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const profile: RouteShorthandOptions = {
  schema: {
    body: { $ref: 'UserProfile#' },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          user: { $ref: 'User#' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const settings: RouteShorthandOptions = {
  schema: {
    body: { $ref: 'UserSettings#' },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          user: { $ref: 'User#' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const close: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        reason: { type: 'string' }
      },
      required: ['reason'],
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
  retrieve,
  profile,
  settings,
  close
}