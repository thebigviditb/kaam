// Cognito "custom SMS sender" trigger: Cognito hands us an encrypted one-time code,
// we decrypt it with the pool's KMS key and text it through Twilio.
import { buildClient, CommitmentPolicy, KmsKeyringNode } from "@aws-crypto/client-node";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const keyring = new KmsKeyringNode({ keyIds: [process.env.KMS_KEY_ARN] });
const secrets = new SecretsManagerClient({});

let twilio; // cached across invocations
async function twilioConfig() {
  if (twilio) return twilio;
  const r = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.TWILIO_SECRET_ARN }));
  twilio = JSON.parse(r.SecretString);
  return twilio;
}

const BODIES = {
  CustomSMSSender_SignUp: (c) => `Your Kaam verification code is ${c}. Message and data rates may apply. Reply STOP to opt out.`,
  CustomSMSSender_ResendCode: (c) => `Your Kaam verification code is ${c}. Message and data rates may apply. Reply STOP to opt out.`,
  CustomSMSSender_Authentication: (c) => `Your Kaam login code is ${c}. Message and data rates may apply. Reply STOP to opt out.`,
  CustomSMSSender_VerifyUserAttribute: (c) => `Your Kaam verification code is ${c}.`,
  CustomSMSSender_UpdateUserAttribute: (c) => `Your Kaam verification code is ${c}.`,
  CustomSMSSender_ForgotPassword: (c) => `Your Kaam code is ${c}.`,
  CustomSMSSender_AdminCreateUser: (c) => `Your Kaam temporary code is ${c}.`,
};

export const handler = async (event) => {
  const to = event.request.userAttributes?.phone_number;
  const build = BODIES[event.triggerSource];
  if (!to || !build) {
    console.log("skipping", event.triggerSource, "phone present:", Boolean(to));
    return event;
  }
  const { plaintext } = await decrypt(keyring, Buffer.from(event.request.code, "base64"));
  const body = build(plaintext.toString("utf8"));

  const { accountSid, authToken, fromNumber, messagingServiceSid } = await twilioConfig();
  const form = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
  else form.set("From", fromNumber);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("twilio error", res.status, text);
    throw new Error(`twilio ${res.status}`);
  }
  const msg = await res.json();
  console.log("sent", event.triggerSource, "sid", msg.sid, "to", to.slice(0, 5) + "…");
  return event;
};
