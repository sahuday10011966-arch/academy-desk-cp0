import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models";
import type { Actor, UserRole } from "@/lib/permissions";
import { ApiError } from "@/lib/http";

export const SESSION_COOKIE = "academy-desk-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export interface AuthenticatedUser extends Actor {
  name: string;
  email: string;
  role: UserRole;
}

function authKey(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || new TextEncoder().encode(value).byteLength < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(authKey());
}

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const key = authKey();
  let userId: string;
  try {
    const result = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof result.payload.sub !== "string") return null;
    userId = result.payload.sub;
  } catch {
    return null;
  }

  await connectDb();
  const user = await User.findById(userId)
    .select("name email role academyId playerId active")
    .lean();
  if (!user?.active || !["coach", "player", "scout"].includes(user.role)) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    academyId: user.academyId ? String(user.academyId) : null,
    playerId: user.playerId ? String(user.playerId) : null
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Sign in to continue.");
  return user;
}

export function publicUser(user: AuthenticatedUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
