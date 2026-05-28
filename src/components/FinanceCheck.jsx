/**
 * FinanceCheck — F5 Sprint 5.
 *
 * 16-question financial literacy self-check. Same engine, same
 * scoring (70-130) and same 30-day cooldown as BrainCheck.
 *
 * Bank covers compound interest, inflation, diversification, debt
 * costs, market terminology, and budgeting heuristics. No region-
 * specific tax rules — we want this to read as basic literacy that
 * applies whatever country the user is in.
 */

import SelfCheck from './SelfCheck';

const TEST_VERSION = 1;

const QUESTIONS = [
  {
    q: 'You put £100 in an account earning 5% interest per year, compounded annually. How much do you have after 2 years?',
    choices: ['£105', '£110', '£110.25', '£125'],
    answer: 2,
  },
  {
    q: 'If inflation is 3% per year, £100 today will buy roughly how much in 10 years?',
    choices: ['£30 of goods', '£74 of goods', '£100 of goods', '£130 of goods'],
    answer: 1,
  },
  {
    q: 'Which is generally considered the highest-risk option of these?',
    choices: ['Government bonds', 'A broad index fund', 'A single individual stock', 'A savings account'],
    answer: 2,
  },
  {
    q: 'APR stands for…',
    choices: ['Annual Profit Return', 'Annual Percentage Rate', 'Average Price Ratio', 'Adjusted Personal Rate'],
    answer: 1,
  },
  {
    q: 'A commonly recommended emergency fund size is…',
    choices: ['1 week of expenses', '1 month of expenses', '3 to 6 months of expenses', '5 years of expenses'],
    answer: 2,
  },
  {
    q: 'Diversification means…',
    choices: ['Buying lots of the same stock', 'Spreading money across different assets to reduce risk', 'Day trading frequently', 'Avoiding all investment risk'],
    answer: 1,
  },
  {
    q: 'You owe £2,000 on a credit card at 20% APR and only pay the minimum each month. Most likely outcome:',
    choices: ['Balance falls quickly', 'Balance stays flat', 'Balance grows over time as interest accrues faster than payments', 'You earn cashback that offsets the interest'],
    answer: 2,
  },
  {
    q: 'A "bull market" describes…',
    choices: ['A period of falling prices', 'A period of rising prices', 'A market that is closed', 'A market with no volatility'],
    answer: 1,
  },
  {
    q: 'Historically, over 20+ years, which has had the highest average return?',
    choices: ['Cash in a savings account', 'Government bonds', 'A diversified stock portfolio', 'Gold under your mattress'],
    answer: 2,
  },
  {
    q: 'Compound interest is best described as…',
    choices: ['Interest paid only on the original amount', 'Interest paid on the principal plus accumulated interest', 'A one-time flat fee', 'Tax-free interest by law'],
    answer: 1,
  },
  {
    q: 'A widely-cited rule says total housing costs should generally not exceed roughly what share of take-home pay?',
    choices: ['10%', '30%', '50%', '80%'],
    answer: 1,
  },
  {
    q: 'Index funds typically have…',
    choices: ['Higher management fees than active funds', 'Lower management fees than most active funds', 'No volatility', 'Guaranteed returns'],
    answer: 1,
  },
  {
    q: 'If you carry several debts, the mathematically cheapest approach is generally to attack the one with the highest…',
    choices: ['Balance', 'Interest rate', 'Minimum payment', 'Age'],
    answer: 1,
  },
  {
    q: 'A credit score primarily reflects…',
    choices: ['Your annual salary', 'Your history of borrowing and repaying reliably', 'Your total net worth', 'Your investment returns'],
    answer: 1,
  },
  {
    q: 'Using the "Rule of 72": at a 7% annual return, money roughly doubles in about how many years?',
    choices: ['About 5 years', 'About 10 years', 'About 20 years', 'About 40 years'],
    answer: 1,
  },
  {
    q: 'For most people, the biggest long-term driver of wealth is…',
    choices: ['Picking winning stocks', 'A high saving rate sustained over many years', 'Avoiding all taxes', 'Lottery wins'],
    answer: 1,
  },
];

export default function FinanceCheck({ S, update, onClose }) {
  return (
    <SelfCheck
      S={S}
      update={update}
      onClose={onClose}
      stateKey="financeScore"
      testVersion={TEST_VERSION}
      questions={QUESTIONS}
      eyebrow="FINANCE CHECK"
      completeEyebrow="FINANCE LITERACY SELF-CHECK · COMPLETE"
      feedsLabel="feeds your Finance rating"
      resultBlurb="This isn't financial advice — it's a one-off snapshot of basic money literacy used to seed the Finance category of your OVR."
    />
  );
}
