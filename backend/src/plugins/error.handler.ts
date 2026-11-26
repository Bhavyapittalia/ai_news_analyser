import fp from 'fastify-plugin'
import { AppError } from '../lib/errors.ts'
import { ZodError } from 'zod'

export default fp(async (server) => {

    // this is not middleware but it is using the fastify inbuilt 'setErrorHandler' for handling all the errors
    server.setErrorHandler((error, req, reply) => {
        
        if (error instanceof AppError) {
            return reply.status(error.statusCode).send({
                // we will able to use the error.statusCode here only as we are expec   ting that the error will be instance of AppError
                success: false,
                error: error.message
            })
        }
        
        if (error instanceof ZodError) {
            return reply.status(401).send({
                success: false,
                error: "Invalid Input"
            })
        }

        return reply.status(500).send({
            success: false,
            error: "Internel server error"
        })
    })
})
    