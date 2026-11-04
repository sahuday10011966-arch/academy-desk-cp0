import { model, models, Schema } from "mongoose";
import type { AttendanceStatus, SessionStatus } from "@/lib/domain";
import type { UserRole } from "@/lib/permissions";

const academySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    location: { type: String, required: true, trim: true, maxlength: 100 }
  },
  { timestamps: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["coach", "player", "scout"], required: true },
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, strict: "throw" }
);
userSchema.index({ email: 1 }, { unique: true });

const playerSchema = new Schema(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    age: { type: Number, required: true, min: 5, max: 80, validate: Number.isInteger },
    sport: { type: String, required: true, trim: true, maxlength: 32 }
  },
  { timestamps: true, strict: "throw" }
);
playerSchema.index({ userId: 1 }, { unique: true });
playerSchema.index({ academyId: 1, sport: 1, name: 1 });

const attendanceSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    status: { type: String, enum: ["present", "absent"], required: true }
  },
  { _id: false, strict: "throw" }
);

const sessionSchema = new Schema(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    sport: { type: String, required: true, trim: true, maxlength: 32 },
    status: { type: String, enum: ["open", "closed"], default: "open", required: true },
    attendance: { type: [attendanceSchema], default: [] },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true, strict: "throw" }
);
sessionSchema.index({ academyId:  1, date: -1, createdAt: -1 });
sessionSchema.index(
  { academyId: 1, sport: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

const scoreSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false, strict: "throw" }
);

const matchSchema = new Schema(
  {
    academyId: { type: Schema.Types.ObjectId, ref: "Academy", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "PracticeSession", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    sport: { type: String, required: true, trim: true, maxlength: 32 },
    opponent: { type: String, required: true, trim: true, maxlength: 80 },
    eligiblePlayerIds: { type: [{ type: Schema.Types.ObjectId, ref: "Player" }], default: [] },
    scores: { type: [scoreSchema], default: [] }
  },
  { timestamps: true, strict: "throw" }
);
matchSchema.index({ academyId: 1, date: -1 });

const loginAttemptSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  { timestamps: true, strict: "throw" }
);
loginAttemptSchema.index({ key: 1 }, { unique: true });

export const Academy = models.Academy || model("Academy", academySchema);
export const User = models.User || model("User", userSchema);
export const Player = models.Player || model("Player", playerSchema);
export const PracticeSession = models.PracticeSession || model("PracticeSession", sessionSchema);
export const Match = models.Match || model("Match", matchSchema);
export const LoginAttempt = models.LoginAttempt || model("LoginAttempt", loginAttemptSchema);

export type { UserRole, AttendanceStatus, SessionStatus };
