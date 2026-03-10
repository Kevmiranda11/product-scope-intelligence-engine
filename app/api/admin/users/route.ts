import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthError, applySessionCookie, requireAdmin } from '@/lib/server/auth';
import { hashPassword, createTemporaryPassword } from '@/lib/server/password';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        forcePasswordReset: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const response = NextResponse.json({ users });
    if (context.rotatedToken) {
      applySessionCookie(response, context.rotatedToken);
    }
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    const body = (await request.json()) as {
      email?: string;
      role?: UserRole;
      password?: string;
    };

    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'User already exists.' }, { status: 409 });
    }

    const tempPassword = body.password?.trim() || createTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);
    const role = body.role === UserRole.admin ? UserRole.admin : UserRole.user;

    const user = await prisma.user.create({
      data: {
        email,
        role,
        status: UserStatus.active,
        forcePasswordReset: true,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        forcePasswordReset: true,
      },
    });

    const response = NextResponse.json({
      user,
      temporaryPassword: tempPassword,
    });
    if (context.rotatedToken) {
      applySessionCookie(response, context.rotatedToken);
    }
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
