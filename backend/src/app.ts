import Fastify from 'fastify'
import { userRoutes } from './modules/user/user.route.ts'
import { news_analyses_route } from './modules/news_analyses/analyses.route.ts'
import { ALLENVS } from './config/env.config.ts'
import { APP_NAME, add, type User } from "@repo/shared" //node-monorepo setup
import { healthRoutes } from './modules/health/health.route.ts'
import errorHandler from './plugins/error.handler.ts'

export const buildServer = async () => {

    const server = Fastify()
    // await server.register(prisma)
    // await server.register(db)

    //node-monorepo setup testing code
    console.log(APP_NAME)
    console.log(add(10, 20));

    //node-monorepo setup testing code
    const user: User = {
        id: 1,
        name: "Dev",
        email: "dev@example.com"
    };

    //node-monorepo setup testing code
    console.log(user)
    console.log(ALLENVS)

    try {
        await server.register(userRoutes)
        await server.register(healthRoutes)
        await server.register(news_analyses_route)

        // this is not middlware but this will run when any controller or route get's error
        await server.register(errorHandler)
    }
    catch (error) {
        console.log("route error")
    }

    return server
}