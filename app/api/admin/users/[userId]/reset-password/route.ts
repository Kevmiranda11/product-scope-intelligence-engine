import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireAdmin, revokeAllSessionsForUser } from '@/lib/server/auth';
import { createTemporaryPassword, hashPassword } from '@/lib/server/password';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const context = await requireAdmin(request);
    const { userId } = await params;
    const tempPassword = createTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        forcePasswordReset: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        forcePasswordReset: true,
      },
    });

    await revokeAllSessionsForUser(userId);

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
