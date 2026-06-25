import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

type GlobalState = {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
  initFailed: boolean;
};

const globalForPrisma = globalThis as unknown as GlobalState;

export async function getDb(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (globalForPrisma.initFailed) {
    throw new Error('Database initialization previously failed');
  }

  if (globalForPrisma.prismaPromise) {
    return globalForPrisma.prismaPromise;
  }

  globalForPrisma.prismaPromise = (async () => {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    const client = new PrismaClient({ adapter });
    globalForPrisma.prisma = client;
    return client;
  })();

  try {
    return await globalForPrisma.prismaPromise;
  } catch (cause) {
    globalForPrisma.initFailed = true;
    delete globalForPrisma.prismaPromise;
    delete globalForPrisma.prisma;
    throw new Error('Failed to initialize database', { cause });
  }
}
