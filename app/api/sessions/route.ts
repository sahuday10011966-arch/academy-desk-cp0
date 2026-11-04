import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { academyIdOf, sessionDto } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { initialAttendance } from "@/lib/domain";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { Player, PracticeSession } from "@/lib/models";
import { assertRole } from "@/lib/permissions";
import { validateSessionInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRole(user, "coach");
    const input = await readJson(request, validateSessionInput);
    const academyId = academyIdOf(user);
    const players = await Player.find({ academyId, sport: input.sport }).select("_id").lean();
    if (players.length === 0) throw new ApiError(409, `Add a ${input.sport} player before opening a session.`);

    const session = await PracticeSession.create({
      academyId,
      createdBy: user.id,
      date: input.date,
      sport: input.sport,
      status: "open",
      attendance: initialAttendance(players.map((player) => String(player._id))).map((entry) => ({
        playerId: new Types.ObjectId(entry.playerId),
        status: entry.status
      }))
    });
    return NextResponse.json({ session: sessionDto(session) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
