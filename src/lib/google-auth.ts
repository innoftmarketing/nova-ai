import { google } from "googleapis";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getCalendarClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Method 1: OAuth2 (refresh token from login flow)
  if (refreshToken) {
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: "v3", auth: oauth2 });
  }

  // Method 2: Service Account (fallback)
  const serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (serviceKey) {
    const key = JSON.parse(serviceKey);
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return google.calendar({ version: "v3", auth });
  }

  return null;
}
