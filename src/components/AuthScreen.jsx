import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ onOpenLegal }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('vb4_remember') !== '0');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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
        if (!ageConfirmed) { setError('Please confirm you are 13 or older.'); setLoading(false); return; }
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
    <div style={styles.overlay} id="authOverlay">
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>V</div>
          <div>
            <div style={styles.logoTitle}>Vision Board</div>
            <div style={styles.logoSub}>my space</div>
          </div>
        </div>

        <h2 style={styles.heading}>
          {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h2>

        {error && <div style={styles.error}>{error}</div>}
        {info && <div style={styles.info}>{info}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fg}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          {mode !== 'reset' && (
            <div style={styles.fg}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'login' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--em, #2a9e62)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>Remember me</span>
            </label>
          )}

          {mode === 'signup' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={e => setAgeConfirmed(e.target.checked)}
                style={{ width: '15px', height: '15px', marginTop: '1px', accentColor: 'var(--em, #2a9e62)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', lineHeight: 1.5 }}>
                I am 13 years of age or older and I agree to the{' '}
                <button type="button" onClick={() => onOpenLegal?.('terms')} style={styles.legalLink}>Terms of Service</button>
                {' '}and{' '}
                <button type="button" onClick={() => onOpenLegal?.('privacy')} style={styles.legalLink}>Privacy Policy</button>
              </span>
            </label>
          )}

          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
          </button>
        </form>

        <div style={styles.links}>
          {mode === 'login' && (
            <>
              <button style={styles.link} onClick={() => { setMode('signup'); setError(''); setInfo(''); }}>
                No account? Sign up
              </button>
              <button style={styles.link} onClick={() => { setMode('reset'); setError(''); setInfo(''); }}>
                Forgot password?
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button style={styles.link} onClick={() => { setMode('login'); setError(''); setInfo(''); }}>
              Back to sign in
            </button>
          )}
        </div>

        {/* Legal footer */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button type="button" onClick={() => onOpenLegal?.('privacy')} style={styles.legalLink}>Privacy Policy</button>
          <span style={{ color: 'rgba(255,255,255,.15)', fontSize: '11px' }}>·</span>
          <button type="button" onClick={() => onOpenLegal?.('terms')} style={styles.legalLink}>Terms of Service</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundImage: 'url(/login-bg-desktop.jpg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--sans, DM Sans, sans-serif)',
  },
  card: {
    background: 'var(--card, #181c24)',
    border: '1px solid var(--border, #2a2f3a)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '38px', height: '38px',
    background: 'var(--em, #2a9e62)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--serif, Playfair Display, serif)',
    fontWeight: 700, fontSize: '18px',
    color: '#fff',
  },
  logoTitle: {
    fontFamily: 'var(--serif, Playfair Display, serif)',
    fontWeight: 700, fontSize: '16px',
    color: 'var(--text, #e8eaf0)',
  },
  logoSub: {
    fontFamily: 'var(--mono, DM Mono, monospace)',
    fontSize: '10px', color: 'var(--text-muted, #6b7280)',
    letterSpacing: '2px', textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'var(--serif, Playfair Display, serif)',
    fontSize: '22px', fontWeight: 700,
    color: 'var(--text, #e8eaf0)',
    marginBottom: '20px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  fg: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '11px', fontWeight: 600, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--text-muted, #6b7280)',
    fontFamily: 'var(--mono, DM Mono, monospace)',
  },
  input: {
    background: 'var(--input-bg, #0f1117)',
    border: '1px solid var(--border, #2a2f3a)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--text, #e8eaf0)',
    fontSize: '14px',
    fontFamily: 'var(--sans, DM Sans, sans-serif)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: {
    marginTop: '6px',
    background: 'var(--em, #2a9e62)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--sans, DM Sans, sans-serif)',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  links: {
    marginTop: '18px',
    display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
  },
  link: {
    background: 'none', border: 'none',
    color: 'var(--text-muted, #6b7280)',
    fontSize: '12px', cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'var(--sans, DM Sans, sans-serif)',
  },
  legalLink: {
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,.4)',
    fontSize: '11px', cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'var(--sans, DM Sans, sans-serif)',
    padding: 0,
  },
  error: {
    background: 'rgba(220,38,38,0.1)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '8px', padding: '10px 14px',
    color: '#f87171', fontSize: '13px',
    marginBottom: '8px',
  },
  info: {
    background: 'rgba(42,158,98,0.1)',
    border: '1px solid rgba(42,158,98,0.3)',
    borderRadius: '8px', padding: '10px 14px',
    color: '#4ade80', fontSize: '13px',
    marginBottom: '8px',
  },
};
