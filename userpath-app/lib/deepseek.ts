import { createHash } from 'crypto';
import { DeepSeekApiError } from './errors';
import { DEEPSEEK_TIMEOUT_MS } from './constants';
import { getDb } from '@/lib/db';
import { buildSystemPrompt, buildUserMessage } from '@/lib/prompt-builder';
import { parseDeepSeekResponse, storedFlowToRawOutput } from '@/lib/json-recovery';
import type { GenerateFlowInput, RawFlowOutput, Flow as FlowData } from '@/types';

export function buildCacheKey(input: GenerateFlowInput): string {
  const parts = [
    input.description.toLowerCase().trim(),
    input.productName.toLowerCase().trim(),
    input.flowType,
    [...input.targetUsers].sort().join(','),
    input.keyAction.toLowerCase().trim(),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export async function generateUserFlow(input: GenerateFlowInput, timeoutMs = DEEPSEEK_TIMEOUT_MS): Promise<RawFlowOutput> {
  const cacheKey = buildCacheKey(input);
  const db = await getDb();
  const cached = await db.flowGenerationCache.findUnique({ where: { cacheKey } });
  if (cached) {
    const flowRecord = await db.flow.findUnique({ where: { id: cached.flowId } });
    if (flowRecord) {
      try {
        const stored: FlowData = {
          nodes: JSON.parse(flowRecord.nodes),
          edges: JSON.parse(flowRecord.edges),
          userJourneySteps: JSON.parse(flowRecord.userJourneySteps),
        };
        return storedFlowToRawOutput(stored);
      } catch {
        // Corrupted cached data — fall through to regenerate
      }
    }
  }
  const baseUrl = process.env.DEEPSEEK_API_URL?.replace(/\/+$/, '');
  const key = process.env.DEEPSEEK_API_KEY;

  if (!baseUrl || !key) {
    throw new Error('DEEPSEEK_API_URL and DEEPSEEK_API_KEY must be defined in env.');
  }

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(input);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        seed: 42,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new DeepSeekApiError(
        response.status,
        `DeepSeek API returned status ${response.status}`,
      );
    }

    const data = await response.json();
    return parseDeepSeekResponse(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateWithRetry(
  input: GenerateFlowInput,
  retries = 2,
): Promise<RawFlowOutput> {
  const TOTAL_TIMEOUT = DEEPSEEK_TIMEOUT_MS * (retries + 1) + 5000;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const remaining = TOTAL_TIMEOUT - (Date.now() - startTime);
    if (remaining <= 5000) throw new DeepSeekApiError(500, 'Generation timeout exceeded');

    try {
      return await generateUserFlow(input, Math.min(DEEPSEEK_TIMEOUT_MS, remaining));
    } catch (error) {
      if (
        error instanceof DeepSeekApiError &&
        error.status >= 500 &&
        attempt < retries
      ) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, remaining - 1000);
        if (delay <= 0) throw error;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw new DeepSeekApiError(500, 'All retries exhausted');
}
