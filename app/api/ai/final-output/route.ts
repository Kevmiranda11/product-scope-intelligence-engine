import { NextRequest, NextResponse } from 'next/server';
import {
  finalOutputResponseSchema,
  isFinalOutputRequest,
  type FinalOutputResponse,
} from '@/lib/server/ai-contract';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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
      systemPrompt:
        'Normalize the selected scope output into export-ready user stories and acceptance criteria. Return schema-compliant JSON only.',
      userPayload: {
        task: 'step_5_final_output_placeholder',
        projectContext: body,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
