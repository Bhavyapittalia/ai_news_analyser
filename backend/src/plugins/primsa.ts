import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient }  from "@prisma/client"
import { ALLENVS } from "../config/env.config.ts"

const adapter = new PrismaPg({
    connectionString: ALLENVS.DB_URL
})

const prisma = new PrismaClient({ adapter })

export default prisma


// src/plugins/prisma.ts
// import fp from 'fastify-plugin';
// import { PrismaClient } from '@prisma/client';

// export default fp(async (server) => {
//   const prisma = new PrismaClient();
//   await prisma.$connect();
//   server.decorate('prisma', prisma);
//   server.addHook('onClose', async () => prisma.$disconnect());
// });
