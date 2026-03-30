import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { fullName, phone, company, city, hasWebsite, timeline, date, time } =
      body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Nom complet et téléphone sont requis." },
        { status: 400 }
      );
    }

    const warnings: string[] = [];

    // ── Perfect CRM Integration ──
    const crmUrl = process.env.PERFEX_CRM_URL;
    const crmToken = process.env.PERFEX_CRM_API_TOKEN;

    if (crmUrl && crmToken) {
      try {
        const description = [
          `Lead depuis NovaAI Landing Page`,
          `Ville: ${city || "Non renseigné"}`,
          `Site existant: ${hasWebsite || "Non renseigné"}`,
          `Délai projet: ${timeline || "Non renseigné"}`,
          `Créneau choisi: ${date || "—"} à ${time || "—"}`,
        ].join("\n");

        const crmParams = new URLSearchParams({
          name: fullName,
          phonenumber: phone,
          company: company || "",
          description,
          status: process.env.PERFEX_CRM_DEFAULT_STATUS || "1",
          source: process.env.PERFEX_CRM_DEFAULT_SOURCE || "1",
          assigned: process.env.PERFEX_CRM_DEFAULT_ASSIGNED || "1",
        });

        const crmRes = await fetch(`${crmUrl}/api/leads`, {
          method: "POST",
          headers: {
            authtoken: crmToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: crmParams.toString(),
        });

        if (!crmRes.ok) {
          const errText = await crmRes.text();
          console.error("Perfex CRM error:", crmRes.status, errText);
          warnings.push("CRM submission failed");
        }
      } catch (err) {
        console.error("Perfex CRM request failed:", err);
        warnings.push("CRM submission failed");
      }
    }

    // ── Google Sheets Integration (optional) ──
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (googleScriptUrl) {
      try {
        const timestamp = new Date().toLocaleString("fr-MA", {
          timeZone: "Africa/Casablanca",
        });

        await fetch(googleScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            phone,
            company: company || "",
            city: city || "",
            hasWebsite: hasWebsite || "",
            timeline: timeline || "",
            date: date || "",
            time: time || "",
            timestamp,
          }),
        });
      } catch (err) {
        console.error("Google Sheets error:", err);
        warnings.push("Google Sheets submission failed");
      }
    }

    if (warnings.length > 0) {
      return NextResponse.json(
        { success: true, warnings },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
