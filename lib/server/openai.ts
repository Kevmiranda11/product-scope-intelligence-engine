import 'server-only';

type JsonObject = Record<string, unknown>;

interface OpenAITextContent {
  type: string;
  text?: string;
}

interface OpenAIOutputItem {
  type: string;
  content?: OpenAITextContent[];
}

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
}

interface StructuredOutputParams {
  schemaName: string;
  schema: JsonObject;
  systemPrompt: string;
  userPayload: JsonObject;
  model?: string;
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }
  return apiKey;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function extractResponseText(payload: OpenAIResponsesPayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim().length > 0) {
        return content.text;
      }
    }
  }

  const apiError = payload.error?.message;
  if (apiError) {
    throw new Error(apiError);
  }

  throw new Error('OpenAI response did not include structured output text.');
}

export async function generateStructuredOutput<T>(params: StructuredOutputParams): Promise<T> {
  const apiKey = getOpenAIApiKey();
  const model = params.model ?? 'gpt-4.1-mini';

  const requestBody = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: params.systemPrompt,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify(params.userPayload),
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        strict: true,
        name: params.schemaName,
        schema: params.schema,
      },
    },
  };

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  if (!response.ok) {
    const failureText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${failureText}`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;
  const outputText = extractResponseText(payload);

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error('Failed to parse structured output JSON from OpenAI.');
  }
}
