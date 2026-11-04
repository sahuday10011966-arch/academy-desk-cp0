# Academy Desk

Academy Desk is a workspace for one sports academy in Dumka. Coaches manage players, practice attendance, matches, and scores. Players see their own record. Scouts see only players who meet the readiness criteria.

The repository was empty when work began. This build uses Next.js App Router, MongoDB with Mongoose, bcrypt password hashes, and signed HTTP-only session cookies. No old Academy Desk code or data is required.

## Local setup

Use Node.js 20.19 or newer. Create a MongoDB database named `academy_desk_demo` for local development, then copy `.env.example` to `.env.local` and set:

```env
MONGODB_URI=<connection string for academy_desk_demo>
AUTH_SECRET=<at least 32 random characters; keep private>
```

Generate the signing key locally with a password manager or `openssl rand -base64 32`. Keep `.env.local` out of Git and use a different key for each environment.

Install and run the checks:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

To create a local demo academy, add the demo-only values below to `.env.local`. Choose private passwords of at least 12 characters. The player accounts use the same `DEMO_PLAYER_PASSWORD`; Neel and Kabir receive plus-address aliases of `DEMO_PLAYER_EMAIL`.

```env
ALLOW_DEMO_SEED=true
DEMO_DB_NAME=academy_desk_demo
DEMO_COACH_EMAIL=<coach email>
DEMO_COACH_PASSWORD=<private demo password>
DEMO_SCOUT_EMAIL=<scout email>
DEMO_SCOUT_PASSWORD=<private demo password>
DEMO_PLAYER_EMAIL=<player email>
DEMO_PLAYER_PASSWORD=<private demo password>
```

Then run `npm run seed:demo` and start the app with `npm run dev`. The seed script checks the environment, database name, and an explicit opt-in before it deletes and recreates demo records. It refuses to run when `NODE_ENV=production` or when the connection string does not target `academy_desk_demo`. Keep this demo database separate from real academy data. Do not set `ALLOW_DEMO_SEED=true` in a deployed environment.

## Product rules

- A player has a name, age, sport, and sign-in account. Only a coach can add player accounts.
- Opening a practice session records one Absent row for each current player in that sport. Players added while a matching session is open are added as Absent.
- Attendance can change while a session is open. Closing it atomically locks attendance; later edits return a conflict.
- A match is linked to a closed practice session on the same date and sport. Its eligible player list is a snapshot of players marked Present in that session. Only those players can receive scores.
- Scores use a 0–100 scale and allow one decimal place. Saving a score again updates that player’s existing score instead of creating a duplicate.
- Attendance uses a player’s closed sessions in their sport that contain an attendance row. Zero sessions means 0% and never Ready. Ready requires at least 75% attendance and scores in at least two matches. Exactly 75% qualifies.
- A player added after an older session does not receive an attendance row for it, so that session is not counted in the player’s denominator.

## Access boundaries

Every protected API request verifies the signed cookie and reloads the account from MongoDB. The role and academy scope come from that database record, not from browser state or JWT role claims.

- Coaches can read and change records in their own academy.
- Players receive only their own profile, attendance, and match scores.
- Scouts receive only profiles whose readiness is calculated as Ready on the server. Other players are not included in the scout response.
- State-changing JSON requests reject cross-origin browser requests, oversized bodies, malformed objects, and invalid fields. Password hashes and signing keys stay server-side.
- Failed sign-in attempts are rate-limited with short-lived, HMAC-keyed counters; raw email addresses and source addresses are not stored for that counter.

## Data and deployment

This is a fresh schema with no legacy data migration. Mongoose creates the declared indexes as models start. Before importing any existing records, back up the database and write a migration that checks unique player accounts and one attendance row per player per session.

The app can run as a Node.js Next.js application on Vercel or another Node host. Configure `MONGODB_URI` and `AUTH_SECRET` in the host’s environment settings, using separate databases and signing keys for Preview and Production. Keep the database network allowlist scoped to the application. Build with `npm run build` and serve with `npm run start`.

No deployment has been created, no production database has been seeded or changed, and no GitHub changes have been pushed. Account provisioning for a real production academy should be completed through an authorized private process; the demo seed script is not intended for production.

## API routes

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/dashboard` — role-scoped dashboard payload
- `POST /api/players` — coach adds a player and login account
- `POST /api/sessions`, `PATCH /api/sessions/:sessionId` — open a session, change attendance, or close it
- `POST /api/matches`, `POST /api/matches/:matchId/scores` — create a match sheet and save eligible player scores
- `GET /api/health` — generic database availability status

