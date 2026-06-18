import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbUrl = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');

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
    const factory = new PrismaBetterSqlite3({ url: dbUrl });
    const client = new PrismaClient({ adapter: factory });
    globalForPrisma.prisma = client;
    return client;
  })();

  return globalForPrisma.prismaPromise.catch(() => {
    delete globalForPrisma.prismaPromise;
    delete globalForPrisma.prisma;
    throw new Error('Failed to initialize database');
  });
}
