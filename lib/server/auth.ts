import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { randomToken, sha256 } from '@/lib/server/security';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session-constants';

const SESSION_ROTATE_AFTER_MS = 60 * 60 * 24 * 1000;

interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface SessionContext {
  user: SessionUser;
  sessionId: string;
  rotatedToken?: string;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '0.0.0.0';
  }
  return request.headers.get('x-real-ip') || '0.0.0.0';
}

export function applySessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32);
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
      rotatedAt: new Date(),
    },
  });
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: sha256(token) },
  });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function getSessionContext(request: NextRequest): Promise<SessionContext | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = sha256(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now() || session.user.status !== UserStatus.active) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  let rotatedToken: string | undefined;
  if (Date.now() - session.rotatedAt.getTime() >= SESSION_ROTATE_AFTER_MS) {
    rotatedToken = randomToken(32);
    await prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: sha256(rotatedToken),
        rotatedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
      },
    });
  }

  return {
    user: session.user,
    sessionId: session.id,
    rotatedToken,
  };
}

export async function requireUser(request: NextRequest): Promise<SessionContext> {
  const context = await getSessionContext(request);
  if (!context) {
    throw new AuthError('Unauthorized.', 401);
  }
  return context;
}

export async function requireAdmin(request: NextRequest): Promise<SessionContext> {
  const context = await requireUser(request);
  if (context.user.role !== UserRole.admin) {
    throw new AuthError('Forbidden.', 403);
  }
  return context;
}
