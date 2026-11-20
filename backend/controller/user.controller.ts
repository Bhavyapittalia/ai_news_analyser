import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllUser } from "../services/user.service.ts";

export const getUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getAllUser(req.server)
    
    return reply.code(200).send(
        result
    )
}

export const getAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getAllUser(req.server)
    
    return reply.code(200).send(
        result
    )
}


