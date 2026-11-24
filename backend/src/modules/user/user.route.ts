import type { FastifyInstance, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import { getUsersSchema } from "../user/user.schema.ts";
import { getAdmin, getUsers } from "../user/user.controller.ts";

export const userRoutes = (server: FastifyInstance, options: any, done: HookHandlerDoneFunction) => {
  server.get("/users", (req, reply) => {
    return getUsers(req, reply)
  })
  
  server.post("/addusers", { schema: getUsersSchema }, (req, reply) => {
    return getAdmin(req, reply)
  })


  done()
}