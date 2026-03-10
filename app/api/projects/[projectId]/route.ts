import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { hydrateProject, toProjectPayload } from '@/lib/server/projects';
import type { Project } from '@/lib/project-types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireUser(request);
    const { projectId } = await params;
    const record = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: context.user.id,
        isDeleted: false,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const response = NextResponse.json({ project: hydrateProject(record) });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireUser(request);
    const { projectId } = await params;
    const body = (await request.json()) as { project?: Partial<Project> };

    if (!body.project) {
      return NextResponse.json({ error: 'Missing project payload.' }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: context.user.id,
        isDeleted: false,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const projectName = (body.project.name || existing.name).trim() || 'Untitled Project';
    const payload = toProjectPayload({
      ...(existing.payload as Record<string, unknown>),
      ...body.project,
    });
    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        name: projectName,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    const response = NextResponse.json({ project: hydrateProject(updated) });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireUser(request);
    const { projectId } = await params;

    const existing = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: context.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ status: 'deleted', projectId }, { status: 200 });
    }

    if (existing.isDeleted) {
      return NextResponse.json({ status: 'already_deleted', projectId }, { status: 200 });
    }

    const deleted = await prisma.project.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: context.user.id,
      },
    });

    const response = NextResponse.json({
      status: 'deleted',
      projectId: deleted.id,
      deletedAt: deleted.deletedAt,
      deletedBy: deleted.deletedBy,
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
