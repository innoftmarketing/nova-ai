import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = () => {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error("ADMIN_SECRET is not set in .env.local");
  return new TextEncoder().encode(s);
};

const COOKIE_NAME = "nova_admin_token";

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET());
}

export async function verifyAdminToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, SECRET());
    return true;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
