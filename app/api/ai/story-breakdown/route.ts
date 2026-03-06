import { NextRequest, NextResponse } from 'next/server';
import {
  isStoryBreakdownRequest,
  storyBreakdownResponseSchema,
  type StoryBreakdownResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isStoryBreakdownRequest(body)) {
      return NextResponse.json({ error: 'Invalid story breakdown request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 2 = candidate story generation
    const result = await generateStructuredOutput<StoryBreakdownResponse>({
      schemaName: 'story_breakdown_response',
      schema: storyBreakdownResponseSchema,
      systemPrompt:
        [
          'You are helping with Step 2 (Story Breakdown) of a product scope workflow.',
          'Return exactly 5 to 10 candidate user stories in strict JSON schema format.',
          'Primary source of truth is contextBrief.',
          'projectName and scopeName provide naming context.',
          'sprintDuration and teamComposition are soft context only; do not treat them as hard constraints.',
          'Generate concise, product-oriented candidates that can be selected, refined, or discarded later.',
          'Each candidate needs a clear title and a short summary.',
          'Do not add markdown or prose outside schema output.',
        ].join(' '),
      userPayload: {
        task: 'step_2_story_breakdown',
        input: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
