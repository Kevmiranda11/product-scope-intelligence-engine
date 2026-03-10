export interface StoryCandidate {
  id: string;
  title: string;
  summary?: string;
}

export interface MissingScopeSignal {
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SuggestedStory {
  title: string;
  summary: string;
}

export interface RefinementQuestion {
  id: string;
  role: 'Frontend' | 'Backend' | 'QA';
  question: string;
  answer: string;
}

export interface RefinedOutput {
  storyTitle: string;
  userStoryStatement: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
  notIncluded: string[];
  assumptions: string[];
  openQuestions: string[];
}

export interface Project {
  id: string;
  name: string;
  scopeName: string;
  sprintDuration: string;
  team: string;
  contextBrief: string;
  version: number;
  isDirty: boolean;
  activeStep: number;
  storyCandidates: StoryCandidate[];
  lastGeneratedAt?: string;
  selectedStoryIds: string[];
  customStories: StoryCandidate[];
  scopeConfidence: number;
  missingScopeSignals: MissingScopeSignal[];
  suggestedStories: SuggestedStory[];
  scopeScoreExplanation: string | null;
  lastSelectionAnalysisStateKey: string | null;
  refinementQuestionsByStoryId: Record<string, RefinementQuestion[]>;
  refinedOutputByStoryId: Record<string, RefinedOutput>;
  finalOutputByStoryId: Record<string, RefinedOutput>;
  ownerId?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export function normalizeProject(raw: Partial<Project>): Project {
  return {
    id: raw.id || Math.random().toString(36).slice(2, 11),
    name: raw.name || '',
    scopeName: raw.scopeName || raw.name || '',
    sprintDuration: raw.sprintDuration || '',
    team: raw.team || '',
    contextBrief: raw.contextBrief || '',
    version: raw.version ?? 1,
    isDirty: raw.isDirty ?? false,
    activeStep: raw.activeStep ?? 0,
    storyCandidates: raw.storyCandidates ?? [],
    lastGeneratedAt: raw.lastGeneratedAt,
    selectedStoryIds: raw.selectedStoryIds ?? [],
    customStories: raw.customStories ?? [],
    scopeConfidence: raw.scopeConfidence ?? 100,
    missingScopeSignals: raw.missingScopeSignals ?? [],
    suggestedStories: raw.suggestedStories ?? [],
    scopeScoreExplanation: raw.scopeScoreExplanation ?? null,
    lastSelectionAnalysisStateKey: raw.lastSelectionAnalysisStateKey ?? null,
    refinementQuestionsByStoryId: raw.refinementQuestionsByStoryId ?? {},
    refinedOutputByStoryId: raw.refinedOutputByStoryId ?? {},
    finalOutputByStoryId: raw.finalOutputByStoryId ?? {},
    ownerId: raw.ownerId,
    isDeleted: raw.isDeleted ?? false,
    deletedAt: raw.deletedAt ?? null,
    deletedBy: raw.deletedBy ?? null,
  };
}
