# Goen Net

Goen Net is a supportive mentoring network for visionary leaders who are committed to creating and innovating society. Modeled after EO Forum, it brings together 7–10 peers who meet quarterly to reflect on their work and lives, disclose real challenges, and learn from one another through candid, experience-based sharing. The structure emphasizes trust, punctuality, and absolute confidentiality so members can grow through self-awareness, gain practical perspectives for resolving issues, and build lasting bonds with fellow leaders.

## ✨ Key Capabilities

- **Updates board** – Capture member updates, flag urgent items, and surface the latest activity in real time.
- **Prioritization workflow** – Drag-and-drop prioritization queues backed by consistent scoring rules.
- **Meeting worksheets** – Moderator, presenter, observer, and coach worksheets that guide every role through the agenda.
- **Authenticated workspace** – Google sign-in via NextAuth keeps private data scoped to your organization only.
- **Turso-backed persistence** – A LibSQL database stores updates and meeting metadata with low-latency reads.

## 🧰 Tech Stack

- Next.js 15 (App Router, React Server Components, Turbopack)
- TypeScript + React 19
- NextAuth with Google OAuth2 provider
- Turso (LibSQL) for transactional storage
- MUI 5 for design system components
- Vitest + Playwright for automated testing
- ESLint 9 for linting

## 🚀 Getting Started

1. **Install dependencies**

   ```powershell
   npm install
   ```

2. **Create your environment file**

   ```powershell
   Copy-Item .env.example .env.local
   ```

   | Variable                                     | Description                                                                                                               |
   | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
   | `NEXTAUTH_URL`                               | Base URL of the app (e.g. `http://localhost:3000` during development).                                                    |
   | `NEXTAUTH_SECRET`                            | Random 32+ character string used to sign NextAuth sessions.                                                               |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`  | OAuth credentials from the Google Cloud Console.                                                                          |
   | `ALLOWED_EMAILS`                             | Comma- or whitespace-separated list of Google accounts permitted to sign in. Leave blank to allow any Google account.     |
   | `TURSO_DATABASE_URL` / `TURSO_DB_AUTH_TOKEN` | Connection details for the Turso (LibSQL) database. `TURSO_DB_URL` is also accepted if you prefer that naming convention. |

   **Optional helpers**

   | Variable            | Description                                                                                     |
   | ------------------- | ----------------------------------------------------------------------------------------------- |
   | `DEGRADE_TO_MEMORY` | Set to `1` to bypass Turso and use the in-memory datastore instead (helpful for local testing). |

3. **Run the development server**

   ```powershell
   npm run dev
   ```

   The app listens on `http://localhost:3000`. Unauthenticated users are redirected to `/signin` and sent back once Google sign-in succeeds.

## 📁 Project Structure (excerpt)

- `src/app/` – App Router entry point, layouts, and page routes.
- `src/app/(protected)/` – Authenticated areas including updates, prioritization, documentation, and worksheets.
- `src/app/api/` – Route handlers for authentication, sessions, and data APIs.
- `src/components/` – Shared UI elements such as the navbar, session provider, and sign-out button.
- `src/lib/` – Server utilities for auth, Turso client access, and helper functions.
- `tests/` – Vitest API tests and Playwright end-to-end suites.

## 🧪 Testing and Linting

- `npm run lint` – Run ESLint across the project.
- `npm run test:updates` – Execute Vitest API suites.
- `npm run test:playwright` – Launch Playwright end-to-end tests (requires `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD`).

## ☁️ Deployment

The project is optimized for Vercel. Configure every required variable from the table above (`NEXTAUTH_*`, `GOOGLE_CLIENT_*`, `ALLOWED_EMAILS`, and your preferred `TURSO_*` names) in the Vercel dashboard. Optional helpers such as `DEGRADE_TO_MEMORY` are rarely needed in production. Update your Google OAuth redirect URIs to match the production domain before going live.

## 🤝 Contributing

1. Fork and clone the repository.
2. Create a feature branch.
3. Run linting and tests before opening a pull request.

Issues and suggestions are welcome—please include as much context as possible to keep iterations fast.
