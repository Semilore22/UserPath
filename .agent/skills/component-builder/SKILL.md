---
name: Component Builder
description: Guidelines for building primitive and feature components with correct folder layouts, accessibilities, and CSS variables.
---

# Skill: Component Builder

## When To Use This Skill

Read this skill before creating any new UI component. This covers:
- New primitive components in `components/ui/`
- New feature components in `components/features/`
- Modifying the structure of an existing component

---

## Step 1 — Classify the Component

Before writing any code, answer: is this a **primitive** or a **feature** component?

| Type | Location | Rules |
|---|---|---|
| Primitive | `components/ui/` | No business logic. No API calls. Fully controlled. Reusable anywhere. |
| Feature | `components/features/<feature-name>/` | May contain logic and hooks. Isolated to its feature. May import from `ui/`. |

If in doubt: if the component could theoretically be used in a completely different product, it's a primitive.

---

## Step 2 — Create the Files

Create files using the correct naming conventions. UI primitives use PascalCase directories, while feature-specific groups use kebab-case directories. The PascalCase folder convention for primitives is defined here — if the project-wide `architecture.md` does not yet mention it, update it to keep all conventions in sync:

### UI Primitives Folder Structure
```
components/
└── ui/
    └── ComponentName/             ← PascalCase folder for primitives
        ├── ComponentName.tsx
        ├── ComponentName.module.css
        └── index.ts               ← re-exports the component
```

### Features Folder Structure
```
components/
└── features/
    └── feature-name/              ← kebab-case folder for features
        ├── ComponentName.tsx
        ├── ComponentName.module.css
        └── index.ts               ← re-exports the component
```

The `index.ts` file:
```ts
export { ComponentName } from './ComponentName';
```

---

## Step 3 — Write the Component

### Template

```tsx
import styles from './ComponentName.module.css';

interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement> {
  // define all props explicitly — no spreading unknown props
  prop1?: string;
}

export function ComponentName({ className, prop1, children, ...props }: ComponentNameProps) {
  // Safe merging of local module styles and incoming class overrides
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} {...props}>
      {children}
    </div>
  );
}
```

### Rules
- Named export only — never `export default`
- Props interface named `[ComponentName]Props`, defined above the component
- Root element uses `styles.root` from the CSS Module
- Primitive UI components must accept a `className` prop and safely merge it with `styles.root`
- Do not use inline `style` props except for dynamic computed values (e.g. canvas node positions)
- Do not hardcode any colour or typography value — use CSS custom properties from the token files

---

## Step 4 — Write the CSS Module

```css
/* ComponentName.module.css */

.root {
  /* Use design tokens exclusively for colors and typography */
  font-family: var(--font-body-medium-font-family);
  font-size: var(--font-body-medium-font-size);
  line-height: var(--font-body-medium-line-height);
  color: var(--color-on-surface);
  background-color: var(--color-surface);
  
  /* Fallback to static px layout measurements for values not defined in token properties (such as padding, margins, borders).
     Note: `design-system.md` may reference `--space-*` tokens — those do not exist in `variables.css` yet.
     Until they are added to the token pipeline, px fallbacks are the correct approach. */
  padding: 8px 16px;
  border-radius: 4px;
}
```

Rules:
- Class names in `camelCase`
- Use only valid, existing CSS custom properties from `variables.css`. Do not invent token variables.
- No hardcoded hex or named colours
- No `!important`
- No global selectors inside a module file

---

## Step 5 — Accessibility Checklist

Before completing any component, verify:

- [ ] Uses semantic HTML element (not a `<div>` where a `<button>` or `<label>` is correct)
- [ ] Interactive elements are keyboard-accessible (focusable, responds to Enter/Space)
- [ ] `aria-label` or visible label present on all interactive elements
- [ ] Error states include `aria-live` or `role="alert"` where appropriate
- [ ] Colour is not the only means of conveying information
- [ ] `<table>` elements use `<th>`, `scope`, and `aria-label` or `<caption>` (mandatory for `JourneyTable`)
- [ ] Loading/export states use `aria-busy="true"` on the triggering element (mandatory for `ExportButton`)
- [ ] Error or warning states set `aria-invalid` and trap focus within the error message for screen readers (mandatory for `DescriptionInput`)
- [ ] Animated or transitioning regions respect `prefers-reduced-motion: reduce` (mandatory for `FlowCanvas`)

---

## Component-Specific Notes

### `DescriptionInput`
- Must show a live character counter (e.g. `"143 / 500"`)
- Must visually indicate when below 30 chars (disabled state) or above 500 chars (error state)
- Must not allow form submission if character count is out of range

### `FlowCanvas`
- Wraps React Flow. Do not re-implement the canvas renderer.
- Node types (`process`, `decision`, `error`, `terminal`) must be registered via React Flow's `nodeTypes` prop — not styled inline.
- Happy path edges must use a distinct style passed via React Flow's `edgeTypes` or `style` prop sourced from a CSS token.
- Must respect `prefers-reduced-motion: reduce` — disable React Flow's pan/zoom transitions and node animation when the user's OS setting is active. Use a `matchMedia` query or React Flow's `panOnDrag` / `zoomOnScroll` configuration to skip animations on render.

### `ExportButton`
- Triggers PNG export via `html-to-image`.
- Must be disabled while the canvas is loading or an edit is in progress.
- Must show a loading state while the image is being generated.
- Label: "Download as PNG" — do not change this copy.

### `JourneyTable`
- Renders a three-column table: Step | User Action | System Response.
- Columns are fixed — do not add, remove, or rename them.
- Empty cells are not permitted — every row must have all three values.