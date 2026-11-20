import type { FastifyInstance } from "fastify";

export const getAllUser = async (server: FastifyInstance) => {
    const result = await server.pg.query("select * from users;")
    return result.rows
}