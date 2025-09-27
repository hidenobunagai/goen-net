# Goen Net

A web application that supports Goen Net moderation workflows by combining a React frontend, Express-based API routes, and Turso (libSQL) persistence. This repository packages the tooling, UI, and automation required to run planning sessions, capture updates, and coordinate presentations for members.

## Key Features

- **Secure authentication** powered by Google Sign-In with server-side session management.
- **Updates and prioritisation boards** to collect member status, filter by category or timeframe, and prepare presentations.
- **Moderator playbooks** that surface facilitation steps for different session formats.
- **Automated reminders** and cron endpoints to notify participants before meetings.
- **Serverless deployment ready** for Vercel, including API handlers and static assets generated through Vite.

## Tech Stack

| Area            | Technology                            |
| --------------- | ------------------------------------- |
| UI              | React 19, TypeScript, Vite            |
| Styling         | Material UI                           |
| Drag & Drop     | `@dnd-kit` suite                      |
| State / Routing | React Router, Context API             |
| Server Runtime  | Express on Node.js (Vercel functions) |
| Database        | Turso (libSQL) with Prisma            |
| Tooling         | ESLint, Turso CLI scripts             |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Turso account and Platform API token (for database provisioning)
- Google Cloud project configured for OAuth (Web client)

### Installation

```powershell
# clone your fork/repo first
npm install
```

### Environment Variables

Create a `.env.local` (web) and `.env` (server) as needed. The following values are required for production deployments:

| Variable                                     | Purpose                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Google Sign-In client ID used in API and SPA                                   |
| `SESSION_SECRET`                             | Random 32+ character key for signing session JWTs                              |
| `ALLOWED_EMAILS`                             | Comma-separated list of accounts allowed to sign in (leave empty to allow any) |
| `TURSO_DATABASE_URL`                         | Turso/libSQL database URL                                                      |
| `TURSO_DB_AUTH_TOKEN`                        | Turso auth token issued for the database                                       |
| `RESEND_API_KEY`                             | (Optional) API key for transactional email via Resend                          |
| `RESEND_FROM_EMAIL`                          | From address used by Resend                                                    |
| `CRON_REMINDER_SECRET`                       | Bearer token shared with scheduled reminder jobs                               |
| `SESSION_REMINDER_*`                         | Optional knobs for reminder lead time, timezone, and overrides                 |

> ⚠️ Never commit `.env*` files or generated auth tokens (for example `turso-db-token.json`) to version control. Keep secrets in your deployment platform or local environment only.

### Development Workflow

```powershell
npm run dev        # Start Vite dev server
npm run server     # Run the Express API locally
npm run build      # Create production build
```

Additional scripts under `scripts/` provide helpers for Turso provisioning (`turso-create-db.mjs`, `turso-create-db-token.mjs`, `turso-migrate.mjs`) and utilities such as connection tests.

### Database (Turso)

1. Export your Turso API token: `setx TURSO_API_TOKEN "<platform-token>"` (PowerShell: `$env:TURSO_API_TOKEN = "..."`).
2. Run `npm run turso:create` to provision the database (skip if it already exists).
3. Run `npm run turso:token` to mint a database auth token; the script writes a JSON file locally for subsequent scripts.
4. Execute `npm run turso:migrate` to apply Prisma migrations.

Refer to `prisma/schema.prisma` if you need to adjust the schema and regenerate the Prisma client.

### Deployment

The repository is optimised for Vercel:

1. Push the latest code to GitHub.
2. Create a Vercel project from this repository.
3. Configure the environment variables listed above for all environments.
4. Build command: `npm run build`; Output directory: `dist`.
5. API routes under `/api` become serverless functions; other routes serve the SPA via `index.html`.

### Security Guidelines

- Rotate Turso tokens, session secrets, and OAuth credentials on a regular schedule.
- Protect cron endpoints with `CRON_REMINDER_SECRET` and HTTPS-only access.
- Monitor authentication endpoints (`/api/auth/*`) and audit logs for anomalies.
- Use the provided scripts (or `pre-commit`/`husky`) to block accidental secret commits.

### Contributing

1. Fork and branch from `main`.
2. Run `npm run build` before opening a PR to ensure TypeScript and bundling succeed.
3. Follow the project coding style (ESLint/Prettier) and keep pull requests focused.
