import Fastify from 'fastify'
import { userRoutes } from './routes/user.route.ts' 
import { news_analyses_route } from './routes/analyses.route.ts'
import path from 'path'
import { ALLENVS } from './config/env.config.ts'

console.log(ALLENVS)

export const buildServer = async ()  => {
    
    // const env = ALLENVS.NODE_ENV
    // dotenv.config({path: path.join(__dirname, `.env.${env}`)})
    
    const server = Fastify()
    console.log("rejct")
    // await server.register(db)
    
    try {
        console.log("run")
        await server.register(userRoutes)
        await server.register(news_analyses_route)
    }
    catch (error) {
        console.log("route error")
    }

    return server
}