import { NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";

export async function GET() {
  const oauth2 = getOAuth2Client();

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  return NextResponse.redirect(authUrl);
}
