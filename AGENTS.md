# UserPath — Agent Project Brief

## What This Product Is

UserPath is an AI-powered user flow generator built for designers at every level — freelancers, junior designers, senior practitioners, and learners building case studies. A designer describes their product in plain language, answers four structured form fields, and receives a complete, UX-notation-compliant visual flow diagram, a step-by-step user journey table, and a downloadable PNG — in under sixty seconds.

**Core promise:** Describe your product. Get a production-ready user flow. No setup. No blank canvas.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | SQLite (via Prisma) |
| ORM | Prisma 7 |
| AI Model | DeepSeek (via API) |
| Flow Rendering | React Flow |
| PNG Export | html-to-image |
| Styling | CSS Modules + CSS custom properties (design tokens) |
| Auth | None (free plan is anonymous; session by UUID) |
| Hosting | Vercel |

---

## Folder Structure

```
userpath/
├── app/
│   ├── (landing)/
│   │   └── page.tsx                  ← marketing/entry page
│   ├── (generate)/
│   │   ├── generate/
│   │   │   └── page.tsx              ← description input + form
│   │   └── flow/
│   │       └── [flowId]/
│   │           └── page.tsx          ← generated flow view + PNG export
│   └── api/
│       ├── generate/
│       │   └── route.ts              ← calls DeepSeek, returns flow object
│       ├── flow/
│       │   └── [flowId]/
│       │       └── route.ts          ← fetch/update a flow by ID
│       └── ratelimit/
│           └── route.ts              ← IP-based rate limit check
├── components/
│   ├── ui/                           ← primitive components (Button, Input, Card, Badge)
│   └── features/
│       ├── flow-canvas/              ← React Flow diagram renderer
│       ├── flow-form/                ← follow-up form (4 fields)
│       ├── description-input/        ← textarea with char counter (30–500)
│       ├── journey-table/            ← step-by-step user journey table
│       └── export-button/            ← PNG download trigger
├── lib/
│   ├── db.ts                         ← Prisma client singleton
│   ├── deepseek.ts                   ← DeepSeek API wrapper
│   ├── rate-limit.ts                 ← IP rate limit logic
│   ├── flow-parser.ts                ← parses DeepSeek output into flow schema
│   └── utils.ts                      ← shared helpers (kobo conversion etc.)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tokens/
│   ├── colors.css                    ← DO NOT touch. Design token source of truth.
│   └── typography.css                ← DO NOT touch. Design token source of truth.
└── types/
    └── index.ts                      ← shared TypeScript types
```

---

## Data Models

These match the database schema exactly. Use these as the reference for all data operations.

### Session
```
id          String    @id @default(cuid())
ipAddress   String
createdAt   DateTime  @default(now())
flows       Flow[]
rateLimits  RateLimit[]
```

### Flow
```
id               String      @id @default(cuid())
sessionId        String
productName      String
flowType         FlowType    ← onboarding | checkout | sign_up_login | full_product_flow | custom
targetUsers      String[]
keyAction        String
rawDescription   String
nodes            Json        ← serialised Node[]
edges            Json        ← serialised Edge[]
userJourneySteps Json        ← serialised JourneyStep[]
createdAt        DateTime    @default(now())
lastEditedAt     DateTime?
session          Session     @relation(...)
editLogs         EditLog[]
```

### EditLog
```
id            String    @id @default(cuid())
flowId        String
sessionId     String
editType      EditType  ← rename_node | add_branch | remove_step | change_label
previousValue String
newValue      String
editedAt      DateTime  @default(now())
flow          Flow      @relation(...)
```

### RateLimit
```
id               String    @id @default(cuid())
ipAddress        String    @unique
generationCount  Int       @default(0)
windowStart      DateTime
windowExpires    DateTime
session          Session   @relation(...)
```

---

## Key Business Rules

- Input descriptions must be between **30 and 500 characters**. Enforce at both client and API layer.
- Each IP address is limited to **5 flow generations per 24-hour window**. The window starts from the timestamp of the first generation, not midnight.
- Rate limiting is enforced at the **application layer** — never inside the AI prompt.
- DeepSeek output must be parsed and validated against the Flow schema before being stored or rendered. Malformed AI output must not reach the database.
- The `nodes` and `edges` fields are stored as JSON. Always validate structure before writing.
- Off-topic input (not a product/design description) must be rejected with `ERR_OFF_TOPIC` before the DeepSeek API is called — do not waste tokens on invalid input.
- PNG export is the **only** export format. Do not build or reference SVG or PDF export at any point.
- After a flow is edited, `lastEditedAt` must be updated and an `EditLog` record must be written atomically in the same transaction.
- If a `flowId` does not exist, the flow page must return a "Flow not found" state — not a 404.
- Only the session that created a flow may edit it. Enforce `sessionId` ownership on all write operations.
- `FLW_*` environment variables do not exist in this project. Do not reference Flutterwave.

---

## Environment Variables Required

```
DATABASE_URL
DEEPSEEK_API_KEY        ← server-side only, never expose to client
DEEPSEEK_API_URL        ← base URL for DeepSeek API
NEXTAUTH_SECRET         ← reserved for future auth layer
NEXTAUTH_URL            ← reserved for future auth layer
```

All secrets live in `.env.local`. Never hardcode them. Never log them. `DEEPSEEK_API_KEY` must never appear in client-side code or be included in any bundle.

---

## User Flows (Reference)

**Designer (Generator):**
Land on homepage → Enter product description (30–500 chars) → Complete follow-up form (Product Name, Flow Type, Target User, Key Action) → Flow generated → View visual diagram + user journey table → Download as PNG → Optionally edit nodes/branches

**System (Generation):**
Validate input length → Check rate limit by IP → Validate input is product/design related → Call DeepSeek API → Parse and validate response → Write Flow record to DB → Return flowId → Render on client

**System (Edit):**
User requests node edit → Validate session ownership → Apply edit to flow object → Write EditLog → Update `lastEditedAt` → Re-render canvas → Refresh PNG export

**System (Rate Limit Hit):**
IP check → `generationCount >= 5` within window → Return `ERR_RATE_LIMIT_EXCEEDED` with time remaining → Do not call DeepSeek

---

## Error Codes

| Code | Trigger | Behaviour |
|---|---|---|
| `ERR_INPUT_TOO_SHORT` | Input < 30 chars | Client-side block + message |
| `ERR_INPUT_TOO_LONG` | Input > 500 chars | Client-side block + message |
| `ERR_OFF_TOPIC` | Not a product description | API rejects before DeepSeek call |
| `ERR_FORM_INCOMPLETE` | Missing required form field | Client-side block + message |
| `ERR_RATE_LIMIT_EXCEEDED` | IP hit 5 generations in 24hrs | API returns 429 + time remaining |

---

## Agent Rules

All agents working on this project must read the following rule files before writing any code:

- `.agents/rules/architecture.md` — folder structure, naming conventions, routing patterns
- `.agents/rules/code-style.md` — TypeScript standards, formatting, patterns to avoid
- `.agents/rules/design-system.md` — token usage, component conventions, CSS Module rules
- `.agents/rules/security.md` — secret handling, API key rules, input validation requirements

---

## Skills

| Skill | Path | Use When |
|---|---|---|
| DeepSeek Integration | `skills/deepseek-integration/SKILL.md` | Calling or modifying the AI generation layer |
| Component Builder | `skills/component-builder/SKILL.md` | Creating any new UI component |
| DB Migration Runner | `skills/db-migration-runner/SKILL.md` | Adding or modifying Prisma schema |
| API Route Scaffolder | `skills/api-route-scaffolder/SKILL.md` | Creating any new Next.js API route |

---

## Workflows

| Workflow | Path | Use When |
|---|---|---|
| New Component | `workflows/new-component.md` | Building a new UI component from scratch |
| New API Route | `workflows/new-api-route.md` | Scaffolding a new API route end-to-end |