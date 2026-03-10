import { NextRequest, NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthError, applySessionCookie, requireAdmin, revokeAllSessionsForUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const context = await requireAdmin(request);
    const { userId } = await params;
    const body = (await request.json()) as {
      role?: UserRole;
      status?: UserStatus;
      forcePasswordReset?: boolean;
    };

    const data: {
      role?: UserRole;
      status?: UserStatus;
      forcePasswordReset?: boolean;
    } = {};

    if (body.role && [UserRole.admin, UserRole.user].includes(body.role)) {
      data.role = body.role;
    }

    if (body.status && [UserStatus.active, UserStatus.disabled].includes(body.status)) {
      data.status = body.status;
    }

    if (typeof body.forcePasswordReset === 'boolean') {
      data.forcePasswordReset = body.forcePasswordReset;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        forcePasswordReset: true,
      },
    });

    if (data.status === UserStatus.disabled) {
      await revokeAllSessionsForUser(updated.id);
    }

    const response = NextResponse.json({ user: updated });
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
