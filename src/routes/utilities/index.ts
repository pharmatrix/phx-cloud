import type { FastifyInstance } from 'fastify'

export default async ( App: FastifyInstance ) => {
  App.get('/docs', async ( req, rep ) => {
    rep.send('https://documenter.getpostman.com/view/3684233/2s9YeBfZrh')
  } )
}