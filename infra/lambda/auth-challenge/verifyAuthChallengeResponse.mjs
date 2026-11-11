import { checkCode, checkPreviewCode, isPreviewPhone } from "./twilio.mjs";

export const handler = async (event) => {
  const phone = event.request.privateChallengeParameters?.phone;
  const code = String(event.request.challengeAnswer || "").trim();
  if (!/^\d{4,8}$/.test(code)) event.response.answerCorrect = false;
  else if (await isPreviewPhone(phone)) event.response.answerCorrect = await checkPreviewCode(code);
  else event.response.answerCorrect = await checkCode(phone, code);
  return event;
};
