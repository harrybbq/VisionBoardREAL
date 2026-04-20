import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import MacroGoalsPanel from './MacroGoalsPanel';
import { useSubscriptionContext } from '../context/SubscriptionContext';

export const SCHEMES = [
  { id: 'green',  name: 'Forest Green', em: '#1a7a4a', mid: '#2a9e62', light: '#4dc485', grad: 'linear-gradient(145deg,#f0f7f3 0%,#d8eee5 40%,#b0d9c5 70%,#7ec8a8 100%)' },
  { id: 'blue',   name: 'Ocean Blue',   em: '#1a4a7a', mid: '#2a629e', light: '#4d9ec4', grad: 'linear-gradient(145deg,#f0f3f7 0%,#d8e5ee 40%,#b0c5d9 70%,#7ea8c8 100%)' },
  { id: 'purple', name: 'Purple',       em: '#5a1a7a', mid: '#7a2a9e', light: '#a44dc4', grad: 'linear-gradient(145deg,#f4f0f7 0%,#e5d8ee 40%,#d0b0d9 70%,#b87ec8 100%)' },
  { id: 'orange', name: 'Sunset',       em: '#7a3a1a', mid: '#9e5a2a', light: '#c47a4d', grad: 'linear-gradient(145deg,#f7f3f0 0%,#eee0d8 40%,#d9c0b0 70%,#c8977e 100%)' },
  { id: 'pink',   name: 'Rose',         em: '#7a1a4a', mid: '#9e2a62', light: '#c44d85', grad: 'linear-gradient(145deg,#f7f0f3 0%,#eed8e5 40%,#d9b0c5 70%,#c87ea8 100%)' },
  { id: 'slate',  name: 'Slate',        em: '#1a3a5a', mid: '#2a5a8e', light: '#4d8ab0', grad: 'linear-gradient(145deg,#f0f2f7 0%,#d8dfe8 40%,#b0bece 70%,#7ea0be 100%)' },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Theme modes (Dark OS is Pro-only) ────────────────────────────────────
export const THEMES = [
  {
    id: 'cream', name: 'Cream', tagline: 'Warm parchment · default',
    swatch: 'linear-gradient(145deg,#f7f4ef 0%,#ede8e0 45%,#e0d8cc 100%)',
    pro: false,
  },
  {
    id: 'dark-os', name: 'Dark OS', tagline: 'Control-panel grid · Pro',
    swatch: 'linear-gradient(145deg,#1f1f1c 0%,#131311 55%,#0a0a09 100%)',
    pro: true,
  },
];

/**
 * Apply (or clear) the dark-os theme attribute on <html>.
 * Called on boot from main.jsx and whenever the user toggles the theme.
 * If the user has no Pro entitlement (Pro sub OR Lifetime) we force cream
 * regardless of saved value.
 */
export function applyTheme(theme, { hasPro = false } = {}) {
  const effective = theme === 'dark-os' && hasPro ? 'dark-os' : 'cream';
  const r = document.documentElement;
  if (effective === 'dark-os') r.setAttribute('data-theme', 'dark-os');
  else r.removeAttribute('data-theme');
  return effective;
}

export function applyScheme(scheme) {
  const r = document.documentElement;
  const rgb = hexToRgb(scheme.em);
  r.style.setProperty('--em', scheme.em);
  r.style.setProperty('--em-mid', scheme.mid);
  r.style.setProperty('--em-light', scheme.light);
  r.style.setProperty('--em-rgb', rgb);
  r.style.setProperty('--em-pale', `rgba(${rgb}, 0.16)`);
  r.style.setProperty('--em-ghost', `rgba(${rgb}, 0.06)`);
  r.style.setProperty('--accent-line', `rgba(${rgb}, 0.32)`);
  r.style.setProperty('--accent-line-soft', `rgba(${rgb}, 0.16)`);
  r.style.setProperty('--accent-line-mid', `rgba(${rgb}, 0.48)`);
  r.style.setProperty('--accent-glow',
    `0 1px 0 rgba(255,255,255,.55) inset, 0 1px 0 rgba(${rgb},.04), 0 6px 22px rgba(${rgb},.07)`);
  r.style.setProperty('--accent-glow-hi',
    `0 1px 0 rgba(255,255,255,.6) inset, 0 14px 36px rgba(${rgb},.13)`);
  r.style.setProperty('--grad', scheme.grad);
}

// Optional Dark OS panels users can toggle on/off from settings.
// This list is the source of truth — adding a panel here and gating
// its render in HubOsLayout on S.hubPanels[id] is all that's needed.
export const OPTIONAL_PANELS = [
  {
    id: 'cardio',
    name: 'Cardio calculator',
    tagline: 'MET-based kcal burn · logs to cardioLogs',
  },
];

export default function SettingsSection({ S, update, active, userId, onOpenLegal }) {
  const [deleting, setDeleting] = useState(false);
  const currentScheme = S.colorScheme || 'green';
  const currentTheme = S.theme || 'cream';
  const { hasPro } = useSubscriptionContext();
  const hubPanels = S.hubPanels || {};
  const darkOsActive = currentTheme === 'dark-os' && hasPro;

  function handleThemeChange(themeId) {
    const t = THEMES.find(x => x.id === themeId);
    if (!t) return;
    // Free users can't select the Pro theme — show a nudge instead.
    // Lifetime users count as Pro via hasPro.
    if (t.pro && !hasPro) return;
    applyTheme(themeId, { hasPro });
    update(prev => ({ ...prev, theme: themeId }));
  }

  function handleTogglePanel(panelId) {
    update(prev => ({
      ...prev,
      hubPanels: { ...(prev.hubPanels || {}), [panelId]: !prev.hubPanels?.[panelId] },
    }));
  }

  function handleExportData() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      appVersion: 'VisionBoard v1',
      data: S,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visionboard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSchemeChange(scheme) {
    applyScheme(scheme);
    update(prev => ({ ...prev, colorScheme: scheme.id }));
  }

  async function handleDeleteAccount() {
    if (!window.confirm('This will permanently delete all your data and sign you out. This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? Press OK to confirm deletion.')) return;
    setDeleting(true);
    try {
      await supabase.from('user_data').delete().eq('id', userId);
      await supabase.auth.signOut();
    } catch (e) {
      alert('Error: ' + (e.message || 'Something went wrong.'));
      setDeleting(false);
    }
  }

  return (
    <section id="settings" className={`section${active ? ' active' : ''}`}>
      <motion.div
        style={{ marginBottom: '20px' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="eyebrow">Preferences</div>
        <div className="sec-title">Settings</div>
      </motion.div>

      <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Colour Scheme */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 4px' }}>Colour Scheme</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 18px', letterSpacing: '0.5px' }}>
            Choose an accent colour applied across the whole app.
          </p>
          <div className="scheme-grid">
            {SCHEMES.map(scheme => {
              const isActive = currentScheme === scheme.id;
              return (
                <button
                  key={scheme.id}
                  onClick={() => handleSchemeChange(scheme)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '14px 10px', borderRadius: '12px', cursor: 'pointer',
                    border: isActive ? `2px solid ${scheme.mid}` : '2px solid var(--border)',
                    background: isActive ? `rgba(${hexToRgb(scheme.em)},0.10)` : 'var(--card)',
                    transition: 'all .18s',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: `linear-gradient(135deg,${scheme.em} 0%,${scheme.mid} 55%,${scheme.light} 100%)`,
                    boxShadow: isActive ? `0 4px 14px ${scheme.em}66` : 'none',
                    transition: 'box-shadow .18s',
                  }} />
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.5px',
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 400,
                  }}>
                    {scheme.name}
                  </span>
                  {isActive && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: scheme.mid, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme mode (Dark OS is Pro-only) */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 4px' }}>Theme mode</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 18px', letterSpacing: '0.5px' }}>
            Pick the overall surface treatment. Dark OS turns the hub into a customisable control-panel grid.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {THEMES.map(t => {
              const isActive = currentTheme === t.id;
              const locked = t.pro && !hasPro;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  disabled={locked}
                  style={{
                    position: 'relative', textAlign: 'left',
                    padding: '14px 14px 16px', borderRadius: '12px',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    border: isActive ? '2px solid var(--em)' : '2px solid var(--border)',
                    background: isActive ? 'rgba(var(--em-rgb),0.08)' : 'var(--card, rgba(255,255,255,0.04))',
                    opacity: locked ? 0.6 : 1,
                    transition: 'all .18s',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                  title={locked ? 'Upgrade to Pro to unlock Dark OS' : ''}
                >
                  <div style={{
                    height: '48px', borderRadius: '8px',
                    background: t.swatch,
                    border: '1px solid var(--border)',
                  }} />
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 600,
                      color: 'var(--text)',
                    }}>
                      {t.name}
                      {t.pro && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1.4px',
                          textTransform: 'uppercase', padding: '2px 6px', borderRadius: '3px',
                          background: locked ? 'rgba(200,151,10,0.12)' : 'rgba(var(--em-rgb),0.14)',
                          color: locked ? 'var(--gold)' : 'var(--em)',
                          border: `1px solid ${locked ? 'rgba(200,151,10,0.28)' : 'rgba(var(--em-rgb),0.28)'}`,
                        }}>
                          {locked ? '🔒 Pro' : 'Pro'}
                        </span>
                      )}
                      {isActive && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: '8px', letterSpacing: '1.4px',
                          textTransform: 'uppercase', color: 'var(--em)', marginLeft: 'auto',
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: '10px',
                      color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '4px',
                    }}>
                      {t.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {!hasPro && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', margin: '14px 0 0', letterSpacing: '0.5px' }}>
              Dark OS is part of Pro. Upgrade to unlock the control-panel hub and colour-scheme customisation.
            </p>
          )}
        </div>

        {/* Dark OS optional panels (visible only when Dark OS is active) */}
        {darkOsActive && (
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px' }}>Dark OS panels</h3>
            <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 18px', letterSpacing: '0.5px' }}>
              Optional add-ons for your control panel. Toggle on what you want to see in the hub.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {OPTIONAL_PANELS.map(p => {
                const on = !!hubPanels[p.id];
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 14px', borderRadius: '10px',
                      border: on ? '2px solid var(--em)' : '2px solid var(--border)',
                      background: on ? 'rgba(var(--em-rgb),0.08)' : 'var(--card, rgba(255,255,255,0.04))',
                      cursor: 'pointer', transition: 'all .18s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => handleTogglePanel(p.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--em)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '2px' }}>
                        {p.tagline}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '1.4px',
                      textTransform: 'uppercase', color: on ? 'var(--em)' : 'var(--text-muted)',
                    }}>
                      {on ? 'On' : 'Off'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Data & Privacy */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 4px' }}>Your Data</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.7' }}>
            Download a copy of all your Vision Board data as a JSON file. This satisfies your right to data portability under UK GDPR.
          </p>
          <button
            onClick={handleExportData}
            style={{
              background: 'rgba(255,255,255,.07)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text)', padding: '10px 18px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--sans)', transition: 'all .18s',
            }}
          >
            ⬇ Export My Data
          </button>
          {onOpenLegal && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '14px' }}>
              <button onClick={() => onOpenLegal('privacy')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--sans)', padding: 0 }}>
                Privacy Policy
              </button>
              <button onClick={() => onOpenLegal('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--sans)', padding: 0 }}>
                Terms of Service
              </button>
            </div>
          )}
        </div>

        {/* Nutrition Goals */}
        {userId && <MacroGoalsPanel userId={userId} />}

        {/* Walkthrough / tour */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 4px' }}>Walkthrough</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.7' }}>
            Replay the 30-second intro tour — useful if you want a refresher or you skipped it the first time.
          </p>
          <button
            type="button"
            className="tut-replay-btn"
            onClick={() => update(prev => ({ ...prev, tutorialCompleted: false }))}
          >
            <span aria-hidden="true">↺</span> Replay tutorial
          </button>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ padding: '22px', borderColor: 'rgba(220,38,38,0.3)' }}>
          <h3 style={{ margin: '0 0 4px', color: '#f87171' }}>Danger Zone</h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.7' }}>
            Permanently deletes all boards, trackers, achievements, and settings. Your login email is retained for re-registration.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            style={{
              background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.35)',
              borderRadius: '10px', color: '#f87171', padding: '10px 18px',
              fontSize: '13px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--sans)', opacity: deleting ? 0.6 : 1, transition: 'all .18s',
            }}
          >
            {deleting ? 'Deleting…' : '🗑 Delete All Data'}
          </button>
        </div>

      </div>
    </section>
  );
}
