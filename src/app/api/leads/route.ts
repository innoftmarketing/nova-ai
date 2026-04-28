import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-auth";
import { sendCAPIEvent } from "@/lib/meta-capi";

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

  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+01:00`;
  return new Date(iso);
}

/* ───────── Route Handler ───────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName, phone, email, company, companyDescription, city, citySegment, hasWebsite, timeline, date, time,
      utm_source, utm_medium, utm_campaign, utm_content,
      language,
      eventId, sourceUrl,
    } = body;

    const lang = language === "ar" ? "ar" : "fr";
    const isCasa =
      citySegment === "casa" ||
      (typeof city === "string" && city.trim().toLowerCase() === "casablanca");

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Nom complet et téléphone sont requis." },
        { status: 400 },
      );
    }

    const warnings: string[] = [];

    // Capture ad fingerprint (Facebook click cookies, IP, UA) early so we can
    // store it on the Perfex lead and later send a QualifiedLead CAPI event.
    const fbc = req.cookies.get("_fbc")?.value;
    const fbp = req.cookies.get("_fbp")?.value;
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const xff = req.headers.get("x-forwarded-for");
    const clientIp =
      xff?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    // ── Perfex CRM Integration ──
    const crmUrl = process.env.PERFEX_CRM_URL;
    const crmToken = process.env.PERFEX_CRM_API_TOKEN;

    if (crmUrl && crmToken) {
      try {
        const description = [
          `Lead from Site Inteligent campaign`,
          companyDescription ? `Description: ${companyDescription}` : null,
          `Ville: ${city || "Non renseigné"}`,
          `Site existant: ${hasWebsite || "Non renseigné"}`,
          `Délai projet: ${timeline || "Non renseigné"}`,
          `Créneau choisi: ${date || "—"} à ${time || "—"}`,
          (utm_source || utm_medium || utm_campaign || utm_content)
            ? `\n— Campagne Meta —\nSource: ${utm_source || "—"}\nAdset: ${utm_medium || "—"}\nCampagne: ${utm_campaign || "—"}\nAnnonce: ${utm_content || "—"}`
            : null,
        ].filter(Boolean).join("\n");

        const crmParams = new URLSearchParams({
          name: fullName,
          phonenumber: phone,
          email: email || "",
          company: company || "",
          description,
          status: process.env.PERFEX_CRM_DEFAULT_STATUS || "1",
          source: process.env.PERFEX_CRM_DEFAULT_SOURCE || "1",
          assigned: process.env.PERFEX_CRM_DEFAULT_ASSIGNED || "1",
        });

        // UTM custom fields (Perfex Lead object)
        //   25 = leads_source        → utm_source
        //   17 = leads_campaign_name → utm_campaign
        //   19 = leads_ad_set_name_2 → utm_medium (adset)
        //   18 = leads_ad_set_name   → utm_content (ad name)
        if (utm_source) crmParams.append("custom_fields[leads][25]", utm_source);
        if (utm_campaign) crmParams.append("custom_fields[leads][17]", utm_campaign);
        if (utm_medium) crmParams.append("custom_fields[leads][19]", utm_medium);
        if (utm_content) crmParams.append("custom_fields[leads][18]", utm_content);

        // Ad fingerprint custom fields (for QualifiedLead CAPI event later)
        const cfFbc = process.env.PERFEX_CF_FBC;
        const cfFbp = process.env.PERFEX_CF_FBP;
        const cfIp = process.env.PERFEX_CF_CLIENT_IP;
        const cfUa = process.env.PERFEX_CF_CLIENT_USER_AGENT;
        const cfEventId = process.env.PERFEX_CF_EVENT_ID;
        const cfLanguage = process.env.PERFEX_CF_LANGUAGE;
        if (cfFbc && fbc) crmParams.append(`custom_fields[leads][${cfFbc}]`, fbc);
        if (cfFbp && fbp) crmParams.append(`custom_fields[leads][${cfFbp}]`, fbp);
        if (cfIp && clientIp) crmParams.append(`custom_fields[leads][${cfIp}]`, clientIp);
        if (cfUa && userAgent) crmParams.append(`custom_fields[leads][${cfUa}]`, userAgent);
        if (cfEventId && eventId) crmParams.append(`custom_fields[leads][${cfEventId}]`, eventId);
        if (cfLanguage) crmParams.append(`custom_fields[leads][${cfLanguage}]`, lang);

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
          const endDate = new Date(startDate.getTime() + 20 * 60 * 1000); // 20 min

          const eventDescription = [
            `Téléphone: ${phone}`,
            email ? `Email: ${email}` : null,
            company ? `Entreprise: ${company}` : null,
            companyDescription ? `Description: ${companyDescription}` : null,
            city ? `Ville: ${city}` : null,
            `Site existant: ${hasWebsite || "Non renseigné"}`,
            `Délai: ${timeline || "Non renseigné"}`,
            (utm_source || utm_medium || utm_campaign || utm_content)
              ? `\n— Campagne Meta —\nSource: ${utm_source || "—"}\nAdset: ${utm_medium || "—"}\nCampagne: ${utm_campaign || "—"}\nAnnonce: ${utm_content || "—"}`
              : null,
          ]
            .filter(Boolean)
            .join("\n");

          await calendar.events.insert({
            calendarId,
            requestBody: {
              summary: `Consultation Innoft — ${fullName}`,
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
            email: email || "",
            company: company || "",
            companyDescription: companyDescription || "",
            city: city || "",
            hasWebsite: hasWebsite || "",
            timeline: timeline || "",
            date: date || "",
            time: time || "",
            utm_source: utm_source || "",
            utm_medium: utm_medium || "",
            utm_campaign: utm_campaign || "",
            utm_content: utm_content || "",
            timestamp,
          }),
        });
      } catch (err) {
        console.error("Google Sheets error:", err);
        warnings.push("Google Sheets submission failed");
      }
    }

    // ── Meta Conversions API (server-side Lead event) ──
    // Only fire for Casablanca leads — outside-Casa leads enter the CRM/calendar
    // normally but are kept off the pixel so Facebook keeps optimising for Casa.
    if (isCasa) {
      try {
        const capiResult = await sendCAPIEvent({
          eventName: "Lead",
          eventId,
          eventSourceUrl: sourceUrl,
          email,
          phone,
          fullName,
          city,
          country: "ma",
          clientIp,
          clientUserAgent: userAgent,
          fbc,
          fbp,
          customData: { content_category: lang, language: lang },
        });

        if (!capiResult.ok) {
          warnings.push("Meta CAPI lead event failed");
        }
      } catch (err) {
        console.error("Meta CAPI send failed:", err);
        warnings.push("Meta CAPI lead event failed");
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
