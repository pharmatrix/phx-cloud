
import { RouteShorthandOptions } from 'fastify'

export const subscribe: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        ptype: { type: 'string' },
        per: { type: 'string' },
        duration: { type: 'number' },
        payment: { $ref: 'PaymentTransaction#' }
      },
      required: ['ptype', 'duration', 'payment'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          reference: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const fetch: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          results: {
            type: 'array',
            items: { $ref: 'Subscription#' }
          }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const search: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        filters: { type: 'string' },
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          results: {
            type: 'array',
            items: { $ref: 'Subscription#' }
          }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const cancel: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        reference: { type: 'string' }
      }
    },
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
  subscribe,
  fetch,
  search,
  cancel
}