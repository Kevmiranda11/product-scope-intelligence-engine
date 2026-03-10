import { NextRequest, NextResponse } from 'next/server';
import {
  isRefinementQuestionsRequest,
  refinementQuestionsResponseSchema,
  type RefinementQuestionsResponse,
} from '@/lib/server/ai-contract';
import { AuthError, applySessionCookie, requireUser } from '@/lib/server/auth';
import { generateStructuredOutput, isOpenAIConfigured } from '@/lib/server/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const context = await requireUser(request);
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
      systemPrompt: [
        'You are a senior product refinement partner for Step 4.',
        'Generate the smallest number of highest-value questions needed to resolve ambiguity for a Product Owner/Product Manager.',
        'Quality over quantity: ask fewer questions if context is already clear.',
        'Hard limits: maximum 2 questions per role and 6 total questions across all roles.',
        'Questions must be decision-grade, senior-level, and materially improve scope clarity.',
        'Avoid filler, obvious, or repetitive questions.',
        'Avoid low-level implementation detail unless translated into product/business language.',
        'Assume a prototype/design may already exist; avoid visual/layout detail questions unless behavior is unresolved.',
        'If relevant, ask at most one gating prototype question.',
        'Do not ask questions that a tech lead should decide internally without product input.',
        'Ask about business rules, constraints, ownership, permissions, edge cases, timing, success/failure behavior, moderation, audit/history, cross-workspace impacts, irreversible actions, and dependencies.',
        'Frontend/Flutter: only user-facing behavior, states, confirmations, visibility rules, prototype ambiguity, interaction edge cases.',
        'Backend: only business-rule and persistence expectations phrased in product language (history/audit, integrations, uniqueness, constraints, operational behavior).',
        'QA: only negative paths, misuse/abuse, acceptance boundaries, special cases, and must-validate before release.',
        'Do not ask questions already clearly answered by the provided context.',
        'Keep each question concise and specific.',
        'Return strict schema-compliant JSON only.',
      ].join(' '),
      userPayload: {
        task: 'step_4_refinement_questions',
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
