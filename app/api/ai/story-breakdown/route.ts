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
        'Generate candidate user stories for a product scope workspace. Keep output concise and schema-compliant.',
      userPayload: {
        task: 'step_2_story_breakdown_placeholder',
        projectContext: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
