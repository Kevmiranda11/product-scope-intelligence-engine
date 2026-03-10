import 'server-only';

import type { Project as PrismaProject } from '@prisma/client';
import { normalizeProject, type Project } from '@/lib/project-types';

export function hydrateProject(record: PrismaProject): Project {
  const payload = (record.payload as Partial<Project>) || {};
  return normalizeProject({
    ...payload,
    id: record.id,
    name: record.name || payload.name || '',
    ownerId: record.ownerId,
    isDeleted: record.isDeleted,
    deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
    deletedBy: record.deletedBy ?? null,
  });
}

export function toProjectPayload(project: Partial<Project>): Partial<Project> {
  const normalized = normalizeProject(project);
  const clean: Partial<Project> = {
    ...normalized,
  };
  delete clean.id;
  delete clean.ownerId;
  delete clean.isDeleted;
  delete clean.deletedAt;
  delete clean.deletedBy;
  return clean;
}

export function createDefaultProject(name: string, ownerId: string): Project {
  return normalizeProject({
    id: '',
    name: name.trim(),
    scopeName: name.trim(),
    sprintDuration: '',
    team: '',
    contextBrief: '',
    version: 1,
    isDirty: false,
    activeStep: 0,
    storyCandidates: [],
    selectedStoryIds: [],
    customStories: [],
    scopeConfidence: 100,
    missingScopeSignals: [],
    suggestedStories: [],
    scopeScoreExplanation: null,
    lastSelectionAnalysisStateKey: null,
    refinementQuestionsByStoryId: {},
    refinedOutputByStoryId: {},
    finalOutputByStoryId: {},
    ownerId,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
}
