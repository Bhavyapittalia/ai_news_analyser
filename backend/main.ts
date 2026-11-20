import Fastify from 'fastify'
import dotenv from 'dotenv'
import db from './config/db.ts'
import { userRoutes } from './routes/user.route.ts' 
import { news_analyses_route } from './routes/analyses.route.ts'

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
  await server.listen({ port: 5000 })
  console.log('Server running on http://localhost:5000')
}
catch (error) {
  console.log("ijdsjfl")
  server.log.error(error)

  process.exit(1)
} 