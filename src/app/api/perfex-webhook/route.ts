import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendCAPIEvent } from "@/lib/meta-capi";

const REPLAY_TOLERANCE_SECONDS = 300;
const QUALIFIED_EVENT_NAME = "lead.status_changed";
const TEST_EVENT_NAME = "webhook.test";

type PerfexCustomField = {
  id?: number | string;
  name?: string;
  slug?: string;
  value?: string;
};

type PerfexLead = {
  id?: string | number;
  name?: string;
  email?: string;
  phonenumber?: string;
  phone?: string;
  city?: string;
  status?: string | number;
  custom_fields?: PerfexCustomField[];
} & Record<string, unknown>;

type WebhookPayload = {
  event?: string;
  webhook_id?: number;
  fired_at?: string;
  data?: {
    id?: string | number;
    new_status?: string | number;
  } & Record<string, unknown>;
};

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyInnoftSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): boolean {
  if (!timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > REPLAY_TOLERANCE_SECONDS) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
  return timingSafeEqual(expected, signature);
}

function getCustomFieldValue(
  lead: PerfexLead,
  fieldId: string | undefined,
): string | undefined {
  if (!fieldId || !lead.custom_fields) return undefined;
  const match = lead.custom_fields.find(
    (cf) => String(cf.id) === String(fieldId),
  );
  return match?.value || undefined;
}

async function fetchPerfexLead(
  crmUrl: string,
  crmToken: string,
  leadId: string,
): Promise<PerfexLead | null> {
  const res = await fetch(`${crmUrl}/api/leads/${leadId}`, {
    headers: { authtoken: crmToken, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error("Perfex fetch lead failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  if (Array.isArray(data)) return (data[0] as PerfexLead) ?? null;
  return data as PerfexLead;
}

async function markLeadCapiSent(
  crmUrl: string,
  crmToken: string,
  leadId: string,
  fieldId: string,
  value: string,
): Promise<boolean> {
  const params = new URLSearchParams();
  params.append(`custom_fields[leads][${fieldId}]`, value);
  const res = await fetch(`${crmUrl}/api/leads/${leadId}`, {
    method: "PUT",
    headers: {
      authtoken: crmToken,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    console.error("Perfex update lead failed:", res.status, await res.text());
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const secret = process.env.PERFEX_WEBHOOK_SECRET;
  const qualifiedStatusId = process.env.PERFEX_LEADS_QUALIFIED_STATUS_ID || "11";
  const crmUrl = process.env.PERFEX_CRM_URL;
  const crmToken = process.env.PERFEX_CRM_API_TOKEN;
  const cfCapiSent = process.env.PERFEX_CF_CAPI_QUALIFIED_SENT;

  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp");
  const signature = req.headers.get("x-webhook-signature");
  const eventName = req.headers.get("x-webhook-event") || "";

  if (!verifyInnoftSignature(rawBody, timestamp, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Acknowledge module test pings without doing CAPI work.
  if (eventName === TEST_EVENT_NAME) {
    return NextResponse.json({ ok: true, test: true });
  }

  // We only react to lead status changes.
  if (eventName !== QUALIFIED_EVENT_NAME) {
    return NextResponse.json({ skipped: true, reason: "event ignored", eventName });
  }

  if (!crmUrl || !crmToken) {
    return NextResponse.json(
      { error: "Perfex API not configured" },
      { status: 503 },
    );
  }

  let payload: WebhookPayload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newStatus = payload.data?.new_status;
  if (String(newStatus) !== String(qualifiedStatusId)) {
    return NextResponse.json({
      skipped: true,
      reason: "status not qualified",
      newStatus,
    });
  }

  const leadId = payload.data?.id ? String(payload.data.id) : undefined;
  if (!leadId) {
    return NextResponse.json({ error: "lead id missing in payload" }, { status: 400 });
  }

  const lead = await fetchPerfexLead(crmUrl, crmToken, leadId);
  if (!lead) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  if (cfCapiSent) {
    const alreadySent = getCustomFieldValue(lead, cfCapiSent);
    if (alreadySent) {
      return NextResponse.json({
        skipped: true,
        reason: "already sent",
        sentAt: alreadySent,
      });
    }
  }

  const fbc = getCustomFieldValue(lead, process.env.PERFEX_CF_FBC);
  const fbp = getCustomFieldValue(lead, process.env.PERFEX_CF_FBP);
  const clientIp = getCustomFieldValue(lead, process.env.PERFEX_CF_CLIENT_IP);
  const clientUserAgent = getCustomFieldValue(lead, process.env.PERFEX_CF_CLIENT_USER_AGENT);
  const eventId = getCustomFieldValue(lead, process.env.PERFEX_CF_EVENT_ID);

  const phone = (lead.phonenumber || lead.phone) as string | undefined;

  const capiResult = await sendCAPIEvent({
    eventName: "QualifiedLead",
    eventId: eventId ? `${eventId}_qualified` : undefined,
    email: lead.email,
    phone,
    fullName: lead.name,
    city: lead.city,
    country: "ma",
    clientIp,
    clientUserAgent,
    fbc,
    fbp,
    customData: {
      currency: "MAD",
      lead_status: String(lead.status),
    },
  });

  if (!capiResult.ok) {
    return NextResponse.json(
      { ok: false, error: capiResult.error },
      { status: 502 },
    );
  }

  if (cfCapiSent) {
    await markLeadCapiSent(
      crmUrl,
      crmToken,
      leadId,
      cfCapiSent,
      new Date().toISOString(),
    );
  }

  return NextResponse.json({ ok: true, leadId });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Perfex webhook receiver. POST only.",
  });
}
