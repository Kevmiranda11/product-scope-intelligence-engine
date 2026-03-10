import { ExportStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import {
  createAzureWorkItem,
  detectWorkItemTypes,
  updateAzureWorkItem,
} from '@/lib/server/azure-devops';
import {
  collectStoriesForExport,
  groupStoriesIntoFeatures,
  makeFeatureContentHash,
  makeStoryContentHash,
  toAcceptanceCriteria,
  toWorkItemDescription,
} from '@/lib/server/devops-export';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface ExportBody {
  projectId?: string;
  azureProjectName?: string;
  epicWorkItemId?: number | null;
}

async function safeCreateWorkItem(params: {
  projectName: string;
  workItemType: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  parentId?: number;
}) {
  try {
    return await createAzureWorkItem(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('AcceptanceCriteria')) {
      throw error;
    }
    return createAzureWorkItem({
      ...params,
      acceptanceCriteria: undefined,
    });
  }
}

async function safeUpdateWorkItem(params: {
  projectName: string;
  workItemId: number;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
}) {
  try {
    await updateAzureWorkItem(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('AcceptanceCriteria')) {
      throw error;
    }
    await updateAzureWorkItem({
      ...params,
      acceptanceCriteria: undefined,
    });
  }
}

export async function POST(request: NextRequest) {
  let exportRecordId: string | null = null;
  let ownerId = '';
  let projectId = '';

  try {
    const context = await requireUser(request);
    ownerId = context.user.id;
    const body = (await request.json()) as ExportBody;
    const azureProjectName = (body.azureProjectName || '').trim();
    const epicWorkItemId = typeof body.epicWorkItemId === 'number' ? body.epicWorkItemId : null;
    projectId = (body.projectId || '').trim();

    if (!projectId || !azureProjectName) {
      return NextResponse.json(
        { error: 'projectId and azureProjectName are required.' },
        { status: 400 }
      );
    }

    const dbProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: context.user.id,
        isDeleted: false,
      },
    });
    if (!dbProject) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const stories = collectStoriesForExport(dbProject.payload);
    if (stories.length === 0) {
      return NextResponse.json(
        { error: 'No final stories available to export. Generate final output first.' },
        { status: 400 }
      );
    }

    const { featureType, storyType } = await detectWorkItemTypes(azureProjectName);
    const featureGroups = groupStoriesIntoFeatures(stories);
    const createdItems: Array<{ type: string; id: number; title: string }> = [];
    const updatedItems: Array<{ type: string; id: number; title: string }> = [];

    const exportRecord = await prisma.devOpsExport.create({
      data: {
        ownerId: context.user.id,
        projectId: dbProject.id,
        azureProjectName,
        epicWorkItemId,
        status: ExportStatus.success,
        summary: {
          startedAt: new Date().toISOString(),
          totalStories: stories.length,
        },
      },
    });
    exportRecordId = exportRecord.id;

    for (const group of featureGroups) {
      const featureLogicalKey = group.logicalKey;
      const featureTitle = `Feature: ${group.title}`;
      const featureHash = makeFeatureContentHash(group);

      const existingFeature = await prisma.devOpsWorkItemLink.findUnique({
        where: {
          ownerId_projectId_logicalKey: {
            ownerId: context.user.id,
            projectId: dbProject.id,
            logicalKey: featureLogicalKey,
          },
        },
      });

      let featureWorkItemId: number;
      if (existingFeature) {
        featureWorkItemId = existingFeature.workItemId;
        await safeUpdateWorkItem({
          projectName: azureProjectName,
          workItemId: featureWorkItemId,
          title: featureTitle,
          description: `Auto-grouped feature containing ${group.stories.length} stories.`,
        });
        updatedItems.push({ type: featureType, id: featureWorkItemId, title: featureTitle });
      } else {
        featureWorkItemId = await safeCreateWorkItem({
          projectName: azureProjectName,
          workItemType: featureType,
          title: featureTitle,
          description: `Auto-grouped feature containing ${group.stories.length} stories.`,
          parentId: epicWorkItemId || undefined,
        });
        createdItems.push({ type: featureType, id: featureWorkItemId, title: featureTitle });
      }

      await prisma.devOpsWorkItemLink.upsert({
        where: {
          ownerId_projectId_logicalKey: {
            ownerId: context.user.id,
            projectId: dbProject.id,
            logicalKey: featureLogicalKey,
          },
        },
        update: {
          azureProjectName,
          workItemId: featureWorkItemId,
          workItemType: featureType,
          contentHash: featureHash,
          lastExportId: exportRecord.id,
        },
        create: {
          ownerId: context.user.id,
          projectId: dbProject.id,
          azureProjectName,
          workItemId: featureWorkItemId,
          workItemType: featureType,
          logicalKey: featureLogicalKey,
          contentHash: featureHash,
          lastExportId: exportRecord.id,
        },
      });

      for (const story of group.stories) {
        const storyLogicalKey = `story:${story.storyId}`;
        const storyHash = makeStoryContentHash(story);
        const storyTitle = story.output.storyTitle || story.storyTitle;
        const storyDescription = toWorkItemDescription(story);
        const acceptanceCriteria = toAcceptanceCriteria(story.output);

        const existingStory = await prisma.devOpsWorkItemLink.findUnique({
          where: {
            ownerId_projectId_logicalKey: {
              ownerId: context.user.id,
              projectId: dbProject.id,
              logicalKey: storyLogicalKey,
            },
          },
        });

        let storyWorkItemId: number;
        if (existingStory) {
          storyWorkItemId = existingStory.workItemId;
          await safeUpdateWorkItem({
            projectName: azureProjectName,
            workItemId: storyWorkItemId,
            title: storyTitle,
            description: storyDescription,
            acceptanceCriteria,
          });
          updatedItems.push({ type: storyType, id: storyWorkItemId, title: storyTitle });
        } else {
          storyWorkItemId = await safeCreateWorkItem({
            projectName: azureProjectName,
            workItemType: storyType,
            title: storyTitle,
            description: storyDescription,
            acceptanceCriteria,
            parentId: featureWorkItemId,
          });
          createdItems.push({ type: storyType, id: storyWorkItemId, title: storyTitle });
        }

        await prisma.devOpsWorkItemLink.upsert({
          where: {
            ownerId_projectId_logicalKey: {
              ownerId: context.user.id,
              projectId: dbProject.id,
              logicalKey: storyLogicalKey,
            },
          },
          update: {
            azureProjectName,
            workItemId: storyWorkItemId,
            workItemType: storyType,
            contentHash: storyHash,
            lastExportId: exportRecord.id,
          },
          create: {
            ownerId: context.user.id,
            projectId: dbProject.id,
            azureProjectName,
            workItemId: storyWorkItemId,
            workItemType: storyType,
            logicalKey: storyLogicalKey,
            contentHash: storyHash,
            lastExportId: exportRecord.id,
          },
        });
      }
    }

    await prisma.devOpsExport.update({
      where: { id: exportRecord.id },
      data: {
        status: ExportStatus.success,
        summary: {
          finishedAt: new Date().toISOString(),
          createdCount: createdItems.length,
          updatedCount: updatedItems.length,
          createdItems,
          updatedItems,
        },
      },
    });

    const response = NextResponse.json({
      status: 'success',
      createdCount: createdItems.length,
      updatedCount: updatedItems.length,
      createdItems,
      updatedItems,
    });
    if (context.rotatedToken) {
      applySessionCookie(response, context.rotatedToken);
    }
    return response;
  } catch (error) {
    if (exportRecordId && ownerId && projectId) {
      await prisma.devOpsExport
        .update({
          where: { id: exportRecordId },
          data: {
            status: ExportStatus.failed,
            summary: {
              failedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            },
          },
        })
        .catch(() => undefined);
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
