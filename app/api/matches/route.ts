import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { academyIdOf, matchDto } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { Match, Player, PracticeSession } from "@/lib/models";
import { assertRole } from "@/lib/permissions";
import { validateMatchInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRole(user, "coach");
    const input = await readJson(request, validateMatchInput);
    if (!Types.ObjectId.isValid(input.sessionId)) throw new ApiError(400, "Choose a valid closed practice session.");
    const academyId = academyIdOf(user);
    const session = await PracticeSession.findOne({ _id: input.sessionId, academyId }).lean();
    if (session?.status !== "closed") throw new ApiError(409, "Close the practice session before recording its match.");
    if (session.date !== input.date || session.sport !== input.sport) {
      throw new ApiError(400, "Match date and sport must match the linked practice session.");
    }

    const attendance = session.attendance as Array<{ playerId: Types.ObjectId; status: "present" | "absent" }>;
    const eligiblePlayerIds: Types.ObjectId[] = [...new Set(
      attendance
        .filter((entry) => entry.status === "present")
        .map((entry) => String(entry.playerId))
    )].map((id) => new Types.ObjectId(id));
    if (eligiblePlayerIds.length > 0) {
      const validCount = await Player.countDocuments({ _id: { $in: eligiblePlayerIds }, academyId, sport: session.sport });
      if (validCount !== eligiblePlayerIds.length) throw new ApiError(409, "The practice roster is no longer valid.");
    }

    const match = await Match.create({
      academyId,
      createdBy: user.id,
      sessionId: new Types.ObjectId(String(session._id)),
      date: session.date,
      sport: session.sport,
      opponent: input.opponent,
      eligiblePlayerIds,
      scores: []
    });
    return NextResponse.json({ match: matchDto(match) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
