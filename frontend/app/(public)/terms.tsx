import React from 'react';

import { LegalScreen, type LegalSection } from '@/screens/LegalScreen';

const SECTIONS: LegalSection[] = [
  {
    heading: 'The service',
    body: [
      'Kaam is a place where people looking for household work and households looking for help can find each other and talk. Kaam is an introduction service. We are not an employer, an agency, or a party to any arrangement you make with someone you meet here.',
      'We do not run background checks, verify skills, or guarantee that anyone is who they say they are. Use your judgement, meet safely, and agree terms directly with the other person.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'You need a mobile phone number to use Kaam, and you must be at least 18. Keep your phone secure, since anyone who can receive your codes can sign in as you. One account per person.',
      'Give accurate information in your profile. Do not impersonate anyone.',
    ],
  },
  {
    heading: 'Text messages',
    body: [
      'By entering your phone number you agree to receive a one-time login code by SMS. If you connect with someone, you may also receive a short text when they message you. Message frequency varies.',
      'Message and data rates may apply. Reply STOP to stop receiving texts and HELP for help. Stopping texts does not delete your account, but you will need another way to receive your login code.',
      'Carriers are not liable for delayed or undelivered messages.',
    ],
  },
  {
    heading: 'How to behave',
    body: [
      'Be respectful. Do not harass anyone, lie about who you are, post content that is not yours, or use Kaam for anything unlawful.',
      'You can report anyone from their profile or from a chat. We may suspend or remove accounts that break these rules.',
    ],
  },
  {
    heading: 'Your content',
    body: [
      'The photos, videos and text you put on Kaam remain yours. You give us permission to show them to other Kaam users so the service can work. Only upload things you have the right to share.',
    ],
  },
  {
    heading: 'No warranty, and limits',
    body: [
      'Kaam is provided as it is, without warranties. We are not responsible for the conduct of anyone you meet through Kaam, for work performed or not performed, for payment between you, or for any loss arising from an arrangement you make.',
      'To the extent the law allows, our total liability to you is limited to the amount you have paid us, which today is nothing.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We may update these terms as Kaam develops. Continuing to use Kaam means you accept the current terms.',
      'Questions can go to vidit.batta@gmail.com.',
    ],
  },
];

export default function Terms() {
  return (
    <LegalScreen title="Terms of Service" updated="Last updated 20 September 2026" sections={SECTIONS} />
  );
}
