# Academy Desk progress

## Starting point

- The originally requested GitHub repository was empty when inspected. The local checkout has an initial commit and now targets the newly created repository under the authenticated account.
- The separate older Academy Desk checkout belongs to a different repository and was not modified or copied.
- No competition screenshots were available in the checkout or task context, so the written requirements were used as the product source of truth. The user later confirmed the competition window is 11:00 AM–6:00 PM local time.
- At the user's request, created a separate public repository `sahuday10011966-arch/academy-desk-cp0`; it is distinct from and does not modify the older Academy Desk repository.

## Implemented

- Built a responsive Next.js App Router interface for Coach, Player, and Scout workflows.
- Added MongoDB/Mongoose models, signed HTTP-only cookie authentication, password hashing, server-side role checks, academy scoping, request validation, and login rate limiting.
- Added coach APIs and workflows to add players, open practice sessions, record attendance, close sessions, create match sheets, and save scores.
- Added player-only self records and server-filtered Scout views that include only players meeting readiness criteria.
- Attendance counts closed sessions for a player's sport when an attendance row exists. Zero sessions yields 0% and not Ready; exactly 75% qualifies; Ready also requires at least two matches.
- Attendance rows are unique per player/session, closed sessions reject edits, and match rosters are limited to players marked Present at the linked closed session. Scores are limited to 0–100 with one decimal place.
- Added a demo seed script restricted to an explicitly opted-in `academy_desk_demo` database and non-production environments.
- Added focused domain, authorization, and validation tests, plus setup and deployment guidance in `README.md`.

## Checks run

- `npm install` — completed.
- `npm run test` — passed, 14 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed with Biome across 33 files.
- `npm audit` — passed with 0 reported vulnerabilities.
- `npm run build` — passed with Next.js 16.4.5 using webpack. Two attempts hit sandbox `EPERM` errors while Next.js created generated `.next/types/app/api/auth` and `.next/server/app/_global-error.segments/_global-error` directories; precreating those ignored build-output directories allowed prerendering and build tracing to complete.
- `git diff --cached --check` — passed before the initial commit.
- Local production server — started. HTTP smoke requests and browser access to loopback timed out or were blocked by the sandbox, so those checks are incomplete.
- `npm run seed:demo` — attempted with development-only placeholders in `.env.local`; it did not seed records because no MongoDB server is reachable at the local URI.

## Workflow verification

- Core readiness, eligibility, attendance uniqueness, session locking, role policy, and input validation are covered by passing automated tests.
- Coach, Player, and Scout flows have not been verified end to end against a running MongoDB instance. `.env.local` has a local placeholder URI, but no database server is reachable and no records were seeded.
- A local production server started, but loopback HTTP requests from the shell and browser tool could not reach it in this sandbox. UI/API smoke checks therefore remain incomplete.

## Deployment and data status

- Not deployed; no live URL exists yet.
- No production data was seeded or modified.
- The Git CLI push was blocked by the sandbox credential helper. The requested new public repository was created under the authenticated account and populated through the GitHub connection. Its `main` commit has the exact local project tree; the remote history includes an initial README setup commit, so the remote commit SHA differs from the local commit.
- `.env.local` now exists with ignored, development-only placeholder values. The user authorized demo seeding, but no MongoDB server is reachable at the local URI, so no records were seeded. Point it to an isolated `academy_desk_demo` database before rerunning the seed.
- Created a new Vercel Next.js project shell named `academy-desk-cp0` in the existing Vercel team. No deployment or production environment variables were added. Linking the new GitHub repository is pending installation of Vercel's GitHub App; the account's email-based sudo check failed. The direct public-repository fallback opens a clone flow that would create a second private repository, so it was not submitted.
- The existing Vercel `academy-desk` project linked to the separate older repository was left untouched. The new project has no live URL yet.

## Remaining work

- User to configure a private development MongoDB database and `AUTH_SECRET` in `.env.local`; then seed `academy_desk_demo` and verify the Coach, Player, and Scout flows end to end.
- Run browser/API smoke checks in an environment that can reach the local Next.js server.
- Complete GitHub's email sudo check, grant Vercel access only to `academy-desk-cp0`, and connect that repository to the new Vercel project.
- Add production `MONGODB_URI` and `AUTH_SECRET` directly in Vercel, then deploy. Configure a reachable development MongoDB database to seed demo accounts; provision real production accounts through an authorized private process.

