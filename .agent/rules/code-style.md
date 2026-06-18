---
trigger: always_on
---

# Rule: Code Style

## TypeScript

- Strict mode is enabled. Never disable it. Never use `// @ts-ignore` without a written explanation in the same comment.
- Never use `any`. Use `unknown` and narrow the type explicitly if the shape is uncertain.
- Always type function return values explicitly on exported functions.
- Use `interface` for object shapes that represent data models or API contracts.
- Use `type` for unions, intersections, and utility types.
- Avoid `enum` — use `as const` objects with derived union types instead.

```ts
// ✅ Correct
export const FLOW_TYPES = ['onboarding', 'checkout', 'sign_up_login', 'full_product_flow', 'custom'] as const;
export type FlowType = typeof FLOW_TYPES[number];

// ❌ Avoid
enum FlowType { Onboarding, Checkout }
```

## Async / Error Handling

- Always use `async/await`. Never use `.then().catch()` chains.
- Wrap all async operations in try/catch. Never let unhandled promise rejections reach the client.
- In API routes, always return a typed error object — never throw raw errors to the response.

```ts
// ✅ Correct
try {
  const flow = await generateUserFlow(input);
  return NextResponse.json({ flow });
} catch (error) {
  return NextResponse.json({ error: 'ERR_INTERNAL_ERROR' }, { status: 500 });
}
```

## Naming Conventions

- Variables and functions: `camelCase`
- Components: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- CSS Module class names: `camelCase` (e.g. `.flowCanvas`, `.exportButton`)
- Database field names: follow Prisma schema exactly — do not rename at the application layer

## Component Structure

- One component per file.
- Order within a component file: imports → types → component function → export.
- Extract any logic longer than 10 lines into a named helper function or custom hook.
- Props interfaces are named `[ComponentName]Props` and defined immediately above the component.

```tsx
interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeEdit: (nodeId: string, label: string) => void;
}

export function FlowCanvas({ nodes, edges, onNodeEdit }: FlowCanvasProps) {
  // ...
}
```

## Imports

- Use absolute imports from the project root. Never use `../../../` chains longer than two levels.
- Import order: React → Next.js → third-party → internal lib → internal components → types → styles

## Comments

- Write comments that explain **why**, not what.
- Do not leave `TODO` comments in committed code without a linked issue reference.
- Mark any DeepSeek-specific prompt logic with `// AI PROMPT:` so it is easy to locate and audit.

## What Not To Do

- Do not use `var`. Use `const` by default, `let` only when reassignment is required.
- Do not use default exports for components. Use named exports.
- Do not write components longer than 200 lines. Break them up.
- Do not `console.log` in production code. Use a structured logger if logging is needed.
- Do not hardcode strings that appear in the UI. Keep user-facing copy in a constants file.