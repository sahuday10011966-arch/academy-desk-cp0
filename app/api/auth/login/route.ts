import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { createSessionToken, publicUser, SESSION_COOKIE } from "@/lib/auth";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { User } from "@/lib/models";
import { assertLoginAllowed, loginSource, recordFailedLogin } from "@/lib/rate-limit";
import { validateLogin } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, validateLogin);
    await connectDb();
    const source = loginSource(request);
    await assertLoginAllowed(input.email, source);
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    const matches = user?.active ? await compare(input.password, user.passwordHash) : false;
    if (!user?.active || !matches) {
      await recordFailedLogin(input.email, source);
      throw new ApiError(401, "Email or password is incorrect.");
    }

    const authenticatedUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      academyId: user.academyId ? String(user.academyId) : null,
      playerId: user.playerId ? String(user.playerId) : null
    };
    const token = await createSessionToken(authenticatedUser.id);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return NextResponse.json({ user: publicUser(authenticatedUser) });
  } catch (error) {
    return errorResponse(error);
  }
}
