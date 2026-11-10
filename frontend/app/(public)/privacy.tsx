import React from 'react';

import { LegalScreen, type LegalSection } from '@/screens/LegalScreen';

const SECTIONS: LegalSection[] = [
  {
    heading: 'What Kaam is',
    body: [
      'Kaam connects people who do household work (cooking, cleaning, laundry and similar) with households in the San Francisco Bay Area that need help. Anyone can create an account with a mobile phone number. This policy explains what we collect and what we do with it.',
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account: your mobile phone number, which is how you sign in, and the language you prefer.',
      'Profile: the name you choose to show, your city, the kinds of work you do or need, the days and times you are available, your experience and rate if you are a worker, your description, and any photos or videos you upload.',
      'Messages: the messages you send to other people through Kaam.',
      'Usage: basic technical information such as the time of your last activity, so we know whether to notify you.',
    ],
  },
  {
    heading: 'How we use it',
    body: [
      'To show you relevant matches, to let you and the other person talk to each other, to send you a one-time code when you sign in, and to tell you when someone has sent you a message.',
      'Your profile is visible to other signed-in Kaam users in the role opposite yours. Your phone number is not. It is shared with one other person only after you and that person have both agreed to connect.',
      'We do not sell your information, and we do not use it to advertise to you.',
    ],
  },
  {
    heading: 'SMS messages',
    body: [
      'When you enter your phone number to sign up or log in, you agree to receive a one-time login code by SMS. If you are connected with someone on Kaam, you may also receive a short text telling you that they have sent you a message.',
      'Message frequency varies. Message and data rates may apply. Reply STOP to any message to stop receiving texts, or HELP for help.',
      'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Phone numbers are shared only with the service providers listed below, who send messages on our behalf, and with another Kaam user after you both agree to connect.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      'We use a small number of service providers to run Kaam: Amazon Web Services (accounts, file storage), Twilio (text messages), Neon (database), Vercel (hosting), and Anthropic (translating chat messages between English and Hindi). They process this information on our behalf and may not use it for their own purposes.',
      'We may also disclose information if the law requires it, or to protect someone from harm.',
    ],
  },
  {
    heading: 'Keeping and deleting your information',
    body: [
      'We keep your information while your account exists. You can delete your account at any time from the Settings screen. Deletion is scheduled 30 days out, and signing in again before then cancels it. After that we permanently delete your account, profile, photos, videos and messages.',
      'You can also ask us to delete your information by writing to the address below.',
    ],
  },
  {
    heading: 'Children',
    body: ['Kaam is for adults. Do not use Kaam if you are under 18.'],
  },
  {
    heading: 'Contact',
    body: [
      'Questions about this policy, or requests about your information, can go to vidit.batta@gmail.com.',
    ],
  },
];

export default function Privacy() {
  return (
    <LegalScreen title="Privacy Policy" updated="Last updated 20 September 2026" sections={SECTIONS} />
  );
}
