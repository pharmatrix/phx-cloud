import type { FastifyInstance } from 'fastify'

export default async ( App: FastifyInstance ) => {
  App.get('/', async ( req, rep ) => {
    rep.send('Check documentation here: https://documenter.getpostman.com/view/3684233/2s9YeBfZrh')
  } )
}