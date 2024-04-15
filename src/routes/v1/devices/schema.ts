
import { RouteShorthandOptions } from 'fastify'

export const add: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        branchId: { type: 'string' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          id: { type: 'string' },
          acode: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const activate: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        branchId: { type: 'string' },
        deviceId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        acode: { type: 'string' },
        os: { type: 'string' },
        model: { type: 'string' },
        version: { type: 'string' },
        mac: { type: 'string' }
      },
      required: ['acode', 'os', 'model', 'version', 'mac'],
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

export const retrieve: RouteShorthandOptions = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        branchId: { type: 'string' },
        deviceId: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          device: { $ref: 'Device#' }
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
        branchId: { type: 'string' },
        deviceId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        os: { type: 'string' },
        model: { type: 'string' },
        version: { type: 'string' }
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
          device: { $ref: 'Device#' }
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
        id: { type: 'string' },
        branchId: { type: 'string' }
      }
    },
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
            items: { $ref: 'Device#' }
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
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        branchId: { type: 'string' }
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
            items: { $ref: 'Device#' }
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
        id: { type: 'string' },
        branchId: { type: 'string' },
        deviceId: { type: 'string' }
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
  add,
  activate,
  retrieve,
  fetch,
  search,
  update,
  remove
}