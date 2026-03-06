import { NextRequest, NextResponse } from 'next/server';
import {
  isSelectionAnalysisRequest,
  selectionAnalysisResponseSchema,
  type SelectionAnalysisResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isSelectionAnalysisRequest(body)) {
      return NextResponse.json({ error: 'Invalid selection analysis request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 3 = selection analysis / missing scope analysis
    const result = await generateStructuredOutput<SelectionAnalysisResponse>({
      schemaName: 'selection_analysis_response',
      schema: selectionAnalysisResponseSchema,
      systemPrompt:
        'Analyze selected stories for scope confidence and identify missing scope signals. Return only schema-compliant JSON.',
      userPayload: {
        task: 'step_3_selection_analysis_placeholder',
        projectContext: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
