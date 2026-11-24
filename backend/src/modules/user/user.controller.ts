import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllUser } from "../user/user.services.ts";


export const getUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const result = await getAllUser()
        
        return reply.code(202).send(
            result
        )
    }
    catch (error) {
        console.log(error)
    } 
}

export const getAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getAllUser()

    return reply.code(202).send(
        result
    )
}


