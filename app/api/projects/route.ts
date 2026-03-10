import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { createDefaultProject, hydrateProject, toProjectPayload } from '@/lib/server/projects';
import type { Project } from '@/lib/project-types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const records = await prisma.project.findMany({
      where: {
        ownerId: context.user.id,
        isDeleted: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const response = NextResponse.json({
      projects: records.map(hydrateProject),
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
    const context = await requireUser(request);
    const body = (await request.json()) as {
      name?: string;
      project?: Partial<Project>;
    };

    const baseName = (body.name || body.project?.name || 'Untitled Project').trim();
    const normalized = body.project ? toProjectPayload(body.project) : toProjectPayload(createDefaultProject(baseName, context.user.id));
    const finalName = (body.project?.name || baseName || 'Untitled Project').trim();

    const record = await prisma.project.create({
      data: {
        ownerId: context.user.id,
        name: finalName,
        payload: normalized as Prisma.InputJsonValue,
      },
    });

    const response = NextResponse.json({
      project: hydrateProject(record),
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
