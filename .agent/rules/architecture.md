---
trigger: always_on
---

# Rule: Architecture

## Routing

- Use the Next.js 15 App Router exclusively. Never use the Pages Router.
- Route groups use parentheses: `(landing)`, `(generate)`. Do not treat them as URL segments.
- The landing page lives under `app/(landing)/`. The generate form and flow view live under `app/(generate)/`. API routes live under `app/api/`.
- The flow view page is always `app/(generate)/flow/[flowId]/page.tsx`. Do not create alternative flow routes.

## File Naming

- Page files: `page.tsx`
- Layout files: `layout.tsx`
- API routes: `route.ts`
- Components: PascalCase filename matching the component name — `FlowCanvas.tsx`, `ExportButton.tsx`
- Lib files: kebab-case — `flow-parser.ts`, `rate-limit.ts`
- CSS Modules: same name as component file — `FlowCanvas.module.css`

## Component Location

- Primitive, reusable UI elements belong in `components/ui/` — each in its own PascalCase subdirectory: `components/ui/ComponentName/ComponentName.tsx`
- Feature-specific components belong in `components/features/<feature-name>/` — each in its own subdirectory (kebab-case for the feature group, PascalCase for the component file): `components/features/flow-canvas/FlowCanvas.tsx`
- Never put feature logic inside `components/ui/`
- Never put primitive UI components inside `components/features/`

## Data Layer

- All database access goes through `lib/db.ts` (Prisma singleton). Never instantiate PrismaClient directly outside this file.
- All DeepSeek API calls go through `lib/deepseek.ts`. Never call the DeepSeek API directly from a route or component.
- All rate limit logic goes through `lib/rate-limit.ts`. Never inline rate limit checks in routes.
- Input sanitisation and off-topic detection go through `lib/sanitize.ts` and `lib/off-topic.ts` respectively. Run both before any DeepSeek call.
- Shared error classes (`DeepSeekApiError`, `FlowParseError`) live in `lib/errors.ts`.
- Shared constants (header names, limits) live in `lib/constants.ts` — never duplicate string literals across routes.

## API Routes

- Every API route must validate input before doing anything else.
- Input validation runs before the rate limit check.
- Rate limit check runs before the DeepSeek call.
- Off-topic detection runs before the DeepSeek call. If input fails the topic check, return `ERR_OFF_TOPIC` immediately — do not proceed.
- API routes must never return raw database errors to the client.

## State Management

- No global state library at MVP. Use React `useState` and `useReducer` for local component state.
- Session ID is stored in `sessionStorage` and passed via the `x-session-id` header on API calls. See the api-route-scaffolder skill for the request/response pattern.
- Never store `DEEPSEEK_API_KEY` or any secret in component state or client-side context.

## Types

- All shared TypeScript types live in `types/index.ts`.
- Do not declare types inline in component files if they are used in more than one place.
- Always type API response shapes explicitly — no `any` on API boundaries.

## What Not To Do

- Do not create a `pages/` directory.
- Do not use `getServerSideProps` or `getStaticProps`.
- Do not create a `/store` folder or add a global state library without discussion.
- Do not add Flutterwave, Stripe, or any payment SDK — UserPath does not process payments.
- Do not add authentication middleware at MVP — sessions are anonymous.