import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { listAzureProjects } from '@/lib/server/azure-devops';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const projects = await listAzureProjects();
    const response = NextResponse.json({ projects });
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
