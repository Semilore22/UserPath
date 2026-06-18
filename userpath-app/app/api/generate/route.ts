import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sanitizeInput } from '@/lib/sanitize';
import { isOffTopic } from '@/lib/off-topic';
import { checkAndIncrementRateLimit } from '@/lib/rate-limit';
import { generateWithRetry, buildCacheKey } from '@/lib/deepseek';
import { parseFlowOutput } from '@/lib/flow-parser';
import { getFirstIp } from '@/lib/utils';
import { FLOW_TYPES, type FlowType, type GenerateFlowInput } from '@/types';

const ALLOWED_TARGET_USERS = ['first-time-user', 'returning-customer', 'admin'];
import {
  SESSION_HEADER,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_BODY_SIZE,
} from '@/lib/constants';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const db = await getDb();
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'ERR_UNSUPPORTED_MEDIA_TYPE' },
        { status: 415 },
      );
    }

    let body: Record<string, unknown>;
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY_SIZE) {
        return NextResponse.json(
          { error: 'ERR_PAYLOAD_TOO_LARGE' },
          { status: 413 },
        );
      }
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'ERR_MALFORMED_JSON' },
        { status: 400 },
      );
    }

    const sessionId = req.headers.get(SESSION_HEADER);
    if (!sessionId) {
      return NextResponse.json({ error: 'ERR_MISSING_SESSION' }, { status: 401 });
    }

    const { description, productName, flowType, targetUsers, keyAction } = body;

    if (
      !description ||
      !productName ||
      !flowType ||
      !targetUsers ||
      !keyAction
    ) {
      return NextResponse.json(
        { error: 'ERR_FORM_INCOMPLETE' },
        { status: 400 },
      );
    }

    if (
      typeof description !== 'string' ||
      typeof productName !== 'string' ||
      typeof keyAction !== 'string' ||
      typeof flowType !== 'string'
    ) {
      return NextResponse.json(
        { error: 'ERR_FORM_INCOMPLETE' },
        { status: 400 },
      );
    }

    const trimmedDescription = description.trim();

    const charCount = [...trimmedDescription].length;

    if (charCount < MIN_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: 'ERR_INPUT_TOO_SHORT' },
        { status: 400 },
      );
    }

    if (charCount > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: 'ERR_INPUT_TOO_LONG' },
        { status: 400 },
      );
    }

    if (!FLOW_TYPES.includes(flowType as FlowType)) {
      return NextResponse.json(
        { error: 'ERR_INVALID_FLOW_TYPE' },
        { status: 400 },
      );
    }

    if (!Array.isArray(targetUsers)) {
      return NextResponse.json(
        { error: 'ERR_FORM_INCOMPLETE' },
        { status: 400 },
      );
    }

    if (!targetUsers.every((u: unknown) => typeof u === 'string' && ALLOWED_TARGET_USERS.includes(u as string))) {
      return NextResponse.json(
        { error: 'ERR_FORM_INCOMPLETE' },
        { status: 400 },
      );
    }

    const sanitisedDescription = sanitizeInput(trimmedDescription);

    if (await isOffTopic(sanitisedDescription)) {
      return NextResponse.json({ error: 'ERR_OFF_TOPIC' }, { status: 400 });
    }

    const ip = getFirstIp(req.headers.get('x-forwarded-for'));

    await db.session.upsert({
      where: { id: sessionId },
      update: { ipAddress: ip },
      create: { id: sessionId, ipAddress: ip },
    });

    const rateLimitResult = await checkAndIncrementRateLimit(ip, sessionId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'ERR_RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    const generateInput: GenerateFlowInput = {
      description: sanitisedDescription,
      productName: productName as string,
      flowType: flowType as FlowType,
      targetUsers: targetUsers as string[],
      keyAction: keyAction as string,
      sessionId,
    };

    const rawOutput = await generateWithRetry(generateInput);
    const parsedFlow = parseFlowOutput(rawOutput);

    const flow = await db.flow.create({
      data: {
        sessionId,
        productName: productName as string,
        flowType: flowType as FlowType,
        targetUsers: JSON.stringify(targetUsers),
        keyAction: keyAction as string,
        rawDescription: sanitisedDescription,
        nodes: JSON.stringify(parsedFlow.nodes),
        edges: JSON.stringify(parsedFlow.edges),
        userJourneySteps: JSON.stringify(parsedFlow.userJourneySteps),
      },
    });

    await db.flowGenerationCache.upsert({
      where: { cacheKey: buildCacheKey(generateInput) },
      update: { flowId: flow.id },
      create: { cacheKey: buildCacheKey(generateInput), flowId: flow.id },
    });

    return NextResponse.json(
      {
        flowId: flow.id,
        productName: flow.productName,
        nodes: flow.nodes,
        edges: flow.edges,
        userJourneySteps: flow.userJourneySteps,
        createdAt: flow.createdAt,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'ERR_INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
