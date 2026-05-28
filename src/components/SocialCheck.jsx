/**
 * SocialCheck — F5 Sprint 5.
 *
 * 16-question interpersonal-skills self-check. Same engine and 30-day
 * cooldown as BrainCheck.
 *
 * Bank covers active listening, empathy, conflict resolution, body
 * language and basic relationship principles drawn from broadly-
 * accepted communication research. Deliberately avoids therapy /
 * clinical scenarios.
 */

import SelfCheck from './SelfCheck';

const TEST_VERSION = 1;

const QUESTIONS = [
  {
    q: '"Active listening" is best described as…',
    choices: ['Waiting silently for your turn to speak', 'Fully focusing on the speaker and reflecting their meaning back', 'Talking over them to keep things lively', 'Avoiding eye contact so they feel less watched'],
    answer: 1,
  },
  {
    q: 'Empathy means…',
    choices: ['Feeling sorry for someone from a distance', 'Understanding and sharing in another person\'s feelings', 'Agreeing with everything the other person says', 'Trying to fix their problem immediately'],
    answer: 1,
  },
  {
    q: 'In a disagreement, the approach generally linked to the best long-term outcomes is…',
    choices: ['Winning at all costs', 'Avoiding the conflict completely', 'Collaborative problem-solving with the other person', 'Dropping passive-aggressive hints'],
    answer: 2,
  },
  {
    q: 'Which of these is a "closed" question?',
    choices: ['"How did that make you feel?"', '"What do you think we should do?"', '"Did you eat lunch yet?"', '"Tell me about your day."'],
    answer: 2,
  },
  {
    q: 'Maintained, comfortable eye contact during a conversation usually signals…',
    choices: ['Hostility', 'Engagement and interest', 'Boredom', 'Dishonesty'],
    answer: 1,
  },
  {
    q: 'Dunbar\'s number — the rough cognitive limit on stable social relationships — is approximately…',
    choices: ['5', '50', '150', '5,000'],
    answer: 2,
  },
  {
    q: '"I" statements ("I feel X when Y happens") tend to work better than "You" statements because they…',
    choices: ['Place more blame on the other person', 'Reduce defensiveness and make feelings clearer', 'Are shorter', 'Sound more formal'],
    answer: 1,
  },
  {
    q: 'Research has compared the health impact of chronic loneliness to roughly…',
    choices: ['Drinking plenty of water', 'Smoking around 15 cigarettes per day', 'Brisk walking', 'Eating extra vegetables'],
    answer: 1,
  },
  {
    q: 'When a friend is venting about a problem, the best first response is usually to…',
    choices: ['Immediately offer your solution', 'Tell them they\'re overreacting', 'Acknowledge their feelings before moving to solutions', 'Change the subject to lift the mood'],
    answer: 2,
  },
  {
    q: 'Crossing your arms during a tense conversation can often be read as…',
    choices: ['Open and inviting', 'Defensive or closed off', 'A sign of agreement', 'Completely neutral in every culture'],
    answer: 1,
  },
  {
    q: 'A healthy personal boundary looks most like…',
    choices: ['Saying yes to every request to keep the peace', 'Clearly communicating limits, even with people you love', 'Cutting people off without explanation', 'Never disagreeing out loud'],
    answer: 1,
  },
  {
    q: 'Small talk mostly serves to…',
    choices: ['Waste time', 'Establish rapport and signal safety before deeper conversation', 'Test the other person\'s intelligence', 'Avoid real connection'],
    answer: 1,
  },
  {
    q: 'In healthy relationships, "reciprocity" usually means…',
    choices: ['One person doing most of the work', 'Both people contributing roughly equally over time', 'Keeping a strict tally of every favour', 'Refusing all favours to stay independent'],
    answer: 1,
  },
  {
    q: 'The behaviour most consistently linked in research to relationship satisfaction is…',
    choices: ['Frequent expensive gifts', 'Regularly expressing genuine appreciation', 'Never arguing about anything', 'Having identical hobbies'],
    answer: 1,
  },
  {
    q: 'Tone of voice generally conveys…',
    choices: ['Only the literal meaning of words', 'As much or more meaning than the words themselves', 'Nothing — listeners just hear the words', 'Only volume'],
    answer: 1,
  },
  {
    q: 'An effective apology usually includes…',
    choices: ['"I\'m sorry but you also…"', 'Acknowledging the harm, taking responsibility, and committing to change', 'A quick "sorry" and changing the subject', 'Blaming circumstances or stress'],
    answer: 1,
  },
];

export default function SocialCheck({ S, update, onClose }) {
  return (
    <SelfCheck
      S={S}
      update={update}
      onClose={onClose}
      stateKey="socialScore"
      testVersion={TEST_VERSION}
      questions={QUESTIONS}
      eyebrow="SOCIAL CHECK"
      completeEyebrow="SOCIAL SKILLS SELF-CHECK · COMPLETE"
      feedsLabel="feeds your Social rating"
      resultBlurb="This isn't a psychological assessment — it's a one-off snapshot of basic interpersonal-skills knowledge used to seed the Social category of your OVR."
    />
  );
}
