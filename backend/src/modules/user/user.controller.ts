import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllUser } from "../user/user.services.ts";
import { AppError } from "../../lib/errors.ts";


export const getUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getAllUser()

    if (!result) {
        throw new AppError(400, "user not found sorry")
    }
    return reply.code(202).send(
        result
    )
}

export const getAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getAllUser()

    return reply.code(202).send(
        result
    )
}
