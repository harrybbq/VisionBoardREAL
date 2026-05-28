/**
 * FitnessCheck — F5 Sprint 5.
 *
 * 16-question exercise-science self-check. Same engine, scoring
 * (70-130) and 30-day cooldown as BrainCheck.
 *
 * Bank covers general activity guidelines, basic training principles,
 * recovery, and obvious safety / overtraining signals. No prescription
 * (no "you should lift X"), no diet specifics — knowledge, not advice.
 */

import SelfCheck from './SelfCheck';

const TEST_VERSION = 1;

const QUESTIONS = [
  {
    q: 'The WHO recommends adults get at least how many minutes of moderate aerobic activity per week?',
    choices: ['30 minutes', '75 minutes', '150 minutes', '500 minutes'],
    answer: 2,
  },
  {
    q: 'In weight training, a "rep" is…',
    choices: ['A whole workout session', 'One repetition of a movement', 'A muscle group', 'A rest day between sessions'],
    answer: 1,
  },
  {
    q: 'The single most important principle for long-term strength and muscle gain is…',
    choices: ['Doing more cardio', 'Progressive overload — gradually increasing demand over time', 'Eating only protein', 'Stretching after every set'],
    answer: 1,
  },
  {
    q: 'Resting heart rate is most reliably measured…',
    choices: ['Right after exercise', 'First thing in the morning, before getting out of bed', 'Just after a meal', 'Right before falling asleep'],
    answer: 1,
  },
  {
    q: 'The "big three" compound barbell lifts are commonly considered to be…',
    choices: ['Bicep curl, tricep extension, shoulder press', 'Squat, bench press, deadlift', 'Lunge, plank, push-up', 'Burpee, jump squat, mountain climber'],
    answer: 1,
  },
  {
    q: 'For people training to build muscle, daily protein intake of roughly which level is commonly recommended?',
    choices: ['About 0.3 g per kg of bodyweight', 'About 1.6 g per kg of bodyweight', 'About 5 g per kg of bodyweight', 'About 15 g per kg of bodyweight'],
    answer: 1,
  },
  {
    q: 'DOMS stands for…',
    choices: ['Daily Optimal Muscle Score', 'Delayed Onset Muscle Soreness', 'Dynamic Olympic Movement Set', 'Deep Oxygen Muscle Strain'],
    answer: 1,
  },
  {
    q: 'Which is generally considered a warning sign of overtraining?',
    choices: ['Better sleep than usual', 'Persistent fatigue and an elevated resting heart rate', 'Faster recovery between sessions', 'Steadily increasing motivation'],
    answer: 1,
  },
  {
    q: 'Holding a single stretch position for 20–60 seconds is best described as…',
    choices: ['Dynamic stretching', 'Static stretching', 'Ballistic stretching', 'Plyometric training'],
    answer: 1,
  },
  {
    q: 'To lose roughly 1 lb (~0.45 kg) of body fat per week, the approximate daily caloric deficit needed is…',
    choices: ['About 100 calories', 'About 500 calories', 'About 2,000 calories', 'About 5,000 calories'],
    answer: 1,
  },
  {
    q: 'A simple rough estimate for maximum heart rate is…',
    choices: ['Always 200 bpm', '220 minus your age', 'Resting heart rate × 3', '100 plus your weight in kg'],
    answer: 1,
  },
  {
    q: 'Sleep duration most commonly recommended for adults is…',
    choices: ['4 to 5 hours', '7 to 9 hours', '10 to 12 hours', '14 or more hours'],
    answer: 1,
  },
  {
    q: 'For most healthy adults, squatting deeply with knees travelling past the toes is…',
    choices: ['Always harmful to the knees', 'A natural movement that is generally safe', 'Only acceptable for elite athletes', 'Only safe while wearing a back brace'],
    answer: 1,
  },
  {
    q: 'VO₂ max measures…',
    choices: ['Maximum bench press weight', 'The body\'s maximum oxygen uptake during exercise', 'Body fat percentage', 'Flexibility of the lower back'],
    answer: 1,
  },
  {
    q: 'The best general approach for losing fat while preserving muscle is…',
    choices: ['Cardio only, with no eating', 'A moderate calorie deficit + adequate protein + strength training', 'Total starvation for a week', 'Cardio every day with no rest days'],
    answer: 1,
  },
  {
    q: 'Most well-designed strength programs include at least…',
    choices: ['0 rest days per week', '1 rest day per week', '5 rest days per week', '7 rest days per week (no training)'],
    answer: 1,
  },
];

export default function FitnessCheck({ S, update, onClose }) {
  return (
    <SelfCheck
      S={S}
      update={update}
      onClose={onClose}
      stateKey="fitnessScore"
      testVersion={TEST_VERSION}
      questions={QUESTIONS}
      eyebrow="FITNESS CHECK"
      completeEyebrow="FITNESS KNOWLEDGE SELF-CHECK · COMPLETE"
      feedsLabel="feeds your Fitness rating"
      resultBlurb="This isn't medical or training advice — it's a one-off snapshot of general exercise-science knowledge used to seed the Fitness category of your OVR."
    />
  );
}
