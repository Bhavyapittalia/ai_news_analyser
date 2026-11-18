import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

const headlineSchema = z.object({headline: z.string().min(5).max(500)})

export const analysesNews = async (req: FastifyRequest, reply: FastifyReply) => {
    
    const parsedData = headlineSchema.parse(req.body)
    
    if (!parsedData.headline) {
        return reply?.code(400).send({ error: "headline is required"})
    }

    console.log("headline schema is: ", parsedData)
    return reply.send(parsedData)   

}