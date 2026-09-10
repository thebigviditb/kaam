// Phone-only users skip Cognito's own SMS verification (Twilio Verify checks the phone on
// first login instead). Email users keep Cognito's emailed confirmation code.
export const handler = async (event) => {
  const attrs = event.request.userAttributes || {};
  if (attrs.phone_number && !attrs.email) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyPhone = true;
  }
  return event;
};
