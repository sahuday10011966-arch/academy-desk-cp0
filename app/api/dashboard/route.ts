import { NextResponse } from "next/server";
import { academyIdOf, idOf, matchDto, sessionDto, statsForPlayer } from "@/lib/academy";
import { requireUser } from "@/lib/auth";
import { Match, Player, PracticeSession, User } from "@/lib/models";
import { assertCanReadPlayer } from "@/lib/permissions";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const academyId = academyIdOf(user);

    if (user.role === "coach") {
      const [players, sessions, matches] = await Promise.all([
        Player.find({ academyId }).sort({ name: 1 }).lean(),
        PracticeSession.find({ academyId }).sort({ date: -1, createdAt: -1 }).lean(),
        Match.find({ academyId }).sort({ date: -1, createdAt: -1 }).lean()
      ]);
      const playerUsers = await User.find({ _id: { $in: players.map((player) => player.userId) } })
        .select("_id email")
        .lean();
      const emailByUserId = new Map(playerUsers.map((playerUser) => [idOf(playerUser._id), playerUser.email]));
      const roster = players.map((player) => {
        const stats = statsForPlayer(idOf(player._id), player.sport, sessions, matches);
        return {
          id: idOf(player._id),
          name: player.name,
          age: player.age,
          sport: player.sport,
          email: emailByUserId.get(idOf(player.userId)) ?? "",
          ...stats
        };
      });
      return NextResponse.json({
        role: "coach",
        players: roster,
        sessions: sessions.map(sessionDto),
        matches: matches.map(matchDto),
        summary: {
          playerCount: roster.length,
          readyCount: roster.filter((player) => player.isReady).length,
          openSessions: sessions.filter((session) => session.status === "open").length,
          sessionsHeld: sessions.filter((session) => session.status === "closed").length
        }
      });
    }

    if (user.role === "player") {
      if (!user.playerId) return NextResponse.json({ error: "Player profile is unavailable." }, { status: 404 });
      const player = await Player.findOne({ _id: user.playerId, academyId }).lean();
      if (!player) return NextResponse.json({ error: "Player profile is unavailable." }, { status: 404 });
      const resource = { id: idOf(player._id), academyId: idOf(player.academyId), ready: false };
      assertCanReadPlayer(user, resource);
      const [sessions, matches] = await Promise.all([
        PracticeSession.find({ academyId, sport: player.sport, status: "closed", "attendance.playerId": player._id })
          .sort({ date: -1, createdAt: -1 })
          .lean(),
        Match.find({ academyId, "scores.playerId": player._id }).sort({ date: -1 }).lean()
      ]);
      const ownSessions = sessions.map((session) => ({
        id: idOf(session._id),
        date: session.date,
        sport: session.sport,
        status: session.status,
        attendance: (session.attendance as Array<{ playerId: { toString(): string }; status: "present" | "absent" }>).find((entry) => idOf(entry.playerId) === user.playerId)?.status ?? "absent"
      }));
      const ownMatches = matches.map((match) => ({
        id: idOf(match._id),
        date: match.date,
        sport: match.sport,
        opponent: match.opponent,
        score: (match.scores as Array<{ playerId: { toString(): string }; score: number }>).find((entry) => idOf(entry.playerId) === user.playerId)?.score ?? null
      }));
      const stats = statsForPlayer(user.playerId, player.sport, sessions, matches);
      return NextResponse.json({
        role: "player",
        profile: { id: user.playerId, name: player.name, age: player.age, sport: player.sport, ...stats },
        sessions: ownSessions,
        matches: ownMatches
      });
    }

    if (user.role === "scout") {
      const [players, sessions, matches] = await Promise.all([
        Player.find({ academyId }).sort({ sport: 1, name: 1 }).lean(),
        PracticeSession.find({ academyId, status: "closed" }).lean(),
        Match.find({ academyId }).lean()
      ]);
      const readyPlayers = players.flatMap((player) => {
        const stats = statsForPlayer(idOf(player._id), player.sport, sessions, matches);
        const resource = { id: idOf(player._id), academyId: idOf(player.academyId), ready: stats.isReady };
        try {
          assertCanReadPlayer(user, resource);
          return [{ id: resource.id, name: player.name, age: player.age, sport: player.sport, ...stats }];
        } catch {
          return [];
        }
      });
      return NextResponse.json({ role: "scout", players: readyPlayers });
    }

    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  } catch (error) {
    return errorResponse(error);
  }
}
