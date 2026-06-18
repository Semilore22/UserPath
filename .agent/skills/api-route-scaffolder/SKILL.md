---
name: API Route Scaffolder
description: Guidelines and template for creating Next.js API routes with validation, rate limiting, and off-topic filtering.
---

# Skill: API Route Scaffolder

## When To Use This Skill

Read this skill before creating any new API route. This covers:
- New routes under `app/api/`
- Adding a new HTTP method to an existing route file
- Modifying request validation or response shaping on existing routes

---

## Route File Location

All API routes live under `app/api/` following Next.js App Router conventions.

```
app/api/
├── generate/
│   └── route.ts          ← POST /api/generate
├── flow/
│   └── [flowId]/
│       └── route.ts      ← GET /api/flow/:flowId  PATCH /api/flow/:flowId
└── ratelimit/
    └── route.ts          ← GET /api/ratelimit
```

---

## Route Template

Every route must follow this exact structure:

```ts
// app/api/<resource>/route.ts

import { NextRequest, NextResponse } from 'next/server';
// import lib functions here

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse body
    // 2. Validate input
    // 3. Pre-filter off-topic input (before DeepSeek calls)
    // 4. Check rate limit (if generation route, before DeepSeek calls)
    // 5. Check session ownership (if write on existing resource)
    // 6. Business logic (calls lib functions, never direct db queries/AI calls)
    // 7. Return shaped response
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'ERR_INTERNAL_ERROR' }, { status: 500 });
  }
}
```

Never skip the ordering. Validation and off-topic check always run before the rate limit check and the DeepSeek call. All business logic must be wrapped in a global try/catch to shield raw database/integration errors from the client.

---

## Step-by-Step: Creating a New Route

### Step 1 — Create the file

```
app/api/<resource>/route.ts
```

For dynamic segments:
```
app/api/<resource>/[id]/route.ts
```

### Step 2 — Validate content type and parse the request

Enforce `Content-Type: application/json` and set a body size limit before parsing. Always wrap `req.json()` in try/catch — malformed JSON must return `400`, not `500`.

```ts
const contentType = req.headers.get('content-type') ?? '';
if (!contentType.includes('application/json')) {
  return NextResponse.json({ error: 'ERR_UNSUPPORTED_MEDIA_TYPE' }, { status: 415 });
}

const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
const MAX_BODY_SIZE = 1024 * 10; // 10 KB — well above a form submission
if (contentLength > MAX_BODY_SIZE) {
  return NextResponse.json({ error: 'ERR_PAYLOAD_TOO_LARGE' }, { status: 413 });
}

let body: Record<string, unknown>;
try {
  body = await req.json();
} catch {
  return NextResponse.json({ error: 'ERR_MALFORMED_JSON' }, { status: 400 });
}
```

### Step 3 — Validate input

Validate every required field explicitly. Do not trust the client. Consider using a schema library (e.g. Zod) for complex validation to reduce boilerplate, but hand-rolled checks are acceptable for simple routes.

```ts
import { FLOW_TYPES } from '@/types';

const { description, productName, flowType, targetUsers, keyAction } = body;

// Enforce required fields
if (!description || !productName || !flowType || !targetUsers || !keyAction) {
  return NextResponse.json({ error: 'ERR_FORM_INCOMPLETE' }, { status: 400 });
}

if (typeof description !== 'string' || description.length < 30) {
  return NextResponse.json({ error: 'ERR_INPUT_TOO_SHORT' }, { status: 400 });
}

if (description.length > 500) {
  return NextResponse.json({ error: 'ERR_INPUT_TOO_LONG' }, { status: 400 });
}

if (!FLOW_TYPES.includes(flowType)) {
  return NextResponse.json({ error: 'ERR_INVALID_FLOW_TYPE' }, { status: 400 });
}
```

### Step 3b — Sanitise and Pre-Filter Off-Topic Input

Strip HTML tags and script patterns via a dedicated lib function (not inline — routes contain only orchestration), then verify the input is design/product-related before making any external AI calls.

```ts
import { sanitizeInput } from '@/lib/sanitize';
import { isOffTopic } from '@/lib/off-topic';

const sanitisedDescription = sanitizeInput(description);

if (await isOffTopic(sanitisedDescription)) {
  return NextResponse.json({ error: 'ERR_OFF_TOPIC' }, { status: 400 });
}
```

### Step 4 — Extract and verify session

The session header name (`x-session-id`) must match between the frontend and all API routes. Define it as a shared constant so they stay in sync:

```ts
// lib/constants.ts
export const SESSION_HEADER = 'x-session-id';
```

```ts
import { SESSION_HEADER } from '@/lib/constants';

const sessionId = req.headers.get(SESSION_HEADER);
```

For write operations on existing resources, verify ownership:

```ts
const flow = await db.flow.findUnique({ where: { id: flowId } });

if (!flow || flow.sessionId !== sessionId) {
  return NextResponse.json({ error: 'ERR_FORBIDDEN' }, { status: 403 });
}
```

### Step 5 — Check rate limit (generation routes only)

```ts
import { checkRateLimit } from '@/lib/rate-limit';

const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
const rateLimitResult = await checkRateLimit(ip);

if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: 'ERR_RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
    { status: 429 }
  );
}
```

### Step 6 — Business logic

Call lib functions only. No inline database queries or direct DeepSeek API requests in route files. Ensure any call is wrapped in try/catch to shield internal system/API errors.

```ts
const flow = await generateUserFlow({
  description: sanitisedDescription,
  productName,
  flowType,
  targetUsers,
  keyAction,
  sessionId,
});
```

### Step 7 — Shape and return the response

Never return raw database objects. Always shape the response explicitly using defined TypeScript types.

```ts
import { GenerateFlowResponse } from '@/types';

const responsePayload: GenerateFlowResponse = {
  flowId: flow.id,
  productName: flow.productName,
  nodes: flow.nodes,
  edges: flow.edges,
  userJourneySteps: flow.userJourneySteps,
  createdAt: flow.createdAt,
};

return NextResponse.json(responsePayload);
```

---

## HTTP Status Code Reference

| Status | When |
|---|---|
| `200` | Successful GET |
| `201` | Successful POST (resource created) |
| `400` | Validation failure (bad input or malformed JSON) |
| `401` | Missing or invalid session |
| `403` | Session does not own the resource |
| `404` | Resource not found (do not use for deleted products — use a 200 with a `"not_available"` state) |
| `413` | Request body exceeds size limit |
| `415` | Unsupported Content-Type (must be `application/json`) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `502` | DeepSeek API call failed |

---

## Error Response Shape

All error responses must follow this shape:

```ts
{ "error": "ERR_CODE_HERE" }

// With additional context where useful:
{ "error": "ERR_RATE_LIMIT_EXCEEDED", "retryAfter": 3600 }
```

---

## Rules

- Route files contain **no business logic** — only orchestration (parse → validate → call lib → return).
- All database operations go through `lib/db.ts` via dedicated lib functions.
- All DeepSeek calls go through `lib/deepseek.ts`.
- Never log the request body in production — it may contain user descriptions that could be sensitive.
- Always return `Content-Type: application/json`. NextResponse.json() handles this automatically.
- Do not add CORS headers to write endpoints.
- Shared constants (header names, limits, etc.) live in `lib/constants.ts` — never duplicate string literals across routes.