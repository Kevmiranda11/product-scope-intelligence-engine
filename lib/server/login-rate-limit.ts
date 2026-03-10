import 'server-only';

import { prisma } from '@/lib/server/prisma';

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export async function isLoginRateLimited(email: string, ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const failedCount = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      ipAddress,
      succeeded: false,
      attemptedAt: {
        gte: since,
      },
    },
  });
  return failedCount >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string;
  succeeded: boolean;
  userId?: string;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress,
      succeeded: params.succeeded,
      userId: params.userId,
    },
  });
}
