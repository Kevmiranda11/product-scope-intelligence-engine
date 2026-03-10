import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { normalizeProject, type Project } from '@/lib/project-types';
import { toProjectPayload } from '@/lib/server/projects';

export const runtime = 'nodejs';

function isProjectLike(value: unknown): value is Partial<Project> {
  return typeof value === 'object' && value !== null && 'name' in value;
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const body = (await request.json()) as { projects?: unknown[] };

    if (!Array.isArray(body.projects)) {
      return NextResponse.json({ error: 'projects must be an array.' }, { status: 400 });
    }

    let importedCount = 0;
    for (const entry of body.projects) {
      if (!isProjectLike(entry)) {
        continue;
      }

      const normalized = normalizeProject(entry);
      const existing = await prisma.project.findFirst({
        where: {
          ownerId: context.user.id,
          name: normalized.name,
          isDeleted: false,
        },
      });

      if (existing) {
        continue;
      }

      await prisma.project.create({
        data: {
          ownerId: context.user.id,
          name: normalized.name || 'Imported Project',
          payload: toProjectPayload(normalized) as Prisma.InputJsonValue,
        },
      });
      importedCount += 1;
    }

    const response = NextResponse.json({
      importedCount,
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
