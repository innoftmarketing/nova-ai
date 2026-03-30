import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-auth";

/* ───────── Helpers ───────── */

/** Parse "5 Avril 2026" + "10:30" into a JS Date */
function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  const MONTHS: Record<string, number> = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  };

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = MONTHS[parts[1].toLowerCase()];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;

  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return new Date(iso);
}

/* ───────── Route Handler ───────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { fullName, phone, company, city, hasWebsite, timeline, date, time } =
      body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Nom complet et téléphone sont requis." },
        { status: 400 },
      );
    }

    const warnings: string[] = [];

    // ── Perfect CRM Integration ──
    const crmUrl = process.env.PERFEX_CRM_URL;
    const crmToken = process.env.PERFEX_CRM_API_TOKEN;

    if (crmUrl && crmToken) {
      try {
        const description = [
          `Lead from Site Inteligent campaign`,
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

    // ── Google Calendar Integration ──
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const calendar = getCalendarClient();

    if (calendar && calendarId && date && time) {
      try {
        const startDate = parseDateAndTime(date, time);

        if (startDate) {
          const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min

          const eventDescription = [
            `Téléphone: ${phone}`,
            company ? `Entreprise: ${company}` : null,
            city ? `Ville: ${city}` : null,
            `Site existant: ${hasWebsite || "Non renseigné"}`,
            `Délai: ${timeline || "Non renseigné"}`,
          ]
            .filter(Boolean)
            .join("\n");

          await calendar.events.insert({
            calendarId,
            requestBody: {
              summary: `Consultation NovaAI — ${fullName}`,
              description: eventDescription,
              start: {
                dateTime: startDate.toISOString(),
                timeZone: "Africa/Casablanca",
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: "Africa/Casablanca",
              },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: "email", minutes: 60 },
                  { method: "popup", minutes: 15 },
                ],
              },
            },
          });
        } else {
          console.error("Google Calendar: could not parse date/time", date, time);
          warnings.push("Calendar event not created (invalid date)");
        }
      } catch (err) {
        console.error("Google Calendar error:", err);
        warnings.push("Calendar event creation failed");
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
        { status: 207 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 },
    );
  }
}
