import { NextRequest, NextResponse } from 'next/server';
import { UserStatus } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { verifyPassword } from '@/lib/server/password';
import { applySessionCookie, createSession, getClientIp } from '@/lib/server/auth';
import { isLoginRateLimited, recordLoginAttempt } from '@/lib/server/login-rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const ipAddress = getClientIp(request);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (await isLoginRateLimited(email, ipAddress)) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await recordLoginAttempt({ email, ipAddress, succeeded: false });
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (user.status !== UserStatus.active) {
      await recordLoginAttempt({ email, ipAddress, succeeded: false, userId: user.id });
      return NextResponse.json({ error: 'This account is disabled.' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordLoginAttempt({ email, ipAddress, succeeded: false, userId: user.id });
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    await recordLoginAttempt({ email, ipAddress, succeeded: true, userId: user.id });
    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        forcePasswordReset: user.forcePasswordReset,
      },
    });
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
