import { ALLENVS } from './env.config.js'
import fastify from 'fastify'
import postgres from '@fastify/postgres'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
    await fastify.register(postgres, {
        host:  ALLENVS.POSTGRES_HOST,
        database: ALLENVS.POSTGRES_NAME,
        user: ALLENVS.POSTGRES_USER,
        password: ALLENVS.POSTGRES_PASSWORD,
        port: ALLENVS.POSTGRES_PORT 
    })  
})    
