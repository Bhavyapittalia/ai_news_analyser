import Fastify from 'fastify'
import dotenv from 'dotenv'
import db from './config/db.ts'
import { userRoutes } from './routes/user.route.ts' 
import { news_analyses_route } from './routes/analyses.route.ts'
import { ALLENVS } from './config/env.config.ts'

dotenv.config()


const server = Fastify()

await server.register(db)


try {
  await server.register(userRoutes)
  await server.register(news_analyses_route)
}
catch (error) {
  console.log("route error")
}

try {
  const port = await server.listen({ port: ALLENVS.PORT })
  console.log(`Server running on ${port}`)
}
catch (error) {
  console.log("ijdsjfl")
  server.log.error(error)

  process.exit(1)
} 