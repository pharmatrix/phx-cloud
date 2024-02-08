import type { Db } from 'mongodb'
import type { User } from './user'
import type { Tenant } from './tenant'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    storage: any
  }
  interface FastifyRequest {
    user: User
    tenant: Tenant
    email: string
  }
}