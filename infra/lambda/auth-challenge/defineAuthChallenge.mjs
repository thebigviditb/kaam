// Drives the CUSTOM_AUTH state machine: one SMS-code challenge, up to 3 attempts.
const MAX_ATTEMPTS = 3;

export const handler = async (event) => {
  const session = event.request.session || [];
  const last = session[session.length - 1];

  if (event.request.userNotFound) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }
  if (last && last.challengeName === "CUSTOM_CHALLENGE" && last.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }
  const attempts = session.filter((s) => s.challengeName === "CUSTOM_CHALLENGE").length;
  if (attempts >= MAX_ATTEMPTS) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = "CUSTOM_CHALLENGE";
  return event;
};
