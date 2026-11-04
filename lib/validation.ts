import type { AttendanceStatus } from "./domain";

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

const CONTROL_CHARACTERS = /\p{Cc}/u;

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Send a JSON object.");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new InputError(`${label} is required.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || CONTROL_CHARACTERS.test(trimmed)) {
    throw new InputError(`${label} must be between 1 and ${maxLength} characters.`);
  }
  return trimmed;
}

export function normalizeEmail(value: unknown): string {
  const email = requiredString(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid email address.");
  return email;
}

export function validateLogin(value: unknown): { email: string; password: string } {
  const body = asObject(value);
  const email = normalizeEmail(body.email);
  if (typeof body.password !== "string" || body.password.length < 1 || body.password.length > 72) {
    throw new InputError("Enter your password.");
  }
  return { email, password: body.password };
}

export function validatePlayerInput(value: unknown) {
  const body = asObject(value);
  const name = requiredString(body.name, "Name", 80);
  if (name.length < 2) throw new InputError("Name must be at least 2 characters.");
  const age = Number(body.age);
  if (!Number.isInteger(age) || age < 5 || age > 80) throw new InputError("Age must be a whole number from 5 to 80.");
  const sport = requiredString(body.sport, "Sport", 32);
  if (sport.length < 2) throw new InputError("Sport must be at least 2 characters.");
  const email = normalizeEmail(body.email);
  if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 72) {
    throw new InputError("Player password must be between 12 and 72 characters.");
  }
  return { name, age, sport, email, password: body.password };
}

export function validateSessionInput(value: unknown) {
  const body = asObject(value);
  return {
    date: validateDate(body.date),
    sport: requiredString(body.sport, "Sport", 32)
  };
}

export function validateAttendanceInput(value: unknown) {
  const body = asObject(value);
  const playerId = requiredString(body.playerId, "Player", 64);
  if (body.status !== "present" && body.status !== "absent") throw new InputError("Attendance must be Present or Absent.");
  return { playerId, status: body.status as AttendanceStatus };
}

export function validateSessionAction(value: unknown) {
  const body = asObject(value);
  if (body.action === "close") return { action: "close" as const };
  if (body.action === "attendance") {
    const attendance = validateAttendanceInput(body);
    return { action: "attendance" as const, ...attendance };
  }
  throw new InputError("Choose a valid session action.");
}

export function validateMatchInput(value: unknown) {
  const body = asObject(value);
  return {
    sessionId: requiredString(body.sessionId, "Practice session", 64),
    date: validateDate(body.date),
    sport: requiredString(body.sport, "Sport", 32),
    opponent: requiredString(body.opponent, "Opponent", 80)
  };
}

export function validateScoreInput(value: unknown) {
  const body = asObject(value);
  const playerId = requiredString(body.playerId, "Player", 64);
  if ((typeof body.score !== "number" && typeof body.score !== "string") || (typeof body.score === "string" && body.score.trim() === "")) {
    throw new InputError("Score must be from 0 to 100, with at most one decimal place.");
  }
  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0 || score > 100 || Math.round(score * 10) !== score * 10) {
    throw new InputError("Score must be from 0 to 100, with at most one decimal place.");
  }
  return { playerId, score };
}

export function validateDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InputError("Choose a valid calendar date.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new InputError("Choose a valid calendar date.");
  }
  return value;
}
