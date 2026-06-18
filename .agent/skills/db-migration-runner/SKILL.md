---
name: DB Migration Runner
description: Adding or modifying Prisma schema models and running database migrations safely.
---

# Skill: DB Migration Runner

## When To Use This Skill

Read this skill before:
- Adding a new model to `prisma/schema.prisma`
- Adding, removing, or renaming a field on an existing model
- Adding a new enum or changing an existing enum's values
- Running or rolling back a migration

---

## The Schema File

The single source of truth for the database is `prisma/schema.prisma`.

**Do not modify the database directly.** All schema changes go through Prisma migrations.

---

## Data Models Reference

These are the canonical models. Match these exactly — do not rename fields at the application layer.

### Session
```prisma
model Session {
  id         String      @id @default(cuid())
  ipAddress  String
  createdAt  DateTime    @default(now())
  flows      Flow[]
  rateLimits RateLimit[]
}
```

### Flow
```prisma
model Flow {
  id               String    @id @default(cuid())
  sessionId        String
  productName      String
  flowType         FlowType
  targetUsers      String[]
  keyAction        String
  rawDescription   String
  nodes            Json
  edges            Json
  userJourneySteps Json
  createdAt        DateTime  @default(now())
  lastEditedAt     DateTime?
  session          Session   @relation(fields: [sessionId], references: [id])
  editLogs         EditLog[]
}
```

### EditLog
```prisma
model EditLog {
  id            String   @id @default(cuid())
  flowId        String
  sessionId     String   // Denormalised for audit trail independence — survives session deletion
  editType      EditType
  previousValue String
  newValue      String
  editedAt      DateTime @default(now())
  flow          Flow     @relation(fields: [flowId], references: [id])
}
```

Note: `sessionId` on `EditLog` is a scalar field, not a foreign key. It is intentionally denormalised so edit logs survive even if the originating `Session` is deleted. Do not add a `@relation` to `Session` here.

### RateLimit
```prisma
model RateLimit {
  id              String   @id @default(cuid())
  ipAddress       String   @unique
  generationCount Int      @default(0)
  windowStart     DateTime
  windowExpires   DateTime
  sessionId       String
  session         Session  @relation(fields: [sessionId], references: [id])
}
```

### Enums
```prisma
enum FlowType {
  onboarding
  checkout
  sign_up_login
  full_product_flow
  custom
}

enum EditType {
  rename_node
  add_branch
  remove_step
  change_label
}
```

**Known cross-file constraint:** The `FlowType` enum value `sign_up_login` (snake_case, correct for Prisma) must match the TypeScript `FLOW_TYPES` constant in `.agent/rules/code-style.md`. Currently `code-style.md` has `sign-up-login` (kebab-case), which is wrong. If you modify either file, update the other to match. The Prisma enum is the source of truth — `code-style.md` should use `sign_up_login`.

---

## Prerequisites

Before running any migration, ensure:

1. **Prisma is installed** — `prisma` must be in `devDependencies` in `package.json`. If not, run:
   ```bash
   npm install -D prisma
   ```
2. **Prisma is initialised** — `prisma/schema.prisma` must exist with a valid `datasource` block and `generator client` block. If not, run:
   ```bash
   npx prisma init
   ```
   This creates the initial schema file and sets the `DATABASE_URL` in `.env`.
3. **Schema is formatted** — Before generating a migration, run:
   ```bash
   npx prisma format
   ```
   This validates the schema syntax and reorders fields/attributes consistently.

All migration files in `prisma/migrations/` must be committed to version control. They are the deployment artifact that `migrate deploy` applies in production.

---

## Running a Migration

### 1. Edit the schema

Make your changes in `prisma/schema.prisma` only.

### 2. Generate and apply the migration

```bash
# Development — generates SQL, applies it, regenerates client
npx prisma migrate dev --name <descriptive-name>

# Example
npx prisma migrate dev --name add-flow-title-field
```

Migration names must be descriptive and kebab-case. Never use generic names like `update` or `fix`.

### 3. Regenerate the Prisma client

```bash
npx prisma generate
```

This happens automatically after `migrate dev`, but run it manually if you pull a schema change from another branch.

### 4. Verify

```bash
npx prisma studio    # GUI — opens in browser
npx prisma validate  # CLI — checks schema validity, works in headless/CI
```

Open Prisma Studio or run `prisma validate` to confirm the schema change is reflected correctly before writing application code against it.

---

## Deploying Migrations

```bash
# Production — applies pending migrations without regenerating
npx prisma migrate deploy
```

Never run `migrate dev` in production. Always use `migrate deploy`.

---

## Rules

- **Backwards-compatible changes first.** When renaming a field: add the new field, migrate the data, then remove the old field in a separate migration. Do not rename in a single step.
- **Never delete a migration file** from `prisma/migrations/`. Migration history is permanent.
- **Never edit a migration SQL file** manually after it has been applied.
- **`Json` fields** (`nodes`, `edges`, `userJourneySteps`) must be validated at the application layer before write. Prisma does not validate JSON structure.
- **Enum changes are breaking.** Adding a new enum value is safe. Removing or renaming one requires a data migration plan.

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|---|
| Editing the DB directly via SQL | Always use Prisma migrations |
| Using `migrate dev` in production | Use `migrate deploy` in production |
| Naming migrations `update1`, `fix` | Use descriptive names: `add-session-expiry-field` |
| Forgetting `npx prisma generate` after pulling changes | Always regenerate after a schema change |
| Writing app code before verifying migration | Always check Prisma Studio or `prisma validate` first |
| Skipping `npx prisma init` on fresh checkout | Run `npx prisma init` to create the schema and datasource |
| Not committing migration files | Migration files in `prisma/migrations/` must be in version control |