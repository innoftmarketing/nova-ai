import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendCAPIEvent } from "@/lib/meta-capi";

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

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const cleaned = signature.replace(/^sha256=/i, "").trim();
  return timingSafeEqual(expected, cleaned);
}

function findLeadId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.lead_id,
    p.leadid,
    p.id,
    (p.lead as Record<string, unknown> | undefined)?.id,
    (p.data as Record<string, unknown> | undefined)?.lead_id,
    (p.data as Record<string, unknown> | undefined)?.id,
    (p.payload as Record<string, unknown> | undefined)?.id,
    (p.payload as Record<string, unknown> | undefined)?.lead_id,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).length > 0) return String(c);
  }
  return undefined;
}

function getCustomFieldValue(lead: PerfexLead, fieldId: string | undefined): string | undefined {
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
    headers: {
      authtoken: crmToken,
      Accept: "application/json",
    },
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

  if (!secret || !crmUrl || !crmToken) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();

  // Two ways to authenticate:
  //   1. Header signature (HMAC sha256 of raw body using secret)
  //   2. Bearer token / X-Webhook-Secret header equal to secret
  const signature =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("x-perfex-signature") ||
    req.headers.get("x-signature");
  const sharedHeader =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const sigOk = signature ? verifySignature(rawBody, signature, secret) : false;
  const sharedOk = sharedHeader ? timingSafeEqual(sharedHeader.trim(), secret) : false;

  if (!sigOk && !sharedOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const leadId = findLeadId(payload);
  if (!leadId) {
    return NextResponse.json({ error: "lead id not found in payload" }, { status: 400 });
  }

  const lead = await fetchPerfexLead(crmUrl, crmToken, leadId);
  if (!lead) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  if (String(lead.status) !== String(qualifiedStatusId)) {
    return NextResponse.json(
      { skipped: true, reason: "lead is not in qualified status", status: lead.status },
      { status: 200 },
    );
  }

  if (cfCapiSent) {
    const alreadySent = getCustomFieldValue(lead, cfCapiSent);
    if (alreadySent) {
      return NextResponse.json(
        { skipped: true, reason: "already sent", sentAt: alreadySent },
        { status: 200 },
      );
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
