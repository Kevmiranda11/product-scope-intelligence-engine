type JsonObject = Record<string, unknown>;

export interface StoryInput {
  id: string;
  title: string;
}

export interface StoryBreakdownRequest {
  scopeName: string;
  sprintDuration: string;
  team: string;
  contextBrief: string;
}

export interface StoryBreakdownResponse {
  stories: Array<{
    id: string;
    title: string;
    rationale: string;
    estimationHint: 'S' | 'M' | 'L';
  }>;
}

export interface SelectionAnalysisRequest {
  contextBrief: string;
  stories: StoryInput[];
  selectedStoryIds: string[];
}

export interface SelectionAnalysisResponse {
  scopeConfidence: number;
  missingScopeSignals: Array<{
    id: string;
    title: string;
    reason: string;
    severity: 'low' | 'med' | 'high';
  }>;
  recommendedStoryIds: string[];
}

export interface RefinementQuestionsRequest {
  contextBrief: string;
  selectedStories: StoryInput[];
}

export interface RefinementQuestionsResponse {
  questionsByStory: Array<{
    storyId: string;
    storyTitle: string;
    questions: Array<{
      id: string;
      role: 'Frontend' | 'Backend' | 'QA';
      question: string;
    }>;
  }>;
}

export interface FinalOutputRequest {
  contextBrief: string;
  selectedStories: StoryInput[];
  questionsByStory: RefinementQuestionsResponse['questionsByStory'];
}

export interface FinalOutputResponse {
  exportItems: Array<{
    storyId: string;
    storyTitle: string;
    userStoryStatement: string;
    acceptanceCriteria: string[];
    technicalNotes: string[];
    notIncluded: string[];
    assumptions: string[];
  }>;
}

export const storyBreakdownResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stories'],
  properties: {
    stories: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'rationale', 'estimationHint'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          rationale: { type: 'string' },
          estimationHint: { type: 'string', enum: ['S', 'M', 'L'] },
        },
      },
    },
  },
} as const satisfies JsonObject;

export const selectionAnalysisResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scopeConfidence', 'missingScopeSignals', 'recommendedStoryIds'],
  properties: {
    scopeConfidence: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    missingScopeSignals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'reason', 'severity'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          reason: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'med', 'high'] },
        },
      },
    },
    recommendedStoryIds: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const satisfies JsonObject;

export const refinementQuestionsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['questionsByStory'],
  properties: {
    questionsByStory: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['storyId', 'storyTitle', 'questions'],
        properties: {
          storyId: { type: 'string' },
          storyTitle: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'role', 'question'],
              properties: {
                id: { type: 'string' },
                role: { type: 'string', enum: ['Frontend', 'Backend', 'QA'] },
                question: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies JsonObject;

export const finalOutputResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['exportItems'],
  properties: {
    exportItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'storyId',
          'storyTitle',
          'userStoryStatement',
          'acceptanceCriteria',
          'technicalNotes',
          'notIncluded',
          'assumptions',
        ],
        properties: {
          storyId: { type: 'string' },
          storyTitle: { type: 'string' },
          userStoryStatement: { type: 'string' },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          technicalNotes: { type: 'array', items: { type: 'string' } },
          notIncluded: { type: 'array', items: { type: 'string' } },
          assumptions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const satisfies JsonObject;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStoryInput(value: unknown): value is StoryInput {
  return isRecord(value) && isString(value.id) && isString(value.title);
}

export function isStoryBreakdownRequest(value: unknown): value is StoryBreakdownRequest {
  if (!isRecord(value)) return false;
  return (
    isString(value.scopeName) &&
    isString(value.sprintDuration) &&
    isString(value.team) &&
    isString(value.contextBrief)
  );
}

export function isSelectionAnalysisRequest(value: unknown): value is SelectionAnalysisRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.contextBrief)) return false;
  if (!Array.isArray(value.stories) || !value.stories.every(isStoryInput)) return false;
  if (!Array.isArray(value.selectedStoryIds) || !value.selectedStoryIds.every(isString)) return false;
  return true;
}

export function isRefinementQuestionsRequest(value: unknown): value is RefinementQuestionsRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.contextBrief)) return false;
  if (!Array.isArray(value.selectedStories) || !value.selectedStories.every(isStoryInput)) return false;
  return true;
}

function isRefinementQuestion(value: unknown): value is {
  id: string;
  role: 'Frontend' | 'Backend' | 'QA';
  question: string;
} {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    (value.role === 'Frontend' || value.role === 'Backend' || value.role === 'QA') &&
    isString(value.question)
  );
}

function isQuestionsByStory(value: unknown): value is FinalOutputRequest['questionsByStory'] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!isRecord(item)) return false;
    if (!isString(item.storyId) || !isString(item.storyTitle)) return false;
    if (!Array.isArray(item.questions) || !item.questions.every(isRefinementQuestion)) return false;
    return true;
  });
}

export function isFinalOutputRequest(value: unknown): value is FinalOutputRequest {
  if (!isRecord(value)) return false;
  if (!isString(value.contextBrief)) return false;
  if (!Array.isArray(value.selectedStories) || !value.selectedStories.every(isStoryInput)) return false;
  if (!isQuestionsByStory(value.questionsByStory)) return false;
  return true;
}
