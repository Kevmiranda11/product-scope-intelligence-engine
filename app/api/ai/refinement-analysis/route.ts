import { NextRequest, NextResponse } from 'next/server';
import {
  isRefinementAnalysisRequest,
  refinementAnalysisResponseSchema,
  type RefinementAnalysisResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isRefinementAnalysisRequest(body)) {
      return NextResponse.json({ error: 'Invalid refinement analysis request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 4 = simulated FE/BE/QA refinement questions
    const result = await generateStructuredOutput<RefinementAnalysisResponse>({
      schemaName: 'refinement_analysis_response',
      schema: refinementAnalysisResponseSchema,
      systemPrompt: [
        'You are analyzing refinement answers for one selected user story in Step 4.',
        'Produce a clear user story statement and practical refinement outputs.',
        'acceptanceCriteria must be non-technical and business/user-oriented.',
        'technicalNotes must be technical and separated from acceptance criteria.',
        'notIncluded must only list explicit out-of-scope items.',
        'assumptions must capture inferred decisions.',
        'openQuestions must capture unresolved ambiguity.',
        'Keep output concise and strictly schema-compliant JSON.',
      ].join(' '),
      userPayload: {
        task: 'step_4_refinement_analysis',
        input: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
