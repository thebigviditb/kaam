// Shared Twilio Verify helpers for the Cognito custom-auth Lambdas.
import { timingSafeEqual } from "node:crypto";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});
let cached;
export async function twilio() {
  if (cached) return cached;
  const r = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.TWILIO_SECRET_ARN }));
  cached = JSON.parse(r.SecretString);
  return cached;
}

async function call(path, form) {
  const { accountSid, authToken, verifyServiceSid } = await twilio();
  const res = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/${path}`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("twilio verify error", res.status, JSON.stringify(body));
    throw new Error(`twilio verify ${res.status}: ${body.message || ""}`);
  }
  return body;
}

export const sendCode = (to, locale = "en") =>
  call("Verifications", { To: to, Channel: "sms", Locale: locale });

export async function checkCode(to, code) {
  try {
    const r = await call("VerificationCheck", { To: to, Code: code });
    return r.status === "approved";
  } catch (e) {
    // 404 = no pending verification (expired or already used); treat as wrong.
    if (String(e.message).includes("404")) return false;
    throw e;
  }
}

// Staging only: the secret may hold previewPhone + previewCode, a test number that logs in with
// a fixed code and is never texted (the API wipes its data on each login; see PREVIEW_PHONES).
export async function isPreviewPhone(phone) {
  const { previewPhone } = await twilio();
  return Boolean(previewPhone) && phone === previewPhone;
}

export async function checkPreviewCode(code) {
  const { previewCode } = await twilio();
  if (!previewCode) return false;
  const a = Buffer.from(String(code));
  const b = Buffer.from(String(previewCode));
  return a.length === b.length && timingSafeEqual(a, b);
}
