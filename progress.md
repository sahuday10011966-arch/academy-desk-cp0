# Academy Desk progress

## Starting point

- The target GitHub repository was empty when inspected. The local checkout now has an initial commit and is configured with the requested repository as `origin`.
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
- `npm run build` — passed with Next.js 16.4.5 using webpack. In this sandbox the first build attempt failed because the generated `.next/server/app/_global-error.segments/_global-error` directory was absent and the worker could not create it; precreating that generated output directory allowed prerendering and build tracing to complete.
- `git diff --cached --check` — passed before the initial commit.
- Local production server — started. HTTP smoke requests and browser access to loopback timed out or were blocked by the sandbox, so those checks are incomplete.
- `npm run seed:demo` — attempted with development-only placeholders in `.env.local`; it did not seed records because no MongoDB server is reachable at the local URI.

## Workflow verification

- Core readiness, eligibility, attendance uniqueness, session locking, role policy, and input validation are covered by passing automated tests.
- Coach, Player, and Scout flows have not been verified end to end against a running MongoDB instance. No `MONGODB_URI` was configured, and no database was seeded.
- A local production server started, but loopback HTTP requests from the shell and browser tool could not reach it in this sandbox. UI/API smoke checks therefore remain incomplete.

## Deployment and data status

- Not deployed; no live URL exists yet.
- No production data was seeded or modified.
- A local commit was created before the 6:00 PM cutoff. Push was authorized but failed: Git for Windows could not start its credential helper shell (`NtCreateDirectoryObject` access denied), and the connected GitHub account reports no push permission. No remote commit was created.
- `.env.local` now exists with ignored, development-only placeholder values. The user authorized demo seeding, but no MongoDB server is reachable at the local URI, so no records were seeded. Point it to an isolated `academy_desk_demo` database before rerunning the seed.
- Deployment was authorized but not run. The open Vercel account has an existing `academy-desk` project linked to the separate older repository; that project was left untouched. No new Vercel project or production environment values are configured for this build.

## Remaining work

- User to configure a private development MongoDB database and `AUTH_SECRET` in `.env.local`; then seed `academy_desk_demo` and verify the Coach, Player, and Scout flows end to end.
- Run browser/API smoke checks in an environment that can reach the local Next.js server.
- Push the local commit through an environment with working GitHub write credentials, before the competition cutoff.
- Configure a new deployment project, MongoDB, and auth secrets before deploying. Provision real accounts through an authorized private process.
