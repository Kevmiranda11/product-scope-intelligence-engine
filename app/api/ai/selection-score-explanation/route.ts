import { NextRequest, NextResponse } from 'next/server';
import {
  isSelectionScoreExplanationRequest,
  selectionScoreExplanationResponseSchema,
  type SelectionScoreExplanationResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isSelectionScoreExplanationRequest(body)) {
      return NextResponse.json({ error: 'Invalid selection score explanation request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    const result = await generateStructuredOutput<SelectionScoreExplanationResponse>({
      schemaName: 'selection_score_explanation_response',
      schema: selectionScoreExplanationResponseSchema,
      systemPrompt: [
        'You explain Step 3 selection scope confidence to a product manager.',
        'Keep the explanation concise, practical, and non-technical.',
        'Reference selected stories, gaps, and suggestions at a high level.',
        'Do not use engineering jargon.',
        'Return only schema-compliant JSON.',
      ].join(' '),
      userPayload: {
        task: 'step_3_scope_score_explanation',
        input: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
