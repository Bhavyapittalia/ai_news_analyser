import type { FastifyInstance } from "fastify";
import prisma from "../plugins/primsa.ts";

export const getAllUser = async () => {
    const result = await prisma.users.findMany()
    return result
}