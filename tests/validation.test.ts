import assert from "node:assert/strict";
import test from "node:test";
import { InputError, validateDate, validatePlayerInput, validateScoreInput, validateSessionInput } from "../lib/validation";

test("date validation accepts real calendar dates and rejects impossible dates", () => {
  assert.equal(validateDate("2024-02-29"), "2024-02-29");
  assert.throws(() => validateDate("2025-02-29"), InputError);
  assert.throws(() => validateDate("2025/02/28"), InputError);
});

test("player input is normalized and bounded", () => {
  const result = validatePlayerInput({ name: "  Mira Sen ", age: "15", sport: " Football ", email: "MIRA@EXAMPLE.COM", password: "correct-horse-1" });
  assert.deepEqual(result, { name: "Mira Sen", age: 15, sport: "Football", email: "mira@example.com", password: "correct-horse-1" });
  assert.throws(() => validatePlayerInput({ name: "M", age: 4, sport: "F", email: "bad", password: "short" }), InputError);
});

test("session data requires a valid date and sport", () => {
  assert.deepEqual(validateSessionInput({ date: "2026-11-04", sport: "Football" }), { date: "2026-11-04", sport: "Football" });
  assert.throws(() => validateSessionInput({ date: "2026-13-04", sport: "Football" }), InputError);
});

test("scores stay within 0 to 100 and reject blank values", () => {
  assert.equal(validateScoreInput({ playerId: "p1", score: "87.5" }).score, 87.5);
  assert.throws(() => validateScoreInput({ playerId: "p1", score: "" }), InputError);
  assert.throws(() => validateScoreInput({ playerId: "p1", score: 100.01 }), InputError);
  assert.throws(() => validateScoreInput({ playerId: "p1", score: "1.234" }), InputError);
});
