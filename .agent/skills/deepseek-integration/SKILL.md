---
name: DeepSeek Integration
description: Calling or modifying the AI generation layer using DeepSeek API, including system prompt and parsing rules.
---

# Skill: DeepSeek Integration

## When To Use This Skill

Read this skill before writing, modifying, or debugging any code that calls the DeepSeek API. This includes:
- Modifying `lib/deepseek.ts`
- Changing the system prompt or user prompt construction
- Adjusting generation parameters (temperature, max_tokens)
- Handling or reshaping DeepSeek response output
- Adding new generation capabilities

---

## The DeepSeek Wrapper — `lib/deepseek.ts`

All DeepSeek API calls go through this file. Never call the DeepSeek API directly from a route or component.

### Structure

```ts
// lib/deepseek.ts

import { DeepSeekApiError } from './errors';

export async function generateUserFlow(input: GenerateFlowInput): Promise<RawFlowOutput> {
  const baseUrl = process.env.DEEPSEEK_API_URL?.replace(/\/+$/, '');
  const key = process.env.DEEPSEEK_API_KEY;

  if (!baseUrl || !key) {
    throw new Error('DEEPSEEK_API_URL and DEEPSEEK_API_KEY must be defined in env.');
  }
  // Expected DEEPSEEK_API_URL format: the base URL without a trailing slash, e.g.
  //   https://api.deepseek.com           → final URL: https://api.deepseek.com/chat/completions
  //   https://api.deepseek.com/v1        → final URL: https://api.deepseek.com/v1/chat/completions
  // The trailing-slash cleanup (replace) handles both forms safely.

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(input);

  // Set a 30-second timeout so hung requests don't block the server
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new DeepSeekApiError(response.status, `DeepSeek API returned status ${response.status}`);
    }

    const data = await response.json();
    return parseDeepSeekResponse(data); // extracts raw JSON string from the API response envelope
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry transient failures (network errors or 5xx) up to 2 times with exponential backoff.
// This is handled by the caller (route or orchestrator), not inside generateUserFlow itself.
// See Error Handling section for the pattern.
// Model name: 'deepseek-chat' is the current stable DeepSeek model. If DeepSeek releases a
// newer versioned model (e.g. 'deepseek-v3'), update it here and verify output still parses.
```

---

## System Prompt Rules

The system prompt is defined in `buildSystemPrompt()` inside `lib/deepseek.ts`.

### Invariants — never change these without a deliberate product decision:
- The AI must only accept product design descriptions
- The AI must always produce all three output blocks (nodes, edges, userJourneySteps)
- The AI must never suggest tech stacks or implementation details
- The AI must reject off-topic input (though this is pre-filtered at the route layer)
- UX shape types must map to: `process`, `decision`, `error`, `terminal`
- Happy path nodes must always have `"is_happy_path": true`
- Decision edges must always carry a `label` (Yes/No, Success/Fail etc.)

### Prompt template markers
Use these comment markers in the system prompt for auditability:

```
// AI PROMPT: ROLE DEFINITION
// AI PROMPT: OUTPUT SCHEMA
// AI PROMPT: SHAPE CONVENTIONS
// AI PROMPT: CONSTRAINTS
```

## User Message Construction — `buildUserMessage(input)`

The user message is what carries the actual product description and form fields to the AI. It lives in `lib/deepseek.ts` alongside `buildSystemPrompt()`.

### Responsibilities
- Receives a `GenerateFlowInput` object with fields: `description` (already sanitised by the route), `productName`, `flowType`, `targetUsers`, `keyAction`
- Interpolates these fields into a structured text prompt that the AI can parse alongside the system prompt
- Does **not** sanitise — the route has already called `sanitizeInput()` before passing the description here
- Does **not** check off-topic — that is done by the route before the DeepSeek call

### Template

```
You are designing a user flow for the following product:

Product name: {productName}
Flow type: {flowType}
Target users: {targetUsers}
Key action: {keyAction}

Product description:
{description}
```

Do not add instructions or constraints to the user message — those belong in the system prompt. The user message is data only.

---

## Output Parsing — `lib/flow-parser.ts`

DeepSeek output must be validated and parsed before reaching the database or the client.

Two functions work in sequence:

| Function | Location | Responsibility |
|---|---|---|
| `parseDeepSeekResponse(data)` | `lib/deepseek.ts` | Extracts the raw JSON string from the DeepSeek API response envelope and parses it into a `RawFlowOutput` object. Minimal — just unwraps the response. |
| `parseFlowOutput(raw)` | `lib/flow-parser.ts` | Validates schema, transforms snake_case AI keys to camelCase for the application layer, and returns a typed `Flow` object. This is where all validation and transformation lives. |

### Expected raw output from DeepSeek (snake_case — AI format):

```json
{
  "nodes": [
    { "node_id": "n1", "type": "terminal", "label": "Start", "is_happy_path": true }
  ],
  "edges": [
    { "edge_id": "e1", "from_node": "n1", "to_node": "n2", "label": "Continue" }
  ],
  "user_journey_steps": [
    { "step": 1, "user_action": "Lands on app", "system_response": "Session initialised" }
  ]
}
```

### Key transformation: snake_case → camelCase

The AI outputs snake_case keys (`node_id`, `from_node`, `is_happy_path`, `user_journey_steps`). The application layer (database, API responses, components) uses camelCase (`nodeId`, `fromNode`, `isHappyPath`, `userJourneySteps`). The `parseFlowOutput()` function must perform this key mapping as part of validation.

### Validation rules in `parseFlowOutput()`:

1. **Parse**: Validate the JSON structure matches `RawFlowOutput` — every required field present, no unknown top-level keys
2. **Transform**: Map snake_case keys to camelCase:
   - `node_id` → `nodeId`, `edge_id` → `edgeId`, `from_node` → `fromNode`, `to_node` → `toNode`, `is_happy_path` → `isHappyPath`, `user_journey_steps` → `userJourneySteps`
3. **Validate node integrity**:
   - Every node must have `nodeId`, `type`, `label`, `isHappyPath` (after transform)
   - `type` must be one of: `process`, `decision`, `error`, `terminal`
4. **Validate edge integrity**:
   - Every edge must have `edgeId`, `fromNode`, `toNode`, `label` (after transform)
   - `fromNode` and `toNode` must reference existing `nodeId` values
5. **Validate journey steps**:
   - Every step must have `step` (integer), `userAction`, `systemResponse` (after transform)
6. **Reject partial data**: If validation fails at any step, throw `FlowParseError` — do not write partial data to the database

---

## Generation Parameters

| Parameter | Value | Reason |
|---|---|---|
| `temperature` | `0.3` | Low temperature keeps flows consistent and notation-compliant |
| `max_tokens` | `4096` | Sufficient for a full flow; increase only if complex flows are truncated |
| `response_format` | `json_object` | Forces structured output; simplifies parsing |

Do not raise temperature above `0.5` — higher values produce inconsistent UX notation.

---

## Error Handling

Define the standard custom error structures in `lib/errors.ts`:

```ts
export class DeepSeekApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DeepSeekApiError';
  }
}

export class FlowParseError extends Error {
  constructor(message: string, public rawOutput?: string) {
    super(message);
    this.name = 'FlowParseError';
  }
}
```

### Error-to-HTTP Mapping

These error types are not in the AGENTS.md error code table (which covers client-input errors). They are server-side errors and should be added to the table:

| Error Class | Thrown When | HTTP Status | Should Retry? |
|---|---|---|---|
| `DeepSeekApiError` | DeepSeek API returned a non-2xx status | `502` | Yes (5xx responses only, not 4xx) |
| `FlowParseError` | AI output failed schema validation or key transformation | `500` | No (retrying would produce the same output) |

### Orchestration pattern with retry and error distinction

```ts
// lib/ orchestrator or route handler
async function generateWithRetry(input: GenerateFlowInput): Promise<Flow> {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await generateUserFlow(input);
      return parseFlowOutput(raw); // validates schema and transforms keys
    } catch (error) {
      if (error instanceof DeepSeekApiError && error.status >= 500 && attempt < MAX_RETRIES) {
        // Transient server error — wait with exponential backoff, then retry
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      if (error instanceof FlowParseError) {
        // Output was malformed — log raw output for debugging, return 500 Internal Error
        throw error;
      }
      throw error; // Re-throw unexpected errors
    }
  }
}
```

Route handlers call `generateWithRetry()` and map the final error to an HTTP response. Do not call `generateUserFlow` directly from a route — always wrap it with retry logic.

---

## Type Definitions — `types/index.ts`

The skill references two types that must be defined in `types/index.ts`:

```ts
// types/index.ts

export interface GenerateFlowInput {
  description: string;    // Pre-sanitised product description
  productName: string;
  flowType: FlowType;     // 'onboarding' | 'checkout' | 'sign_up_login' | 'full_product_flow' | 'custom'
  targetUsers: string[];  // Array of user segments
  keyAction: string;      // Primary user action
  sessionId: string;
}

export interface RawFlowOutput {
  nodes: RawNode[];
  edges: RawEdge[];
  user_journey_steps: RawJourneyStep[];
}

// These mirror the AI's snake_case output before parseFlowOutput transforms them
export interface RawNode {
  node_id: string;
  type: 'process' | 'decision' | 'error' | 'terminal';
  label: string;
  is_happy_path: boolean;
}

export interface RawEdge {
  edge_id: string;
  from_node: string;
  to_node: string;
  label: string;
}

export interface RawJourneyStep {
  step: number;
  user_action: string;
  system_response: string;
}
```

### Validated camelCase output types

These are the shapes after `parseFlowOutput()` transforms and validates the raw AI output:

```ts
export interface Flow {
  nodes: Node[];
  edges: Edge[];
  userJourneySteps: JourneyStep[];
}

export interface Node {
  nodeId: string;
  type: 'process' | 'decision' | 'error' | 'terminal';
  label: string;
  isHappyPath: boolean;
}

export interface Edge {
  edgeId: string;
  fromNode: string;
  toNode: string;
  label: string;
}

export interface JourneyStep {
  step: number;
  userAction: string;
  systemResponse: string;
}
```

---

## Cost Awareness

- DeepSeek is used for cost efficiency. Every wasted token call has a cost.
- Off-topic inputs must be rejected **before** calling DeepSeek — never pass them through.
- Rate limit exceeded requests must be rejected **before** calling DeepSeek.
- Do not call DeepSeek for edits — editing modifies the stored flow object directly without an AI call.