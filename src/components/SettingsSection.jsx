import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export const SCHEMES = [
  { id: 'green',  name: 'Forest Green', em: '#1a7a4a', mid: '#2a9e62', light: '#4dc485', grad: 'linear-gradient(145deg,#f0f7f3 0%,#d8eee5 40%,#b0d9c5 70%,#7ec8a8 100%)' },
  { id: 'blue',   name: 'Ocean Blue',   em: '#1a4a7a', mid: '#2a629e', light: '#4d9ec4', grad: 'linear-gradient(145deg,#f0f3f7 0%,#d8e5ee 40%,#b0c5d9 70%,#7ea8c8 100%)' },
  { id: 'purple', name: 'Purple',       em: '#5a1a7a', mid: '#7a2a9e', light: '#a44dc4', grad: 'linear-gradient(145deg,#f4f0f7 0%,#e5d8ee 40%,#d0b0d9 70%,#b87ec8 100%)' },
  { id: 'orange', name: 'Sunset',       em: '#7a3a1a', mid: '#9e5a2a', light: '#c47a4d', grad: 'linear-gradient(145deg,#f7f3f0 0%,#eee0d8 40%,#d9c0b0 70%,#c8977e 100%)' },
  { id: 'pink',   name: 'Rose',         em: '#7a1a4a', mid: '#9e2a62', light: '#c44d85', grad: 'linear-gradient(145deg,#f7f0f3 0%,#eed8e5 40%,#d9b0c5 70%,#c87ea8 100%)' },
  { id: 'slate',  name: 'Slate',        em: '#1a3a5a', mid: '#2a5a8e', light: '#4d8ab0', grad: 'linear-gradient(145deg,#f0f2f7 0%,#d8dfe8 40%,#b0bece 70%,#7ea0be 100%)' },
];

export function applyScheme(scheme) {
  const r = document.documentElement;
  r.style.setProperty('--em', scheme.em);
  r.style.setProperty('--em-mid', scheme.mid);
  r.style.setProperty('--em-light', scheme.light);
  r.style.setProperty('--grad', scheme.grad);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function SettingsSection({ S, update, active, userId, onOpenLegal }) {
  const [deleting, setDeleting] = useState(false);
  const currentScheme = S.colorScheme || 'green';

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
