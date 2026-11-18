import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getUser } from "../services/user.service.js";

export const getUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await req.server.pg.query('select * from users;')
    reply.code(200).send(result)
    return result.rows
}

export const getAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await getUser(req.server)
}


