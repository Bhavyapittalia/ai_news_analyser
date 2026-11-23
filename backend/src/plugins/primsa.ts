// import "dotenv/config"
// import postgres from "@prisma/orm-postgres/runtime"
// import { contractFromJson } from "@prisma/orm-postgres/static"
// import contractJson from "../prisma/contract.json" with { type: "json" }
// import { ALLENVS } from "../config/env.config.ts"

// const db = postgres({
//     contract: contractFromJson(contractJson),
//     url: ALLENVS.DB_URL,
// })

// export default db




// // src/plugins/prisma.ts
// // import fp from 'fastify-plugin';
// // import { PrismaClient } from '@prisma/client';

// // export default fp(async (server) => {
// //   const prisma = new PrismaClient();
// //   await prisma.$connect();
// //   server.decorate('prisma', prisma);
// //   server.addHook('onClose', async () => prisma.$disconnect());
// // });
// // export default fp(async (server) => {
// //   const prisma = new PrismaClient();
// //   await prisma.$connect();
// //   server.decorate('prisma', prisma);
// //   server.addHook('onClose', async () => prisma.$disconnect());
// // });
