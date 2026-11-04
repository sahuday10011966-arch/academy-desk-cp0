import { readinessStats } from "@/lib/domain";
import { ApiError } from "@/lib/http";

type IdLike = { toString(): string } | string;
type SessionRecord = {
  _id: IdLike;
  date: string;
  sport: string;
  status: "open" | "closed";
  closedAt?: Date | null;
  attendance: Array<{ playerId: IdLike; status: "present" | "absent" }>;
};
type MatchRecord = {
  _id: IdLike;
  sessionId: IdLike;
  date: string;
  sport: string;
  opponent: string;
  eligiblePlayerIds: IdLike[];
  scores: Array<{ playerId: IdLike; score: number }>;
};

export function idOf(value: IdLike): string {
  return value.toString();
}

export function statsForPlayer(playerId: string, sport: string, sessions: SessionRecord[], matches: MatchRecord[]) {
  const playerSessions = sessions.filter((session) => session.sport === sport && session.status === "closed");
  let sessionsHeld = 0;
  let sessionsPresent = 0;
  for (const session of playerSessions) {
    const row = session.attendance.find((entry) => idOf(entry.playerId) === playerId);
    if (!row) continue;
    sessionsHeld += 1;
    if (row.status === "present") sessionsPresent += 1;
  }
  const matchesPlayed = matches.filter(
    (match) => match.sport === sport && match.scores.some((score) => idOf(score.playerId) === playerId)
  ).length;
  return readinessStats(sessionsPresent, sessionsHeld, matchesPlayed);
}

export function sessionDto(session: SessionRecord) {
  return {
    id: idOf(session._id),
    date: session.date,
    sport: session.sport,
    status: session.status,
    closedAt: session.closedAt?.toISOString() ?? null,
    attendance: session.attendance.map((entry) => ({ playerId: idOf(entry.playerId), status: entry.status }))
  };
}

export function matchDto(match: MatchRecord) {
  return {
    id: idOf(match._id),
    sessionId: idOf(match.sessionId),
    date: match.date,
    sport: match.sport,
    opponent: match.opponent,
    eligiblePlayerIds: match.eligiblePlayerIds.map(idOf),
    scores: match.scores.map((entry) => ({ playerId: idOf(entry.playerId), score: entry.score }))
  };
}

export function academyIdOf(user: { academyId: string | null }): string {
  if (!user.academyId) throw new ApiError(403, "This account is not assigned to an academy.");
  return user.academyId;
}
