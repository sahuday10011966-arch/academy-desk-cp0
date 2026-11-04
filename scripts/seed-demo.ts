import { hash } from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { Academy, Match, Player, PracticeSession, User } from "../lib/models";
import { connectDb } from "../lib/db";

const DEMO_DATABASE = "academy_desk_demo";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set before seeding the demo database.`);
  return value;
}

function databaseFromUri(uri: string): string {
  const browserCompatibleUri = uri.replace(/^mongodb\+srv:\/\//, "https://").replace(/^mongodb:\/\//, "http://");
  try {
    return decodeURIComponent(new URL(browserCompatibleUri).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("MONGODB_URI must include a database name in its path.");
  }
}

function aliasEmail(base: string, suffix: string): string {
  const at = base.lastIndexOf("@");
  if (at < 1) throw new Error("DEMO_PLAYER_EMAIL must be a valid email address.");
  return `${base.slice(0, at)}+${suffix}${base.slice(at)}`.toLowerCase();
}

async function createAccount(input: { name: string; email: string; password: string; role: "coach" | "player" | "scout"; academyId: Types.ObjectId }) {
  const account = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: await hash(input.password, 12),
    role: input.role,
    academyId: input.academyId
  });
  return account;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production.");
  if (process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Set ALLOW_DEMO_SEED=true only for an isolated demo setup.");
  if (requiredEnv("DEMO_DB_NAME") !== DEMO_DATABASE) throw new Error(`DEMO_DB_NAME must be ${DEMO_DATABASE}.`);
  const uri = requiredEnv("MONGODB_URI");
  if (databaseFromUri(uri) !== DEMO_DATABASE) throw new Error(`MONGODB_URI must point to the ${DEMO_DATABASE} database.`);

  const coachEmail = requiredEnv("DEMO_COACH_EMAIL").toLowerCase();
  const coachPassword = requiredEnv("DEMO_COACH_PASSWORD");
  const scoutEmail = requiredEnv("DEMO_SCOUT_EMAIL").toLowerCase();
  const scoutPassword = requiredEnv("DEMO_SCOUT_PASSWORD");
  const playerEmail = requiredEnv("DEMO_PLAYER_EMAIL").toLowerCase();
  const playerPassword = requiredEnv("DEMO_PLAYER_PASSWORD");
  for (const [key, value] of [["DEMO_COACH_PASSWORD", coachPassword], ["DEMO_SCOUT_PASSWORD", scoutPassword], ["DEMO_PLAYER_PASSWORD", playerPassword]] as const) {
    if (value.length < 12 || value.length > 72) throw new Error(`${key} must be 12 to 72 characters.`);
  }
  const emails = [coachEmail, scoutEmail, playerEmail, aliasEmail(playerEmail, "neel"), aliasEmail(playerEmail, "kabir")];
  if (new Set(emails).size !== emails.length) throw new Error("Demo account emails must be unique.");

  await connectDb();
  const academy = await Academy.findOneAndUpdate(
    { name: "Dumka Academy" },
    { $set: { name: "Dumka Academy", location: "Dumka, Jharkhand" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const academyId = academy._id as Types.ObjectId;

  // All cleanup is restricted to this academy in the explicitly named demo database.
  await Match.deleteMany({ academyId });
  await PracticeSession.deleteMany({ academyId });
  await Player.deleteMany({ academyId });
  await User.deleteMany({ academyId });

  const coachAccount = await createAccount({ name: "Academy Coach", email: coachEmail, password: coachPassword, role: "coach", academyId });
  const coachId = new Types.ObjectId(String(coachAccount._id));
  await createAccount({ name: "Academy Scout", email: scoutEmail, password: scoutPassword, role: "scout", academyId });

  const playerInputs = [
    { name: "Aarav Mehta", age: 16, email: playerEmail },
    { name: "Neel Soren", age: 15, email: aliasEmail(playerEmail, "neel") },
    { name: "Kabir Murmu", age: 17, email: aliasEmail(playerEmail, "kabir") }
  ];
  const playerIds: Types.ObjectId[] = [];
  for (const input of playerInputs) {
    const account = await createAccount({ name: input.name, email: input.email, password: playerPassword, role: "player", academyId });
    const player = await Player.create({ academyId, userId: account._id, name: input.name, age: input.age, sport: "Football" });
    account.playerId = player._id;
    await account.save();
    playerIds.push(player._id as Types.ObjectId);
  }

  const attendanceBySession: Array<Array<"present" | "absent">> = [
    ["present", "present", "present"],
    ["present", "absent", "present"],
    ["absent", "present", "absent"],
    ["present", "present", "absent"]
  ];
  const dates = ["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"];
  type SeedSession = { _id: Types.ObjectId; date: string; sport: string; attendance: Array<{ playerId: Types.ObjectId; status: "present" | "absent" }> };
  const sessions: SeedSession[] = [];
  for (let index = 0; index < dates.length; index += 1) {
    const created = await PracticeSession.create({
      academyId,
      createdBy: coachId,
      date: dates[index],
      sport: "Football",
      status: "closed",
      closedAt: new Date(`${dates[index]}T18:00:00.000Z`),
      attendance: playerIds.map((playerId, playerIndex) => ({ playerId, status: attendanceBySession[index][playerIndex] }))
    });
    sessions.push(created as unknown as SeedSession);
  }

  const fixtures = [
    { sessionIndex: 0, opponent: "Baidyanath XI", scores: [88, 76, 81] },
    { sessionIndex: 1, opponent: "Dumka Athletic", scores: [92, null, 85] }
  ];
  for (const fixture of fixtures) {
    const session = sessions[fixture.sessionIndex];
    const eligible = session.attendance.filter((entry) => entry.status === "present").map((entry) => entry.playerId);
    const scores = eligible.map((playerId) => {
      const index = playerIds.findIndex((candidate) => String(candidate) === String(playerId));
      return { playerId, score: fixture.scores[index] ?? 0, updatedAt: new Date() };
    });
    await Match.create({
      academyId,
      createdBy: coachId,
      sessionId: session._id,
      date: session.date,
      sport: session.sport,
      opponent: fixture.opponent,
      eligiblePlayerIds: eligible,
      scores
    });
  }

  await mongoose.disconnect();
  process.stdout.write("Demo workspace seeded for Dumka Academy.\n");
}

main().catch(async () => {
  await mongoose.disconnect().catch(() => undefined);
  process.stderr.write("Demo seeding stopped. Check the demo database guard and required environment variables.\n");
  process.exitCode = 1;
});
