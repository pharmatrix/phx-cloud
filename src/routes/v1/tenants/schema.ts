
import { RouteShorthandOptions } from 'fastify'

export const register: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        name: { type: 'string' },
        logo: { type: 'string' },
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
        licenseNumber: { type: 'string' },
        location: { $ref: 'Location#' }
      },
      required: ['name', 'licenseNumber', 'phones', 'emails', 'location'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          id: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

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
          tenant: { $ref: 'Tenant#' }
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
        id: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        logo: { type: 'string' },
        contacts: { $ref: 'Contacts#' },
        location: { $ref: 'Location#' },
        licenseNumber: { type: 'string' }
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
          tenant: { $ref: 'Tenant#' }
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
        page: { type: 'number' }
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
            items: { $ref: 'Tenant#' }
          },
          more: { type: 'boolean' }
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
            items: { $ref: 'Tenant#' }
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
  register,
  retrieve,
  fetch,
  search,
  update,
  remove
}