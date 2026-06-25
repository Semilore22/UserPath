import { getDb } from './db';
import { MAX_GENERATIONS, MAX_GENERATIONS_PER_SESSION, WINDOW_HOURS } from './constants';
import type { RateLimitResult } from '@/types';

export async function checkAndIncrementRateLimit(
  ipAddress: string,
  sessionId: string,
): Promise<RateLimitResult> {
  const db = await getDb();
  return db.$transaction(async (tx) => {
    const now = new Date();

    const record = await tx.rateLimit.findUnique({
      where: { ipAddress },
    });

    if (!record) {
      const windowExpires = new Date(
        now.getTime() + WINDOW_HOURS * 60 * 60 * 1000,
      );
      await tx.rateLimit.create({
        data: {
          ipAddress,
          generationCount: 1,
          windowStart: now,
          windowExpires,
          sessionId,
        },
      });
      return { allowed: true, remaining: MAX_GENERATIONS - 1 };
    }

    const expiresAt = new Date(record.windowExpires);

    if (now > expiresAt) {
      const windowExpires = new Date(
        now.getTime() + WINDOW_HOURS * 60 * 60 * 1000,
      );
      await tx.rateLimit.update({
        where: { ipAddress },
        data: {
          generationCount: 1,
          windowStart: now,
          windowExpires,
          sessionId,
        },
      });
      return { allowed: true, remaining: MAX_GENERATIONS - 1 };
    }

    if (record.generationCount >= MAX_GENERATIONS) {
      // IP limit exceeded — check session-level allowance
      const windowStart = new Date(
        now.getTime() - WINDOW_HOURS * 60 * 60 * 1000,
      );
      const sessionFlowCount = await tx.flow.count({
        where: {
          sessionId,
          createdAt: { gte: windowStart },
        },
      });

      if (sessionFlowCount >= MAX_GENERATIONS_PER_SESSION) {
        const retryAfter = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / 1000,
        );
        return { allowed: false, remaining: 0, retryAfter };
      }

      // Session still has allowance — allow generation
      await tx.rateLimit.update({
        where: { ipAddress },
        data: {
          generationCount: record.generationCount + 1,
          sessionId,
        },
      });

      return { allowed: true, remaining: 0 };
    }

    await tx.rateLimit.update({
      where: { ipAddress },
      data: {
        generationCount: record.generationCount + 1,
        sessionId,
      },
    });

    const remaining = Math.max(
      0,
      MAX_GENERATIONS - record.generationCount - 1,
    );
    return { allowed: true, remaining };
  });
}
