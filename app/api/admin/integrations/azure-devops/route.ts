import { IntegrationProvider } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireAdmin } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { encryptSecret } from '@/lib/server/security';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    const integration = await prisma.workspaceIntegration.findUnique({
      where: {
        provider: IntegrationProvider.azure_devops,
      },
      select: {
        organizationUrl: true,
        updatedAt: true,
      },
    });

    const response = NextResponse.json({
      configured: Boolean(integration),
      organizationUrl: integration?.organizationUrl ?? '',
      updatedAt: integration?.updatedAt ?? null,
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

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    const body = (await request.json()) as {
      organizationUrl?: string;
      pat?: string;
    };

    const organizationUrl = (body.organizationUrl || '').trim().replace(/\/+$/, '');
    const pat = (body.pat || '').trim();

    if (!organizationUrl || !pat) {
      return NextResponse.json({ error: 'organizationUrl and pat are required.' }, { status: 400 });
    }

    const encryptedPat = encryptSecret(pat);
    const integration = await prisma.workspaceIntegration.upsert({
      where: {
        provider: IntegrationProvider.azure_devops,
      },
      update: {
        organizationUrl,
        encryptedPat,
        updatedById: context.user.id,
      },
      create: {
        provider: IntegrationProvider.azure_devops,
        organizationUrl,
        encryptedPat,
        createdById: context.user.id,
        updatedById: context.user.id,
      },
      select: {
        organizationUrl: true,
        updatedAt: true,
      },
    });

    const response = NextResponse.json({
      configured: true,
      organizationUrl: integration.organizationUrl,
      updatedAt: integration.updatedAt,
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
