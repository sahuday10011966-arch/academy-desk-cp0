import { NextResponse } from "next/server";
import { requireUser, publicUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    return errorResponse(error);
  }
}
