export type UserRole = "coach" | "player" | "scout";

export interface Actor {
  id: string;
  role: UserRole;
  academyId: string | null;
  playerId: string | null;
}

export interface PlayerResource {
  id: string;
  academyId: string;
  ready: boolean;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertRole(actor: Actor, expectedRole: UserRole): void {
  if (actor.role !== expectedRole) throw new AuthorizationError();
  if (!actor.academyId) throw new AuthorizationError("This account is not assigned to an academy.");
}

export function canReadPlayer(actor: Actor, player: PlayerResource): boolean {
  if (!actor.academyId || actor.academyId !== player.academyId) return false;
  if (actor.role === "coach") return true;
  if (actor.role === "player") return Boolean(actor.playerId && actor.playerId === player.id);
  return actor.role === "scout" && player.ready;
}

export function assertCanReadPlayer(actor: Actor, player: PlayerResource): void {
  if (!canReadPlayer(actor, player)) throw new AuthorizationError();
}

export function assertCoachAcademy(actor: Actor, academyId: string): void {
  assertRole(actor, "coach");
  if (actor.academyId !== academyId) throw new AuthorizationError();
}
