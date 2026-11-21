import type { PrismaClient } from '@prisma/client';
import Prisma from '../plugins/primsa.ts'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
