import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { listAzureEpics } from '@/lib/server/azure-devops';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const project = (request.nextUrl.searchParams.get('project') || '').trim();
    if (!project) {
      return NextResponse.json({ error: 'project query param is required.' }, { status: 400 });
    }

    const epics = await listAzureEpics(project);
    const response = NextResponse.json({ epics });
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
