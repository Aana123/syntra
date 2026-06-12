export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth Client ID is not configured." }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/google-fit/callback`;
    
    const scopes = [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.body.read",
      "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${session.user.id}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("GOOGLE FIT OAUTH CONNECT ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
