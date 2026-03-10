import { NextRequest, NextResponse } from 'next/server';
import {
  finalOutputResponseSchema,
  isFinalOutputRequest,
  type FinalOutputResponse,
} from '@/lib/server/ai-contract';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const body = (await request.json()) as unknown;

    if (!isFinalOutputRequest(body)) {
      return NextResponse.json({ error: 'Invalid final output request body.' }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 5 = final normalized output for export
    const result = await generateStructuredOutput<FinalOutputResponse>({
      schemaName: 'final_output_response',
      schema: finalOutputResponseSchema,
      systemPrompt: [
        'You are producing the final product-ready user story output for one refined story in Step 5.',
        'Use the project context and Step 4 refinement inputs to improve clarity and consistency while preserving intent.',
        'acceptanceCriteria must be non-technical, clear, and user/business-oriented.',
        'technicalNotes must remain separate from acceptanceCriteria.',
        'notIncluded must contain only explicit out-of-scope items.',
        'assumptions should include inferred or agreed decisions.',
        'openQuestions should only include unresolved items.',
        'Keep output concise, specific, and free of generic filler.',
        'Return strict schema-compliant JSON only.',
      ].join(' '),
      userPayload: {
        task: 'step_5_final_output',
        input: body,
      },
    });

    const response = NextResponse.json(result);
    if (context.rotatedToken) {
      applySessionCookie(response, context.rotatedToken);
    }
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
