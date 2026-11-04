import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { academyIdOf } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { Player, PracticeSession, User } from "@/lib/models";
import { assertRole } from "@/lib/permissions";
import { validatePlayerInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let createdUserId: unknown;
  let createdPlayerId: unknown;
  try {
    const user = await requireUser();
    assertRole(user, "coach");
    const input = await readJson(request, validatePlayerInput);
    const academyId = academyIdOf(user);
    if (await User.exists({ email: input.email })) throw new ApiError(409, "An account already uses that email.");

    const userRecord = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, 12),
      role: "player",
      academyId
    });
    createdUserId = userRecord._id;
    const playerRecord = await Player.create({
      academyId,
      userId: userRecord._id,
      name: input.name,
      age: input.age,
      sport: input.sport
    });
    createdPlayerId = playerRecord._id;
    userRecord.playerId = playerRecord._id;
    await userRecord.save();

    await PracticeSession.updateMany(
      {
        academyId,
        sport: input.sport,
        status: "open",
        attendance: { $not: { $elemMatch: { playerId: playerRecord._id } } }
      },
      { $push: { attendance: { playerId: playerRecord._id, status: "absent" } } }
    );

    return NextResponse.json(
      { player: { id: String(playerRecord._id), name: playerRecord.name, age: playerRecord.age, sport: playerRecord.sport, email: input.email } },
      { status: 201 }
    );
  } catch (error) {
    if (createdUserId) await User.deleteOne({ _id: createdUserId }).catch(() => undefined);
    if (createdPlayerId) await Player.deleteOne({ _id: createdPlayerId }).catch(() => undefined);
    return errorResponse(error);
  }
}
