
import { RouteShorthandOptions } from 'fastify'

export const signup: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        role: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        location: { $ref: 'UserLocation#' },
        device: { $ref: 'UserDevice#' },
        agree_terms: { type: 'boolean' },
      },
      required: ['firstname', 'lastname', 'role', 'email', 'password', 'location', 'agree_terms'],
      additionalProperties: false
    },
    response: {
      201: {
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

export const signin: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        location: {},
      },
      required: ['email', 'password', 'location']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          ctoken: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const verify: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        code: { type: 'number' }
      },
      required: ['email', 'code']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          ctoken: { type: 'string' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export const resetPassword: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        new_password: { type: 'string' }
      },
      required: ['token', 'new_password']
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

export const resetPasswordLink: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
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

export const resendEmail: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          error: { type: 'boolean' },
          status: { type: 'string' },
          message: { type: 'string' },
          delay: { type: 'number' }
        }
      },
      '4xx': { $ref: 'RequestErrorSchema#' }
    }
  }
}

export default {
  signup,
  signin,
  verify,
  resendEmail,
  resetPassword,
  resetPasswordLink
}