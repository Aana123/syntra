import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { apiHandler } from "@/lib/apiHandler";
import { ApiError } from "@/lib/apiError";
import { processTerminalCommand } from "@/services/terminalService";

export const POST = apiHandler(async (req: Request) => {
  // 1. Security Check (Traffic Cop)
  const session = await getSession();
  if (!session?.user?.email || !session.user.id) {
    throw new ApiError(401, "[-] SECURITY ERROR: Unauthorized neural link. Session invalid.");
  }

  // 2. Parse Payload
  const body = await req.json();
  const commandRaw = body.command || "";

  await connectDB();

  // 3. Delegate to Service Layer (The Kitchen)
  const output = await processTerminalCommand(
    session.user.id, 
    session.user.email, 
    commandRaw
  );

  // 4. Return formatted response
  return NextResponse.json({ success: true, output });
});