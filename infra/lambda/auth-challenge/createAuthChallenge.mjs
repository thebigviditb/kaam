import { sendCode } from "./twilio.mjs";

export const handler = async (event) => {
  const phone = event.request.userAttributes?.phone_number;
  if (!phone) throw new Error("custom auth requires a phone number");
  const session = event.request.session || [];
  // Only text on the first challenge of a session; retries reuse the same Twilio code.
  if (session.length === 0) {
    const locale = (event.request.userAttributes?.locale || "en").startsWith("hi") ? "hi" : "en";
    const r = await sendCode(phone, locale);
    console.log("verify sent", r.sid, "to", phone.slice(0, 5) + "…");
  }
  event.response.publicChallengeParameters = { phone };
  event.response.privateChallengeParameters = { phone };
  event.response.challengeMetadata = "SMS_CODE";
  return event;
};
