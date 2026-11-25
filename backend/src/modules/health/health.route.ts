import type { FastifyInstance, HookHandlerDoneFunction } from "fastify";
import { getHealth } from "../health/health.controller.ts"

export const healthRoutes = (server: FastifyInstance, options: any, done:HookHandlerDoneFunction) => {
    server.get("/health", (req, reply) => {
        return getHealth(req, reply)
    })

    done()
}

