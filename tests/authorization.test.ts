import assert from "node:assert/strict";
import test from "node:test";
import { assertCanReadPlayer, assertRole, AuthorizationError, canReadPlayer, type Actor } from "../lib/permissions";

const coach: Actor = { id: "coach-1", role: "coach", academyId: "academy-1", playerId: null };
const player: Actor = { id: "user-1", role: "player", academyId: "academy-1", playerId: "player-1" };
const scout: Actor = { id: "scout-1", role: "scout", academyId: "academy-1", playerId: null };

test("role checks reject a different role and an unassigned academy", () => {
  assert.doesNotThrow(() => assertRole(coach, "coach"));
  assert.throws(() => assertRole(player, "coach"), AuthorizationError);
  assert.throws(() => assertRole({ ...coach, academyId: null }, "coach"), AuthorizationError);
});

test("coach and player reads are academy-scoped; players see only their own record", () => {
  const own = { id: "player-1", academyId: "academy-1", ready: false };
  const other = { id: "player-2", academyId: "academy-1", ready: true };
  assert.equal(canReadPlayer(coach, other), true);
  assert.equal(canReadPlayer({ ...coach, academyId: "academy-2" }, other), false);
  assert.equal(canReadPlayer(player, own), true);
  assert.equal(canReadPlayer(player, other), false);
  assert.throws(() => assertCanReadPlayer(player, other), AuthorizationError);
});

test("scouts can read only Ready players in their own academy", () => {
  assert.equal(canReadPlayer(scout, { id: "player-1", academyId: "academy-1", ready: true }), true);
  assert.equal(canReadPlayer(scout, { id: "player-2", academyId: "academy-1", ready: false }), false);
  assert.equal(canReadPlayer(scout, { id: "player-3", academyId: "academy-2", ready: true }), false);
});
