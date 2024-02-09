
import { RouteShorthandOptions } from 'fastify'

export const retrieve: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    },
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

export const update: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        section: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        flag: { type: 'string' }
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
          user: { $ref: 'User#' }
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
            items: { $ref: 'User#' }
          }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const search: RouteShorthandOptions = {
  schema: {
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
            items: { $ref: 'User#' }
          }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const remove: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
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
  retrieve,
  fetch,
  search,
  update,
  remove
}