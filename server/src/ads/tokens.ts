import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface EventTokenPayload {
  cid: string;   // creative id
  campid: string; // campaign id
  advid: string; // advertiser id
  plc: string;   // placement
  kind: "impression" | "click";
}

/**
 * Short-lived signed token issued at serve-time and required to record an
 * event. The server never trusts client-supplied cost or ids — it derives
 * them from this token, which prevents event/cost spoofing.
 */
export function signEventToken(payload: EventTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyEventToken(token: string): EventTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as EventTokenPayload;
  } catch {
    return null;
  }
}
