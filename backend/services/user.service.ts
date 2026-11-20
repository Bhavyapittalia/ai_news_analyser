import type { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.ts";

export const getAllUser = async () => {
    const result = await prisma.users.findMany()
    return result
}