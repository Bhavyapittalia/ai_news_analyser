import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ai_analyses } from "../services/gemini.service.ts";

const headlineSchema = z.object({headline: z.string().min(5).max(1000)})



export const analysesNews = async (req: FastifyRequest, reply: FastifyReply) => {
    
    const parsedData = headlineSchema.parse(req.body)
    
    if (!parsedData.headline) {
        return reply?.code(400).send({ error: "headline is required"})
    }

    const result = await ai_analyses(parsedData.headline)


    console.log("headline schema is: ", result?.content)
    return reply.send({
        headline: parsedData.headline,
        result
    })   

}