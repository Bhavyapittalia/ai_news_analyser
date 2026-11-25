import type { FastifyReply, FastifyRequest } from "fastify"

export const getHealth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const now = new Date()
        return reply.send({ status: 'success', time: now.toLocaleTimeString()})
    }
    catch (error) {
        return reply.send({status: 'failed'})
    }
}