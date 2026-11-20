import type { FastifyInstance, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import { getUsersSchema } from "../schema/user.schema.ts";
import { getAdmin, getUsers } from "../controller/user.controller.ts";

export const userRoutes = (server: FastifyInstance, options: any, done: HookHandlerDoneFunction) => {
  server.get("/users", { schema: getUsersSchema }, (req, reply) => {
    return getUsers(req, reply)
  })
  
  server.get("/admin", { schema: getUsersSchema }, (req, reply) => {
    return getAdmin(req, reply)
  })

  done()
}