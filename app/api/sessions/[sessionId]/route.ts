import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { academyIdOf, sessionDto } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { Player, PracticeSession } from "@/lib/models";
import { assertRole } from "@/lib/permissions";
import { validateSessionAction } from "@/lib/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ sessionId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    assertRole(user, "coach");
    const { sessionId } = await context.params;
    if (!Types.ObjectId.isValid(sessionId)) throw new ApiError(400, "Session was not found.");
    const action = await readJson(request, validateSessionAction);
    const academyId = academyIdOf(user);
    const session = await PracticeSession.findOne({ _id: sessionId, academyId });
    if (!session) throw new ApiError(404, "Session was not found.");

    if (action.action === "close") {
      const closed = await PracticeSession.findOneAndUpdate(
        { _id: sessionId, academyId, status: "open" },
        { $set: { status: "closed", closedAt: new Date() } },
        { new: true }
      );
      if (!closed) throw new ApiError(409, "This session is already closed.");
      return NextResponse.json({ session: sessionDto(closed) });
    }

    const playerId = new Types.ObjectId(action.playerId);
    const player = await Player.findOne({ _id: playerId, academyId, sport: session.sport }).select("_id").lean();
    if (!player) throw new ApiError(400, "That player is not on this session’s roster.");
    const updated = await PracticeSession.findOneAndUpdate(
      {
        _id: sessionId,
        academyId,
        status: "open",
        attendance: { $elemMatch: { playerId } }
      },
      { $set: { "attendance.$[entry].status": action.status } },
      { new: true, arrayFilters: [{ "entry.playerId": playerId }] }
    );
    if (!updated) throw new ApiError(409, "This session is closed or the player has no attendance entry.");
    return NextResponse.json({ session: sessionDto(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
