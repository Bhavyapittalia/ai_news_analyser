import Fastify from 'fastify'
import dotenv from 'dotenv'
import db from './config/db.js'
import { userRoutes } from './routes/user.route.js' 
import { news_analyses_route } from './routes/analyses.route.js'
import { envValidation } from './config/check.envs.js'

dotenv.config()
envValidation()


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
  await server.listen({ port: 8000 })
  console.log('Server running on http://localhost:8000')
}
catch (error) {
  console.log("ijdsjfl")
  server.log.error(error)

  process.exit(1)
} 