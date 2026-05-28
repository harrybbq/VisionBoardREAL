/**
 * BrainCheck — F5 Sprint 4 (refactored Sprint 5).
 *
 * Thin wrapper around the generic SelfCheck engine. The Brain bank
 * is pure-text reasoning across number sequences / analogies / word
 * logic / quick maths — no visual matrices, no domain trivia.
 *
 * Score range 70-130 maps to brainScorePoints in derive.js
 * (70 → 6pt, 100 → 12pt, 130 → 18pt).
 *
 * testVersion = 1. If the bank ever gets re-balanced, bump the
 * version so historical scores aren't compared against new ones.
 *
 * The legacy `isCooldownActive` / `daysUntilRetake` exports are
 * preserved here so anything that imports them from this file keeps
 * working — they now just re-export the generic helpers.
 */

import SelfCheck, { isCooldownActive, daysUntilRetake } from './SelfCheck';

export { isCooldownActive, daysUntilRetake };

const TEST_VERSION = 1;

const QUESTIONS = [
  {
    q: 'What number comes next?  3, 6, 12, 24, …',
    choices: ['36', '42', '48', '60'],
    answer: 2,
  },
  {
    q: 'What number comes next?  1, 1, 2, 3, 5, …',
    choices: ['6', '7', '8', '10'],
    answer: 2,
  },
  {
    q: 'Foot is to leg as hand is to ___',
    choices: ['Finger', 'Wrist', 'Arm', 'Shoulder'],
    answer: 2,
  },
  {
    q: 'Which one does not belong?',
    choices: ['Cat', 'Dog', 'Robin', 'Horse'],
    answer: 2,
  },
  {
    q: 'If 5 machines make 5 widgets in 5 minutes, how long does it take 100 machines to make 100 widgets?',
    choices: ['1 minute', '5 minutes', '20 minutes', '100 minutes'],
    answer: 1,
  },
  {
    q: 'What letter comes next?  A, C, F, J, …',
    choices: ['M', 'N', 'O', 'P'],
    answer: 2,
  },
  {
    q: 'A bat and ball cost £1.10 together. The bat costs £1.00 more than the ball. How much does the ball cost?',
    choices: ['£0.05', '£0.10', '£0.15', '£0.50'],
    answer: 0,
  },
  {
    q: 'The opposite of "expand" is …',
    choices: ['Increase', 'Contract', 'Refuse', 'Repeat'],
    answer: 1,
  },
  {
    q: 'What is half of half of 60?',
    choices: ['10', '15', '20', '30'],
    answer: 1,
  },
  {
    q: 'What comes next?  100, 50, 25, 12.5, …',
    choices: ['10', '8.25', '6.25', '5'],
    answer: 2,
  },
  {
    q: 'What is the next letter?  M, T, W, T, F, …',
    choices: ['M', 'S', 'T', 'F'],
    answer: 1,
  },
  {
    q: 'Which word means most nearly the same as "rapid"?',
    choices: ['Loud', 'Heavy', 'Swift', 'Wide'],
    answer: 2,
  },
  {
    q: 'If today is Wednesday, what day will it be in 100 days?',
    choices: ['Wednesday', 'Thursday', 'Friday', 'Saturday'],
    answer: 2,
  },
  {
    q: 'All bloops are razzies. All razzies are lazzies. Are all bloops definitely lazzies?',
    choices: ['Yes', 'No', 'Cannot be determined', 'Sometimes'],
    answer: 0,
  },
  {
    q: 'Which number is the odd one out?  3, 9, 25, 36, 49, 121',
    choices: ['9', '25', '36', '3'],
    answer: 3,
  },
  {
    q: 'A clock shows 3:15. What is the angle between the hour and minute hands?',
    choices: ['0°', '7.5°', '15°', '22.5°'],
    answer: 1,
  },
];

export default function BrainCheck({ S, update, onClose }) {
  return (
    <SelfCheck
      S={S}
      update={update}
      onClose={onClose}
      stateKey="brainScore"
      testVersion={TEST_VERSION}
      questions={QUESTIONS}
      eyebrow="BRAIN CHECK"
      completeEyebrow="BRAIN RATING SELF-CHECK · COMPLETE"
      feedsLabel="feeds your Brain rating"
      resultBlurb="This isn't a clinical IQ test — it's a one-off snapshot used to seed the Brain category of your OVR."
    />
  );
}
