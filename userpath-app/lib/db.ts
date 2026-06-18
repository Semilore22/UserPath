import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; prismaPromise: Promise<PrismaClient> | undefined };

export async function getDb(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (globalForPrisma.prismaPromise) {
    return globalForPrisma.prismaPromise.catch(() => {
      delete globalForPrisma.prismaPromise;
      return getDb();
    });
  }

  globalForPrisma.prismaPromise = (async () => {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    const client = new PrismaClient({ adapter });
    globalForPrisma.prisma = client;
    return client;
  })();

  return globalForPrisma.prismaPromise.catch(() => {
    delete globalForPrisma.prismaPromise;
    delete globalForPrisma.prisma;
    throw new Error('Failed to initialize database');
  });
}
