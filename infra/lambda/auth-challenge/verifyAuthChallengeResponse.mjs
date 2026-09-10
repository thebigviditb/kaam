import { checkCode } from "./twilio.mjs";

export const handler = async (event) => {
  const phone = event.request.privateChallengeParameters?.phone;
  const code = String(event.request.challengeAnswer || "").trim();
  event.response.answerCorrect = /^\d{4,8}$/.test(code) ? await checkCode(phone, code) : false;
  return event;
};
