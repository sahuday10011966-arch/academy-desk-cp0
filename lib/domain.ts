export type AttendanceStatus = "present" | "absent";
export type SessionStatus = "open" | "closed";

export interface AttendanceEntry {
  playerId: string;
  status: AttendanceStatus;
}

export interface ReadinessStats {
  sessionsHeld: number;
  sessionsPresent: number;
  attendancePercent: number;
  matchesPlayed: number;
  isReady: boolean;
}

export class DomainRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainRuleError";
  }
}

export function readinessStats(sessionsPresent: number, sessionsHeld: number, matchesPlayed: number): ReadinessStats {
  if (![sessionsPresent, sessionsHeld, matchesPlayed].every(Number.isInteger)) {
    throw new DomainRuleError("Readiness counts must be whole numbers.");
  }
  if (sessionsHeld < 0 || sessionsPresent < 0 || sessionsPresent > sessionsHeld || matchesPlayed < 0) {
    throw new DomainRuleError("Readiness counts are outside their valid range.");
  }

  const attendancePercent = sessionsHeld === 0 ? 0 : Math.round((sessionsPresent / sessionsHeld) * 1000) / 10;
  const meetsAttendance = sessionsHeld > 0 && sessionsPresent * 4 >= sessionsHeld * 3;

  return {
    sessionsHeld,
    sessionsPresent,
    attendancePercent,
    matchesPlayed,
    isReady: meetsAttendance && matchesPlayed >= 2
  };
}

export function initialAttendance(playerIds: readonly string[]): AttendanceEntry[] {
  return [...new Set(playerIds)].map((playerId) => ({ playerId, status: "absent" }));
}

export function updateAttendance(
  sessionStatus: SessionStatus,
  attendance: readonly AttendanceEntry[],
  playerId: string,
  status: AttendanceStatus
): AttendanceEntry[] {
  if (sessionStatus !== "open") throw new DomainRuleError("This session is closed and attendance is locked.");
  const matches = attendance.filter((entry) => entry.playerId === playerId);
  if (matches.length !== 1) throw new DomainRuleError("Player must have exactly one attendance entry in this session.");
  return attendance.map((entry) => (entry.playerId === playerId ? { ...entry, status } : { ...entry }));
}

export interface MatchEligibilityContext {
  matchDate: string;
  matchSport: string;
  sessionDate: string;
  sessionSport: string;
  sessionStatus: SessionStatus;
  playerId: string;
  eligiblePlayerIds: readonly string[];
  attendance: readonly AttendanceEntry[];
}

export function canScorePlayer(context: MatchEligibilityContext): boolean {
  if (context.sessionStatus !== "closed") return false;
  if (context.matchDate !== context.sessionDate || context.matchSport !== context.sessionSport) return false;
  if (!context.eligiblePlayerIds.includes(context.playerId)) return false;
  const entries = context.attendance.filter((entry) => entry.playerId === context.playerId);
  return entries.length === 1 && entries[0].status === "present";
}
