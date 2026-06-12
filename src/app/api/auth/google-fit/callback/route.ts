import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!code || !userId) {
    return NextResponse.redirect(`${baseUrl}/ingestion?panel=api&sync=error&reason=missing_code_or_state`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error("GOOGLE FIT OAUTH CALLBACK ERROR: Google Client ID or Secret is not configured.");
      return NextResponse.redirect(`${baseUrl}/ingestion?panel=api&sync=error&reason=auth_config_error`);
    }

    const redirectUri = `${baseUrl}/api/auth/google-fit/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Google token exchange error:", data);
      throw new Error(data.error_description || "Token exchange failed");
    }

    await connectDB();

    const updateFields: any = {
      "googleFit.accessToken": data.access_token,
      "googleFit.expiryDate": new Date(Date.now() + data.expires_in * 1000),
      "googleFit.syncActive": true,
      "googleFit.lastSyncedAt": new Date(),
    };

    if (data.refresh_token) {
      updateFields["googleFit.refreshToken"] = data.refresh_token;
    }

    await User.findByIdAndUpdate(userId, {
      $set: updateFields
    });

    return NextResponse.redirect(`${baseUrl}/ingestion?panel=api&sync=success`);
  } catch (error: any) {
    console.error("GOOGLE FIT CALLBACK ERROR:", error);
    return NextResponse.redirect(`${baseUrl}/ingestion?panel=api&sync=error&reason=exchange_failed`);
  }
}
