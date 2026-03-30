import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminToken();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    // In production, store this securely (database, encrypted env, etc.)
    // For now, display it so you can copy it to .env.local
    const baseUrl = req.nextUrl.origin;

    return new NextResponse(
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Calendar connecté</title>
  <style>
    body { background: #0d141d; color: #dce3f0; font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; }
    .card { background: #151c26; border: 1px solid #3b494c33; border-radius: 2rem; padding: 3rem; max-width: 600px; width: 100%; text-align: center; }
    h1 { color: #00e5ff; margin-bottom: 1rem; }
    .token-box { background: #19202a; border: 1px solid #3b494c33; border-radius: 0.75rem; padding: 1rem; margin: 1.5rem 0; word-break: break-all; font-family: monospace; font-size: 0.8rem; text-align: left; max-height: 120px; overflow-y: auto; }
    .label { font-size: 0.85rem; color: #bac9cc; margin-bottom: 0.5rem; text-align: left; }
    .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 2rem; background: linear-gradient(to right, #00e5ff, #c3f5ff); color: #00363d; border-radius: 9999px; text-decoration: none; font-weight: 700; }
    code { color: #00e5ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Google Calendar connecté !</h1>
    <p>Copiez le refresh token ci-dessous et ajoutez-le dans votre fichier <code>.env.local</code> :</p>
    <div class="label">GOOGLE_REFRESH_TOKEN</div>
    <div class="token-box">${tokens.refresh_token || "Aucun refresh token — re-autorisez avec prompt=consent"}</div>
    <p style="font-size:0.85rem; color:#849396;">Redémarrez le serveur Next.js après avoir mis à jour le .env.local</p>
    <a class="btn" href="${baseUrl}/admin">Retour à l'admin</a>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.json(
      { error: "Failed to exchange code for tokens" },
      { status: 500 },
    );
  }
}
