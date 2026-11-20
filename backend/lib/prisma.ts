import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient }  from "@prisma/client"
import { ALLENVS } from "../config/env.config.ts"

const adapter = new PrismaPg({
    connectionString: ALLENVS.DB_URL
})

const prisma = new PrismaClient({ adapter })

export default prisma