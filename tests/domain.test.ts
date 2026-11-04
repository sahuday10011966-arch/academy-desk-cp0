import assert from "node:assert/strict";
import test from "node:test";
import { canScorePlayer, DomainRuleError, initialAttendance, readinessStats, updateAttendance } from "../lib/domain";

test("zero sessions produce 0% and never Ready", () => {
  assert.deepEqual(readinessStats(0, 0, 8), {
    sessionsHeld: 0,
    sessionsPresent: 0,
    attendancePercent: 0,
    matchesPlayed: 8,
    isReady: false
  });
});

test("exactly 75% attendance and two matches meets Ready criteria", () => {
  const stats = readinessStats(3, 4, 2);
  assert.equal(stats.attendancePercent, 75);
  assert.equal(stats.isReady, true);
});

test("less than 75% or fewer than two matches is not Ready", () => {
  assert.equal(readinessStats(2, 3, 2).isReady, false);
  assert.equal(readinessStats(3, 4, 1).isReady, false);
});

test("opening a session creates one Absent row per distinct player", () => {
  assert.deepEqual(initialAttendance(["p1", "p2", "p1"]), [
    { playerId: "p1", status: "absent" },
    { playerId: "p2", status: "absent" }
  ]);
});

test("attendance can change while open and duplicate roster rows are rejected", () => {
  const changed = updateAttendance("open", [{ playerId: "p1", status: "absent" }], "p1", "present");
  assert.deepEqual(changed, [{ playerId: "p1", status: "present" }]);
  assert.throws(
    () => updateAttendance("open", [{ playerId: "p1", status: "absent" }, { playerId: "p1", status: "present" }], "p1", "absent"),
    DomainRuleError
  );
});

test("closed sessions lock attendance", () => {
  assert.throws(() => updateAttendance("closed", [{ playerId: "p1", status: "present" }], "p1", "absent"), /closed/);
});

const eligibility = {
  matchDate: "2026-10-06",
  matchSport: "Football",
  sessionDate: "2026-10-06",
  sessionSport: "Football",
  sessionStatus: "closed" as const,
  playerId: "p1",
  eligiblePlayerIds: ["p1"],
  attendance: [{ playerId: "p1", status: "present" as const }]
};

test("only Present players from the linked closed session can be scored", () => {
  assert.equal(canScorePlayer(eligibility), true);
  assert.equal(canScorePlayer({ ...eligibility, attendance: [{ playerId: "p1", status: "absent" }] }), false);
  assert.equal(canScorePlayer({ ...eligibility, sessionStatus: "open" }), false);
  assert.equal(canScorePlayer({ ...eligibility, sessionDate: "2026-10-07" }), false);
  assert.equal(canScorePlayer({ ...eligibility, matchSport: "Cricket" }), false);
  assert.equal(canScorePlayer({ ...eligibility, eligiblePlayerIds: [] }), false);
});
