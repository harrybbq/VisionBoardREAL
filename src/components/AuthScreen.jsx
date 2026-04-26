import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

/**
 * AuthScreen
 *
 * Login / signup / reset surface, redesigned to match the cream Hub's
 * visual language so the moment a user authenticates there's no
 * visual jolt — same parchment surface, same forest-green accent,
 * same Playfair italic + DM Mono eyebrow rhythm used throughout the
 * Hub and its panels.
 *
 * The card shell is static — only the inner heading + form animate
 * on mode switch, so the user's eye can stay anchored.
 *
 * Mode-specific copy (eyebrow / heading / submit label) lives in the
 * three lookup objects below; everything else is mode-agnostic.
 */

const EYEBROWS = {
  login:  '// Sign in',
  signup: '// Create account',
  reset:  '// Reset password',
};
const HEADINGS = {
  login:  'Welcome back.',
  signup: 'Start your board.',
  reset:  'Forgot your password?',
};
const SUBMIT_LBL = {
  login:  'SIGN IN →',
  signup: 'CREATE ACCOUNT →',
  reset:  'SEND RESET EMAIL →',
};

// Shared motion tokens. Subtle 6px slide + fade — enough to register
// as "the form changed" without feeling like a transition between
// pages.
const contentMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};
const exitFastMotion = {
  ...contentMotion,
  transition: { duration: 0.18, ease: 'easeIn' },
};

function Spinner() {
  // Inline SVG so we don't need to ship an icon library for one button.
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <path d="M8 2 A6 6 0 0 1 14 8" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 8 8" to="360 8 8" dur="0.7s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export default function AuthScreen({ onOpenLegal }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('vb4_remember') !== '0');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [capsLock, setCapsLock] = useState(false);

  const switchMode = useCallback(next => {
    setMode(next); setError(''); setInfo('');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('vb4_remember', rememberMe ? '1' : '0');
      } else if (mode === 'signup') {
        if (!ageConfirmed) {
          setError('Please confirm you are 13 or older.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Check your email to confirm your account, then log in.');
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setInfo('Password reset email sent. Check your inbox.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.overlay}>
      {/* Brand mark — sits above the card, not inside it, so the
          wordmark introduces the form rather than competing with
          the heading. */}
      <div style={S.logoWrap}>
        <div style={S.logoMark}>V</div>
        <div>
          <div style={S.logoTitle}>Vision Board</div>
          <div style={S.logoSub}>my space</div>
        </div>
      </div>

      {/* Card — static. Only the contents swap. */}
      <div className="auth-card" style={S.card}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`h-${mode}`} {...contentMotion}>
            <div style={S.eyebrow}>{EYEBROWS[mode]}</div>
            <h1 style={S.heading}>{HEADINGS[mode]}</h1>
          </motion.div>
        </AnimatePresence>

        {error && <div style={S.errorBanner} role="alert" aria-live="assertive">{error}</div>}
        {info  && <div style={S.infoBanner}  role="status" aria-live="polite">{info}</div>}

        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={`f-${mode}`}
            onSubmit={handleSubmit}
            style={S.form}
            noValidate
            initial={exitFastMotion.initial}
            animate={contentMotion.animate}
            exit={exitFastMotion.exit}
            transition={contentMotion.transition}
          >
            <div style={S.fg}>
              <label htmlFor="auth-email" style={S.label}>Email</label>
              <input
                id="auth-email"
                className="auth-input"
                style={S.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {mode !== 'reset' && (
              <div style={S.fg}>
                <label htmlFor="auth-pw" style={S.label}>Password</label>
                <input
                  id="auth-pw"
                  className="auth-input"
                  style={S.input}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  onBlur={() => setCapsLock(false)}
                  required
                  minLength={6}
                />
                {capsLock && <span style={S.capsHint}>⇪ Caps Lock is on</span>}
              </div>
            )}

            {mode === 'login' && (
              <label style={S.checkLabel} htmlFor="auth-remember">
                <input
                  id="auth-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={S.checkbox}
                />
                <span style={S.checkText}>Remember me</span>
              </label>
            )}

            {mode === 'signup' && (
              <label style={{ ...S.checkLabel, alignItems: 'flex-start' }} htmlFor="auth-age">
                <input
                  id="auth-age"
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={e => setAgeConfirmed(e.target.checked)}
                  style={{ ...S.checkbox, marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ ...S.checkText, lineHeight: 1.55 }}>
                  I am 13 years of age or older and I agree to the{' '}
                  <button type="button" onClick={() => onOpenLegal?.('terms')} style={S.inlineLegal}>Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => onOpenLegal?.('privacy')} style={S.inlineLegal}>Privacy Policy</button>
                </span>
              </label>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="auth-submit"
              style={{ ...S.btn, opacity: loading ? 0.82 : 1 }}
              whileHover={loading ? undefined : { y: -1 }}
              whileTap={loading ? undefined : { y: 0 }}
              transition={{ duration: 0.14 }}
            >
              {loading ? <><Spinner />PLEASE WAIT…</> : SUBMIT_LBL[mode]}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Mode-switch links */}
        <div style={S.links}>
          {mode === 'login' && (
            <>
              <button type="button" className="auth-mode-link" onClick={() => switchMode('signup')}>No account? Sign up</button>
              <button type="button" className="auth-mode-link" onClick={() => switchMode('reset')}>Forgot password?</button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" className="auth-mode-link" onClick={() => switchMode('login')}>← Back to sign in</button>
          )}
        </div>

        {/* Legal footer */}
        <div style={S.legalFooter}>
          <button type="button" className="auth-legal-link" onClick={() => onOpenLegal?.('privacy')}>Privacy Policy</button>
          <span style={{ color: 'var(--border)', fontSize: 11 }}>·</span>
          <button type="button" className="auth-legal-link" onClick={() => onOpenLegal?.('terms')}>Terms of Service</button>
        </div>
      </div>
    </div>
  );
}

// All visuals are inline-style objects so the file is self-contained
// and matches the convention the rest of the app uses for "leaf"
// surfaces (the Hub uses index.css; small components like this one
// keep their styles co-located). The only CSS that lives outside is
// the pseudo-class behaviour (:focus on inputs, :hover on link
// buttons) — see the .auth-input / .auth-mode-link / .auth-legal-link
// rules in index.css.
const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'var(--sans, "DM Sans", sans-serif)',
    backgroundColor: 'var(--bg-base, #f8f4ec)',
    backgroundImage: [
      'radial-gradient(circle at 20% 0%, rgba(26,122,74,0.05), transparent 60%)',
      'radial-gradient(circle at 80% 100%, rgba(26,122,74,0.06), transparent 55%)',
    ].join(', '),
    overflowY: 'auto',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoMark: {
    width: 40, height: 40,
    background: 'linear-gradient(145deg, var(--em-mid, #2a9e62) 0%, var(--em, #1a7a4a) 100%)',
    borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--display, "Playfair Display", serif)',
    fontSize: 20, fontStyle: 'italic', color: '#fff',
    boxShadow: '0 4px 14px rgba(26,122,74,0.28)',
  },
  logoTitle: {
    fontFamily: 'var(--display, "Playfair Display", serif)',
    fontSize: 17, fontStyle: 'italic', fontWeight: 600,
    color: 'var(--em, #1a7a4a)', lineHeight: 1.15,
  },
  logoSub: {
    fontFamily: 'var(--mono, "DM Mono", monospace)',
    fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase',
    color: 'var(--text-muted, #8a8278)', marginTop: 2,
  },

  card: {
    background: 'var(--bg-raised, #fdfaf3)',
    border: '1px solid var(--border, #e2dccf)',
    borderRadius: 18,
    padding: '36px 36px 28px',
    width: '100%', maxWidth: 420,
    boxShadow: [
      '0 1px 0 rgba(255,255,255,0.7) inset',
      '0 14px 36px rgba(26,122,74,0.10)',
      '0 2px 8px rgba(28,26,23,0.06)',
    ].join(', '),
  },

  eyebrow: {
    fontFamily: 'var(--mono, "DM Mono", monospace)',
    fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase',
    color: 'var(--em-mid, #2a9e62)', marginBottom: 6, fontWeight: 500,
  },
  heading: {
    fontFamily: 'var(--display, "Playfair Display", serif)',
    fontSize: 26, fontStyle: 'italic', fontWeight: 600,
    color: 'var(--em, #1a7a4a)',
    marginBottom: 22, lineHeight: 1.15, letterSpacing: '-0.3px',
  },

  errorBanner: {
    background: 'rgba(220,38,38,0.07)',
    border: '1px solid rgba(220,38,38,0.22)',
    borderRadius: 9, padding: '10px 14px',
    color: '#b91c1c', fontSize: 13, lineHeight: 1.5, marginBottom: 14,
  },
  infoBanner: {
    background: 'rgba(26,122,74,0.07)',
    border: '1px solid rgba(26,122,74,0.22)',
    borderRadius: 9, padding: '10px 14px',
    color: 'var(--em, #1a7a4a)', fontSize: 13, lineHeight: 1.5, marginBottom: 14,
  },

  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  fg:   { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontFamily: 'var(--mono, "DM Mono", monospace)',
    fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase',
    color: 'var(--text-muted, #8a8278)', fontWeight: 500,
  },
  input: {
    background: 'var(--bg-overlay, #f0eadd)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border, #e2dccf)',
    borderRadius: 10,
    padding: '10px 13px',
    color: 'var(--text, #1c1a17)', fontSize: 14,
    fontFamily: 'var(--sans, "DM Sans", sans-serif)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  },
  capsHint: {
    fontFamily: 'var(--mono, "DM Mono", monospace)',
    fontSize: 9, letterSpacing: '1px',
    color: 'var(--text-muted, #8a8278)', marginTop: 3,
  },

  checkLabel: { display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' },
  checkbox:   { width: 15, height: 15, accentColor: 'var(--em, #1a7a4a)', cursor: 'pointer' },
  checkText:  { fontSize: 13, color: 'var(--text-mid, #4a4540)', fontFamily: 'var(--sans, "DM Sans", sans-serif)' },
  inlineLegal: {
    background: 'none', border: 'none', padding: 0,
    color: 'var(--em, #1a7a4a)', fontSize: 13, cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'var(--sans, "DM Sans", sans-serif)',
  },

  btn: {
    marginTop: 4,
    background: 'linear-gradient(180deg, var(--em-mid, #2a9e62) 0%, var(--em, #1a7a4a) 100%)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 16px', fontSize: 11, fontWeight: 500,
    fontFamily: 'var(--mono, "DM Mono", monospace)', letterSpacing: '1.5px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(26,122,74,0.28)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%',
  },

  links: {
    marginTop: 18,
    display: 'flex', flexDirection: 'column', gap: 8,
    alignItems: 'center',
  },
  legalFooter: {
    marginTop: 20, paddingTop: 16,
    borderTop: '1px solid var(--border, #e2dccf)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
};
