import crypto from "crypto";

const META_GRAPH_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed ? sha256(trimmed) : undefined;
}

function hashPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "212" + digits.slice(1);
  }
  return sha256(digits);
}

function hashLowercase(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? sha256(trimmed) : undefined;
}

function hashCity(city?: string): string | undefined {
  if (!city) return undefined;
  const norm = city.trim().toLowerCase().replace(/\s+/g, "");
  return norm ? sha256(norm) : undefined;
}

export type CAPIEventInput = {
  eventName: string;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  city?: string;
  country?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  customData?: Record<string, unknown>;
};

export async function sendCAPIEvent(
  input: CAPIEventInput,
): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    return {
      ok: false,
      error: "Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN",
    };
  }

  let firstName: string | undefined;
  let lastName: string | undefined;
  if (input.fullName) {
    const parts = input.fullName.trim().split(/\s+/);
    firstName = parts[0];
    if (parts.length > 1) lastName = parts.slice(1).join(" ");
  }

  const userData: Record<string, unknown> = {};
  const em = hashEmail(input.email);
  if (em) userData.em = [em];
  const ph = hashPhone(input.phone);
  if (ph) userData.ph = [ph];
  const fn = hashLowercase(firstName);
  if (fn) userData.fn = [fn];
  const ln = hashLowercase(lastName);
  if (ln) userData.ln = [ln];
  const ct = hashCity(input.city);
  if (ct) userData.ct = [ct];
  const co = hashLowercase(input.country);
  if (co) userData.country = [co];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
  };
  if (input.eventId) event.event_id = input.eventId;
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (input.customData) event.custom_data = input.customData;

  const body: Record<string, unknown> = { data: [event] };
  if (testCode) body.test_event_code = testCode;

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
    accessToken,
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Meta CAPI error:", res.status, errText);
      return { ok: false, error: `${res.status} ${errText}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("Meta CAPI request failed:", err);
    return { ok: false, error: String(err) };
  }
}
