import { NextRequest, NextResponse } from 'next/server';
import {
  isRefinementQuestionsRequest,
  refinementQuestionsResponseSchema,
  type RefinementQuestionsResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isRefinementQuestionsRequest(body)) {
      return NextResponse.json({ error: 'Invalid refinement questions request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 4 = simulated FE/BE/QA refinement questions
    const result = await generateStructuredOutput<RefinementQuestionsResponse>({
      schemaName: 'refinement_questions_response',
      schema: refinementQuestionsResponseSchema,
      systemPrompt:
        'Generate focused Frontend, Backend, and QA refinement questions for each selected story. Output schema-compliant JSON only.',
      userPayload: {
        task: 'step_4_refinement_questions_placeholder',
        projectContext: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
