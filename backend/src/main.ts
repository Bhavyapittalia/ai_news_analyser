import 'dotenv/config'
import { buildServer } from './app.ts'
import { ALLENVS } from './config/env.config.ts'

const server = await buildServer() 

try {
  const port = await server.listen({ port: ALLENVS.PORT })
  console.log(`Server running on ${port}`)
}
  catch (error) {
  console.log("ijdsjfl")
  server.log.error(error)

  process.exit(1)
} 