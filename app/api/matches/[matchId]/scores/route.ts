import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { academyIdOf, matchDto } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { canScorePlayer } from "@/lib/domain";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { Match, Player, PracticeSession } from "@/lib/models";
import { assertRole } from "@/lib/permissions";
import { validateScoreInput } from "@/lib/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    assertRole(user, "coach");
    const { matchId } = await context.params;
    if (!Types.ObjectId.isValid(matchId)) throw new ApiError(404, "Match was not found.");
    const input = await readJson(request, validateScoreInput);
    if (!Types.ObjectId.isValid(input.playerId)) throw new ApiError(400, "Choose a valid player.");
    const academyId = academyIdOf(user);
    const [match, player] = await Promise.all([
      Match.findOne({ _id: matchId, academyId }).lean(),
      Player.findOne({ _id: input.playerId, academyId }).lean()
    ]);
    if (!match) throw new ApiError(404, "Match was not found.");
    if (!player) throw new ApiError(400, "Player was not found in this academy.");

    const session = await PracticeSession.findOne({ _id: match.sessionId, academyId }).lean();
    const eligiblePlayerIds = (match.eligiblePlayerIds as Types.ObjectId[]).map((id) => String(id));
    const attendance = ((session?.attendance ?? []) as Array<{ playerId: Types.ObjectId; status: "present" | "absent" }>).map((entry) => ({ playerId: String(entry.playerId), status: entry.status }));
    if (!session || !canScorePlayer({
      matchDate: match.date,
      matchSport: match.sport,
      sessionDate: session.date,
      sessionSport: session.sport,
      sessionStatus: session.status,
      playerId: input.playerId,
      eligiblePlayerIds,
      attendance
    })) {
      throw new ApiError(409, "Only players marked Present in this closed session can receive a match score.");
    }
    if (player.sport !== match.sport) throw new ApiError(409, "Player sport must match the match sheet.");

    const playerId = new Types.ObjectId(input.playerId);
    const scoreEntry = { playerId, score: input.score, updatedAt: new Date() };
    let updated = await Match.findOneAndUpdate(
      {
        _id: matchId,
        academyId,
        eligiblePlayerIds: playerId,
        "scores.playerId": { $ne: playerId }
      },
      { $push: { scores: scoreEntry } },
      { new: true }
    );
    if (!updated) {
      updated = await Match.findOneAndUpdate(
        { _id: matchId, academyId, eligiblePlayerIds: playerId, "scores.playerId": playerId },
        { $set: { "scores.$[score].score": input.score, "scores.$[score].updatedAt": new Date() } },
        { new: true, arrayFilters: [{ "score.playerId": playerId }] }
      );
    }
    if (!updated) throw new ApiError(409, "Player is not eligible for this match sheet.");
    return NextResponse.json({ match: matchDto(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
