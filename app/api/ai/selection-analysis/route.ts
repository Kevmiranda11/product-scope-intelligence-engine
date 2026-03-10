import { NextRequest, NextResponse } from 'next/server';
import {
  isSelectionAnalysisRequest,
  selectionAnalysisResponseSchema,
  type SelectionAnalysisResponse,
} from '@/lib/server/ai-contract';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function validateSelectionAnalysisRequestBody(body: unknown): string[] {
  const details: string[] = [];

  if (!isRecord(body)) {
    return ['Body must be a JSON object.'];
  }

  if (!isString(body.projectName)) details.push('projectName must be a string.');
  if (!isString(body.scopeName)) details.push('scopeName must be a string.');
  if (!isString(body.contextBrief)) details.push('contextBrief must be a string.');

  const validateStoryArray = (value: unknown, fieldName: 'storyCandidates' | 'selectedStories') => {
    if (!Array.isArray(value)) {
      details.push(`${fieldName} must be an array.`);
      return;
    }

    value.forEach((item, index) => {
      if (!isRecord(item)) {
        details.push(`${fieldName}[${index}] must be an object.`);
        return;
      }
      if (!isString(item.title)) {
        details.push(`${fieldName}[${index}].title must be a string.`);
      }
      if (!isString(item.summary)) {
        details.push(`${fieldName}[${index}].summary must be a string.`);
      }
    });
  };

  validateStoryArray(body.storyCandidates, 'storyCandidates');
  validateStoryArray(body.selectedStories, 'selectedStories');

  return details;
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireUser(request);
    const body = (await request.json()) as unknown;
    console.log('STEP_3_SELECTION_ANALYSIS_RAW_BODY', body);

    if (!isSelectionAnalysisRequest(body)) {
      const validationDetails = validateSelectionAnalysisRequestBody(body);
      console.error('STEP_3_SELECTION_ANALYSIS_VALIDATION_ERROR', validationDetails);
      return NextResponse.json(
        {
          message: 'Invalid selection analysis request body.',
          validationDetails,
        },
        { status: 400 }
      );
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.' }, { status: 503 });
    }

    // TODO Step 3 = selection analysis / missing scope analysis
    const result = await generateStructuredOutput<SelectionAnalysisResponse>({
      schemaName: 'selection_analysis_response',
      schema: selectionAnalysisResponseSchema,
      systemPrompt:
        [
          'You are helping with Step 3 (Selection Analysis) of a product scope workflow.',
          'Evaluate whether selectedStories adequately cover the scope described in contextBrief.',
          'Output strict JSON only with: scopeConfidence, missingAreas, and suggestedStories.',
          'scopeConfidence must be 0 to 100.',
          'missingAreas must represent real functional gaps in selectedStories relative to contextBrief.',
          'suggestedStories should help close the identified missing areas.',
          'Keep all content concise, practical, and product-oriented.',
          'Do not output markdown or any text outside schema.',
        ].join(' '),
      userPayload: {
        task: 'step_3_selection_analysis',
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
