import type { FastifyInstance, HookHandlerDoneFunction } from "fastify"
import { analysesNews } from "../controller/analyses.contorller.js"

export const news_analyses_route = (server: FastifyInstance,opts: any, done: HookHandlerDoneFunction) => {
    server.post('/analyses', (req, reply) => {
        return analysesNews(req, reply)
    })
    done()
}