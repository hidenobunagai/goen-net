# Goen Net — Project Guidelines

Goen Net is a private alumni dashboard for peer forum mentoring, updates sharing, session planning, worksheets, and prioritization.

## 🧰 Tech Stack & Conventions

- **Runtime & Package Manager**: `bun` exclusively (never use npm or pnpm).
- **Framework**: Next.js 16 (App Router, React Server Components, Turbopack).
- **Language**: TypeScript (strict mode, no placeholder comments like `// ... existing code ...`).
- **Authentication**: NextAuth with Google OAuth2 (`ALLOWED_EMAILS` whitelist check).
- **Database**: Turso (LibSQL client) with in-memory fallback support (`DEGRADE_TO_MEMORY=1`).
- **UI & Styling**: MUI 5 (`@mui/material`, `@emotion/react`, `@emotion/styled`), `@dnd-kit` for drag-and-drop.
- **State & Data Fetching**: TanStack React Query v5.
- **Environment Variables**: Managed via `dotenvx`. Do not commit plaintext `.env` files.

## 📁 Key Directory Structure

- `src/app/`: App Router routes and page definitions.
  - `src/app/(protected)/`: Authenticated area (updates, prioritization, worksheets, documentation).
  - `src/app/api/`: API route handlers (`updates`, `worksheets`, `prioritization`, `next-session`, `cron`).
- `src/components/`: Reusable client and server UI components (`navbar`, `theme-registry`, providers).
- `src/hooks/`: Custom React hooks (`use-worksheet`, `use-document-title`).
- `src/lib/`: Core server and client utilities:
  - `turso.ts`: Turso database client and execution helpers.
  - `session.ts`: NextAuth server session resolution (`requireUserSession`, `getOptionalUserSession`).
  - `rate-limit.ts`: Persistent and in-memory rate limiting.
  - `logger.ts`: Structured JSON logging.
  - `config.ts`: Zod-validated environment configuration.
- `db-schema.sql`: Database schema definition for Turso.
- `db-migrations/`: Incremental database migration scripts.
- `tests/`: Vitest unit/integration tests and Playwright E2E suites.

## 🧪 Testing & Quality Commands

- `bun run test`: Run all unit and integration tests (Vitest).
- `bun run lint`: Run ESLint.
- `bun run format:check`: Check code formatting with Prettier.
- `bun run build`: Test production Next.js build.
- `bun run test:playwright`: Run Playwright E2E suite.

## 🔒 Security & Code Standards

1. **Authentication Guardrails**:
   - Route protection proxy is in `src/proxy.ts` (Next.js 16 proxy convention).
   - `src/app/(protected)/layout.tsx` enforces `await requireUserSession()`.
   - API routes must verify session before performing data operations.
2. **Database Operations**:
   - Always parameterize SQL queries with `@libsql/client` `InArgs`.
   - Maintain database schema in `db-schema.sql` and `db-migrations/`. Do not execute runtime `CREATE TABLE` inside regular API queries.
3. **Commits**:
   - Make atomic, incremental git commits after each meaningful change (`git commit -m "..."`).
