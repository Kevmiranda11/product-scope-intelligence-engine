import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const response = NextResponse.json({
      user: {
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
        status: context.user.status,
      },
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
