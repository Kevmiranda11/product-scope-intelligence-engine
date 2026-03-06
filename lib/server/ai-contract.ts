type JsonObject = Record<string, unknown>;

export interface StoryInput {
  id: string;
  title: string;
}

export interface StoryBreakdownRequest {
  projectName: string;
  scopeName: string;
  sprintDuration: string;
  teamComposition: string;
  contextBrief: string;
}

export interface StoryBreakdownResponse {
  storyCandidates: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
}

export interface SelectionAnalysisRequest {
  projectName: string;
  scopeName: string;
  contextBrief: string;
  storyCandidates: Array<{
    title: string;
    summary: string;
  }>;
  selectedStories: Array<{
    title: string;
    summary: string;
  }>;
}

export interface SelectionAnalysisResponse {
  scopeConfidence: number;
  missingAreas: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  suggestedStories: Array<{
    title: string;
    summary: string;
  }>;
}

export interface SelectionScoreExplanationRequest {
  projectName: string;
  scopeName: string;
  contextBrief: string;
  selectedStories: Array<{
    title: string;
    summary: string;
  }>;
  scopeConfidence: number;
  missingAreas: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  suggestedStories: Array<{
    title: string;
    summary: string;
  }>;
}

export interface SelectionScoreExplanationResponse {
  explanation: string;
}

export interface RefinementQuestionsRequest {
  projectName: string;
  scopeName: string;
  contextBrief: string;
  selectedStory: {
    title: string;
    summary: string;
  };
  selectedStories?: Array<{
    title: string;
    summary: string;
  }>;
}

export interface RefinementQuestionsResponse {
  frontendQuestions: string[];
  backendQuestions: string[];
  qaQuestions: string[];
}

export interface RefinementAnalysisRequest {
  projectName: string;
  scopeName: string;
  contextBrief: string;
  selectedStory: {
    title: string;
    summary: string;
  };
  answeredQuestions: Array<{
    role: 'Frontend' | 'Backend' | 'QA';
    question: string;
    answer: string;
  }>;
}

export interface RefinementAnalysisResponse {
  storyTitle: string;
  userStoryStatement: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
  notIncluded: string[];
  assumptions: string[];
  openQuestions: string[];
}

export interface FinalOutputRequest {
  projectName: string;
  scopeName: string;
  contextBrief: string;
  storyTitle: string;
  userStoryStatement?: string;
  acceptanceCriteriaDraft: string[];
  technicalNotes: string[];
  notIncluded: string[];
  assumptions: string[];
  openQuestions: string[];
}

export interface FinalOutputResponse {
  storyTitle: string;
  userStoryStatement: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
  notIncluded: string[];
  assumptions: string[];
  openQuestions: string[];
}

export const storyBreakdownResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storyCandidates'],
  properties: {
    storyCandidates: {
      type: 'array',
      minItems: 5,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'summary'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    },
  },
} as const satisfies JsonObject;

export const selectionAnalysisResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scopeConfidence', 'missingAreas', 'suggestedStories'],
  properties: {
    scopeConfidence: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    missingAreas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'description'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: { type: 'string' },
        },
      },
    },
    suggestedStories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    },
  },
} as const satisfies JsonObject;

export const selectionScoreExplanationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation'],
  properties: {
    explanation: { type: 'string' },
  },
} as const satisfies JsonObject;

export const refinementQuestionsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['frontendQuestions', 'backendQuestions', 'qaQuestions'],
  properties: {
    frontendQuestions: {
      type: 'array',
      minItems: 0,
      maxItems: 2,
      items: { type: 'string' },
    },
    backendQuestions: {
      type: 'array',
      minItems: 0,
      maxItems: 2,
      items: { type: 'string' },
    },
    qaQuestions: {
      type: 'array',
      minItems: 0,
      maxItems: 2,
      items: { type: 'string' },
    },
  },
} as const satisfies JsonObject;

export const refinementAnalysisResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'storyTitle',
    'userStoryStatement',
    'acceptanceCriteria',
    'technicalNotes',
    'notIncluded',
    'assumptions',
    'openQuestions',
  ],
  properties: {
    storyTitle: { type: 'string' },
    userStoryStatement: { type: 'string' },
    acceptanceCriteria: {
      type: 'array',
      items: { type: 'string' },
    },
    technicalNotes: {
      type: 'array',
      items: { type: 'string' },
    },
    notIncluded: {
      type: 'array',
      items: { type: 'string' },
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
    },
    openQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const satisfies JsonObject;

export const finalOutputResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'storyTitle',
    'userStoryStatement',
    'acceptanceCriteria',
    'technicalNotes',
    'notIncluded',
    'assumptions',
    'openQuestions',
  ],
  properties: {
    storyTitle: { type: 'string' },
    userStoryStatement: { type: 'string' },
    acceptanceCriteria: {
      type: 'array',
      items: { type: 'string' },
    },
    technicalNotes: {
      type: 'array',
      items: { type: 'string' },
    },
    notIncluded: {
      type: 'array',
      items: { type: 'string' },
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
    },
    openQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const satisfies JsonObject;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isStoryBreakdownRequest(value: unknown): value is StoryBreakdownRequest {
  if (!isRecord(value)) return false;
  return (
    isString(value.projectName) &&
    isString(value.scopeName) &&
    isString(value.sprintDuration) &&
    isString(value.teamComposition) &&
    isString(value.contextBrief)
  );
}

export function isSelectionAnalysisRequest(value: unknown): value is SelectionAnalysisRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.projectName)) return false;
  if (!isString(value.scopeName)) return false;
  if (!isString(value.contextBrief)) return false;
  const isAnalysisStory = (story: unknown) =>
    isRecord(story) && isString(story.title) && isString(story.summary);
  if (!Array.isArray(value.storyCandidates) || !value.storyCandidates.every(isAnalysisStory)) return false;
  if (!Array.isArray(value.selectedStories) || !value.selectedStories.every(isAnalysisStory)) return false;
  return true;
}

export function isSelectionScoreExplanationRequest(value: unknown): value is SelectionScoreExplanationRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.projectName)) return false;
  if (!isString(value.scopeName)) return false;
  if (!isString(value.contextBrief)) return false;
  if (typeof value.scopeConfidence !== 'number') return false;

  const isAnalysisStory = (story: unknown) =>
    isRecord(story) && isString(story.title) && isString(story.summary);
  if (!Array.isArray(value.selectedStories) || !value.selectedStories.every(isAnalysisStory)) return false;
  if (!Array.isArray(value.suggestedStories) || !value.suggestedStories.every(isAnalysisStory)) return false;

  const isMissingArea = (area: unknown) =>
    isRecord(area) &&
    isString(area.title) &&
    (area.severity === 'low' || area.severity === 'medium' || area.severity === 'high') &&
    isString(area.description);
  if (!Array.isArray(value.missingAreas) || !value.missingAreas.every(isMissingArea)) return false;

  return true;
}

export function isRefinementQuestionsRequest(value: unknown): value is RefinementQuestionsRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.projectName)) return false;
  if (!isString(value.scopeName)) return false;
  if (!isString(value.contextBrief)) return false;
  const isAnalysisStory = (story: unknown) =>
    isRecord(story) && isString(story.title) && isString(story.summary);
  if (!isAnalysisStory(value.selectedStory)) return false;
  if (typeof value.selectedStories !== 'undefined') {
    if (!Array.isArray(value.selectedStories) || !value.selectedStories.every(isAnalysisStory)) return false;
  }
  return true;
}

export function isRefinementAnalysisRequest(value: unknown): value is RefinementAnalysisRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.projectName)) return false;
  if (!isString(value.scopeName)) return false;
  if (!isString(value.contextBrief)) return false;
  const isAnalysisStory = (story: unknown) =>
    isRecord(story) && isString(story.title) && isString(story.summary);
  if (!isAnalysisStory(value.selectedStory)) return false;

  const isAnsweredQuestion = (item: unknown) =>
    isRecord(item) &&
    (item.role === 'Frontend' || item.role === 'Backend' || item.role === 'QA') &&
    isString(item.question) &&
    isString(item.answer);
  if (!Array.isArray(value.answeredQuestions) || !value.answeredQuestions.every(isAnsweredQuestion)) return false;
  return true;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isFinalOutputRequest(value: unknown): value is FinalOutputRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.projectName)) return false;
  if (!isString(value.scopeName)) return false;
  if (!isString(value.contextBrief)) return false;
  if (!isString(value.storyTitle)) return false;
  if (typeof value.userStoryStatement !== 'undefined' && !isString(value.userStoryStatement)) return false;
  if (!isStringArray(value.acceptanceCriteriaDraft)) return false;
  if (!isStringArray(value.technicalNotes)) return false;
  if (!isStringArray(value.notIncluded)) return false;
  if (!isStringArray(value.assumptions)) return false;
  if (!isStringArray(value.openQuestions)) return false;
  return true;
}
