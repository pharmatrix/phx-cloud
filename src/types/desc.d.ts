import type { Db } from 'mongodb'
import type { User } from './user'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    storage: any
  }
  interface FastifyRequest {
    user: User
    email: string
  }
}