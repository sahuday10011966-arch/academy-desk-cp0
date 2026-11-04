import { createHmac } from "node:crypto";
import { LoginAttempt } from "@/lib/models";
import { ApiError } from "@/lib/http";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function bucketKey(kind: "email" | "source", value: string, bucket: number): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  const digest = createHmac("sha256", secret).update(`${kind}:${value}`).digest("hex");
  return `${digest}:${bucket}`;
}

function counterKeys(email: string, source: string, now: number): { keys: string[]; expiresAt: Date } {
  const bucket = Math.floor(now / WINDOW_MS);
  return {
    keys: [bucketKey("email", email, bucket), bucketKey("source", source, bucket)],
    expiresAt: new Date((bucket + 2) * WINDOW_MS)
  };
}

export async function assertLoginAllowed(email: string, source: string, now = Date.now()): Promise<void> {
  const { keys } = counterKeys(email, source, now);
  const attempts = await LoginAttempt.find({ key: { $in: keys } }).select("count").lean();
  if (attempts.some((attempt) => attempt.count >= MAX_FAILURES)) {
    throw new ApiError(429, "Too many unsuccessful attempts. Try again in a few minutes.");
  }
}

export async function recordFailedLogin(email: string, source: string, now = Date.now()): Promise<void> {
  const { keys, expiresAt } = counterKeys(email, source, now);
  for (const key of keys) {
    try {
      await LoginAttempt.findOneAndUpdate(
        { key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true }
      );
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) throw error;
      await LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
    }
  }
}

export function loginSource(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return forwarded || real || "unknown-source";
}
