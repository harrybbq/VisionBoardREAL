/**
 * BrainCheck — F5 Sprint 4.
 *
 * A 16-question self-check that contributes to the Brain rating
 * (see src/lib/ratings/derive.js → brainScorePoints).
 *
 * Deliberately NOT called "IQ test" in user-facing copy — "Brain
 * rating self-check" avoids implying clinical validity. The score
 * range (70-130) matches the conventional bell curve so it reads
 * like a familiar IQ scale to anyone who recognises it, but no
 * standardisation, no norming, no claims.
 *
 * Mechanics:
 *   - 16 multiple-choice questions, 4 options each
 *   - 12-minute overall timer (auto-submits when it runs out)
 *   - One pass through; no go-back, no skip-and-return — keeps
 *     this short and game-able-by-effort, not by gaming the UI
 *   - Result = 70 + (correct / 16) × 60, rounded to int
 *     (0 right → 70, 8 → 100, 16 → 130)
 *   - Saved to S.brainScore = { result, ts, testVersion }
 *   - Re-takeable every 30 days (gate enforced by callers via
 *     `isCooldownActive` exported below)
 *
 * Question bank: pure text reasoning across sequences / analogies /
 * word logic / quick maths. No visual matrix patterns (would need
 * SVG and bog us down) and no domain knowledge questions (would
 * unfairly favour certain backgrounds).
 *
 * testVersion = 1. If the bank ever gets re-balanced, bump the
 * version so historical scores aren't compared against new ones.
 */

import { useEffect, useState } from 'react';

const TEST_VERSION = 1;
const TIME_LIMIT_MS = 12 * 60 * 1000;
const COOLDOWN_DAYS = 30;

/**
 * Returns true when the user can take the check right now (no recent
 * result, or the last result is older than COOLDOWN_DAYS).
 */
export function isCooldownActive(brainScore) {
  if (!brainScore?.ts) return false;
  const ageMs = Date.now() - new Date(brainScore.ts).getTime();
  return ageMs < COOLDOWN_DAYS * 86_400_000;
}

export function daysUntilRetake(brainScore) {
  if (!brainScore?.ts) return 0;
  const ageMs = Date.now() - new Date(brainScore.ts).getTime();
  const remaining = COOLDOWN_DAYS * 86_400_000 - ageMs;
  return Math.max(0, Math.ceil(remaining / 86_400_000));
}

// Question bank — each entry: { q, choices: [4], answer: index }
// Keep this list at exactly 16 — the scoring formula assumes it.
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

function scoreFromAnswers(answers) {
  // answers is an array of selected indices (or null for skipped/timeout)
  let correct = 0;
  for (let i = 0; i < QUESTIONS.length; i++) {
    if (answers[i] === QUESTIONS[i].answer) correct++;
  }
  const result = Math.round(70 + (correct / QUESTIONS.length) * 60);
  return { correct, total: QUESTIONS.length, result };
}

function pad2(n) { return String(n).padStart(2, '0'); }

export default function BrainCheck({ S, update, onClose }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));
  const [done, setDone] = useState(false);
  const [startMs] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  // Timer — tick every second so we can show countdown + auto-submit
  // when we hit the limit.
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      const el = Date.now() - startMs;
      setElapsedMs(el);
      if (el >= TIME_LIMIT_MS) {
        clearInterval(id);
        finishTest(answers);
      }
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, answers]);

  function pick(choiceIdx) {
    const next = [...answers];
    next[idx] = choiceIdx;
    setAnswers(next);
    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
    } else {
      finishTest(next);
    }
  }

  function finishTest(finalAnswers) {
    const { result } = scoreFromAnswers(finalAnswers);
    update(prev => ({
      ...prev,
      brainScore: {
        result,
        ts: new Date().toISOString(),
        testVersion: TEST_VERSION,
      },
    }));
    setDone(true);
  }

  const remainingMs = Math.max(0, TIME_LIMIT_MS - elapsedMs);
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const progressPct = ((idx + (done ? 1 : 0)) / QUESTIONS.length) * 100;

  // ── Result screen ──
  if (done) {
    const { correct, total, result } = scoreFromAnswers(answers);
    return (
      <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal" style={{ maxWidth: 460 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1.6,
            textTransform: 'uppercase', color: 'var(--em)', fontWeight: 700,
            marginBottom: 4,
          }}>// BRAIN RATING SELF-CHECK · COMPLETE</div>
          <h2 style={{
            fontFamily: 'var(--serif, Georgia, serif)', fontStyle: 'italic',
            fontWeight: 600, fontSize: 56, margin: '8px 0 4px',
            color: 'var(--text)', letterSpacing: -1,
          }}>{result}</h2>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.6,
            color: 'var(--text-muted)', margin: '0 0 16px',
          }}>
            {correct}/{total} correct · feeds your Brain rating
          </p>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.6,
            color: 'var(--text)', margin: '0 0 14px',
          }}>
            This isn't a clinical IQ test — it's a one-off snapshot used to
            seed the Brain category of your OVR. Re-takeable every {COOLDOWN_DAYS} days.
            Your overall rating updates on the next refresh.
          </p>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>Got it</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Test screen ──
  const Q = QUESTIONS[idx];
  return (
    <div className="modal-overlay open" onClick={() => { /* don't dismiss mid-test */ }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1.6,
          textTransform: 'uppercase', color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          <span style={{ color: 'var(--em)', fontWeight: 700 }}>
            // BRAIN CHECK · {String(idx + 1).padStart(2, '0')} / {QUESTIONS.length}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            ⏱ {pad2(mm)}:{pad2(ss)}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{
          height: 4, background: 'var(--border)', borderRadius: 2,
          overflow: 'hidden', marginBottom: 18,
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: 'var(--em)', transition: 'width .3s ease',
          }} />
        </div>

        <h3 style={{
          fontFamily: 'var(--serif, Georgia, serif)', fontStyle: 'italic',
          fontWeight: 600, fontSize: 18, lineHeight: 1.4,
          color: 'var(--text)', margin: '0 0 18px',
        }}>{Q.q}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Q.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              style={{
                padding: '12px 14px', borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card, rgba(255,255,255,0.04))',
                color: 'var(--text)',
                fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 500,
                textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all .12s',
              }}
              className="brain-check-choice"
            >
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1 }}>{choice}</span>
            </button>
          ))}
        </div>

        <p style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 0.6,
          color: 'var(--text-muted)', marginTop: 14, marginBottom: 0,
          textAlign: 'center',
        }}>
          One pass · no go-back · auto-submits at 0:00
        </p>
      </div>
    </div>
  );
}
