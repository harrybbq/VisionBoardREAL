import { useState, useRef } from 'react';

function Modal({ id, openId, onClose, children, style }) {
  return (
    <div
      className={`modal-overlay${openId === id ? ' open' : ''}`}
      id={id}
      onClick={e => { if (e.target === e.currentTarget) onClose(id); }}
    >
      <div className="modal" style={style}>
        {children}
      </div>
    </div>
  );
}

// ── Add Widget picker ──
function AddLinkModal({ openId, onClose, onSwitchModal, onAddNotepad }) {
  return (
    <Modal id="addLinkModal" openId={openId} onClose={onClose}>
      <h3>Add Widget</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
        <button className="btn btn-ghost" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', borderRadius: '12px', height: 'auto' }}
          onClick={() => onSwitchModal('addLinkOnlyModal')}>
          <span style={{ fontSize: '22px' }}>🔗</span>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>Default Link</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>URL bookmark or GitHub profile</span>
        </button>
        <button className="btn btn-ghost" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', borderRadius: '12px', height: 'auto' }}
          onClick={() => { onClose('addLinkModal'); onAddNotepad(); }}>
          <span style={{ fontSize: '22px' }}>📝</span>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>Notepad</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick notes & tasks for today</span>
        </button>
        <button className="btn btn-ghost" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', borderRadius: '12px', height: 'auto' }}
          onClick={() => onSwitchModal('addYouTubeModal')}>
          <span style={{ fontSize: '22px' }}>▶</span>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>YouTube Feed</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latest uploads from a channel</span>
        </button>
      </div>
      <div className="modal-actions" style={{ marginTop: '14px' }}>
        <button className="btn btn-ghost" onClick={() => onClose('addLinkModal')}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── Add Link ──
function AddLinkOnlyModal({ openId, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', url: '', icon: '', color: '#1a7a4a', notes: '' });
  function submit() {
    if (!form.name || !form.url) return;
    const ghMatch = form.url.match(/github\.com\/([^\/\?#]+)/);
    const ghUser = ghMatch ? ghMatch[1] : null;
    onAdd({ id: 'l' + Date.now(), name: form.name, url: form.url, icon: form.icon || '🔗', color: form.color, notes: form.notes, ghUser });
    setForm({ name: '', url: '', icon: '', color: '#1a7a4a', notes: '' });
    onClose('addLinkOnlyModal');
  }
  return (
    <Modal id="addLinkOnlyModal" openId={openId} onClose={onClose}>
      <h3>Add Link</h3>
      <div className="fg"><label>Name</label><input type="text" placeholder="e.g. Twitter" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="fg"><label>URL</label><input type="url" placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
      <div className="fg"><label>Icon (emoji)</label><input type="text" placeholder="🔗" maxLength={2} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} /></div>
      <div className="fg"><label>Colour</label><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
      <div className="fg"><label>Notes (optional)</label><input type="text" placeholder="Brief description..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addLinkOnlyModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Add</button>
      </div>
    </Modal>
  );
}

// ── Add YouTube Widget ──
function AddYouTubeModal({ openId, onClose, onAdd }) {
  const [apiKey, setApiKey] = useState('');
  const [channelList, setChannelList] = useState('');
  function submit() {
    if (!apiKey || !channelList.trim()) return;
    const channels = channelList.split('\n').map(s => s.trim()).filter(Boolean);
    if (!channels.length) return;
    onAdd({ id: 'yt' + Date.now(), apiKey, channels });
    setApiKey(''); setChannelList('');
    onClose('addYouTubeModal');
  }
  return (
    <Modal id="addYouTubeModal" openId={openId} onClose={onClose} style={{ maxWidth: '500px' }}>
      <h3>▶ YouTube Subscriptions Feed</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
        Shows the 5 newest uploads from each of your subscribed channels. Requires a free <strong style={{ color: 'var(--text)' }}>YouTube Data API v3</strong> key from <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--em)' }}>Google Cloud Console</a>.
      </p>
      <div className="fg"><label>YouTube Data API v3 Key</label><input type="text" placeholder="AIzaSy..." value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
      <div className="fg">
        <label>Channel IDs or Handles (one per line)</label>
        <textarea
          placeholder={"@mkbhd\nUCBcRF18a7Qf58cCRy5xuWwQ\n@veritasium"}
          value={channelList}
          onChange={e => setChannelList(e.target.value)}
          style={{ height: '110px', resize: 'vertical', width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 13px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '12px', outline: 'none' }}
        />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addYouTubeModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Add Feed Widget</button>
      </div>
    </Modal>
  );
}

// ── Coin History ──
function CoinHistoryModal({ openId, onClose, coins, coinHistory }) {
  return (
    <Modal id="coinHistoryModal" openId={openId} onClose={onClose} style={{ maxWidth: '420px' }}>
      <h3>⬡ Coin Wallet</h3>
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '42px', fontWeight: 700, color: 'var(--gold)' }}>{coins}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Available Coins</div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '8px' }}>History</div>
      <div className="coin-history-list">
        {(!coinHistory || coinHistory.length === 0)
          ? <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-muted)', padding: '20px' }}>No transactions yet — complete achievements to earn coins!</div>
          : coinHistory.slice(0, 30).map((h, i) => {
            const pos = h.amount > 0;
            const label = h.type === 'earn' ? '⬡ Earned — ' : h.type === 'spend' ? '⬡ Spent on ' : '⬡ Refund — ';
            const ts = new Date(h.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return (
              <div key={i} className="coin-hist-row">
                <div>
                  <div className="coin-hist-label">{label}{h.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{ts}</div>
                </div>
                <div className={`coin-hist-amount ${pos ? 'pos' : 'neg'}`}>{pos ? '+' : ''}{h.amount}</div>
              </div>
            );
          })
        }
      </div>
      <div className="modal-actions" style={{ marginTop: '16px' }}>
        <button className="btn btn-ghost" onClick={() => onClose('coinHistoryModal')}>Close</button>
      </div>
    </Modal>
  );
}

// ── Add Achievement ──
const PRESET_EMOJIS = [
  '🏆','⭐','💰','🏠','🏃','🎯','📚','💪','🎓','🚗',
  '✈️','🏅','🎮','💻','🎸','🏋️','🌟','💎','🔑','🧘',
  '🎨','🏊','🚴','🌍','📱','🎤','🧠','💼','🏡','🎉',
  '🤝','📈','🍎','⚽','🎵','🧗','🦋','🌱','🔥','👑',
];

function AddAchievementModal({ openId, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', desc: '', icon: '', coins: '' });
  function submit() {
    if (!form.name) return;
    onAdd({ id: 'a' + Date.now(), name: form.name, desc: form.desc, icon: form.icon || '🏆', x: 40 + Math.random() * 360, y: 40 + Math.random() * 260, completed: false, coins: parseInt(form.coins) || 0 });
    setForm({ name: '', desc: '', icon: '', coins: '' });
    onClose('addAchievementModal');
  }
  return (
    <Modal id="addAchievementModal" openId={openId} onClose={onClose}>
      <h3>New Achievement</h3>
      <div className="fg"><label>Title</label><input type="text" placeholder="e.g. Save £10,000" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="fg"><label>Description</label><input type="text" placeholder="e.g. Build emergency fund" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
      <div className="fg">
        <label>Icon</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {PRESET_EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setForm(f => ({ ...f, icon: e }))}
              style={{
                fontSize: '18px', padding: '4px', borderRadius: '7px', cursor: 'pointer', lineHeight: 1,
                border: form.icon === e ? '2px solid var(--em)' : '2px solid transparent',
                background: form.icon === e ? 'rgba(42,158,98,0.15)' : 'rgba(0,0,0,0.06)',
                transition: 'all .12s',
              }}
            >{e}</button>
          ))}
        </div>
        <input type="text" placeholder="Or type a custom emoji…" maxLength={2} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
      </div>
      <div className="fg"><label>⬡ Coin Reward on Completion</label><input type="number" placeholder="e.g. 50" min="0" value={form.coins} onChange={e => setForm(f => ({ ...f, coins: e.target.value }))} /></div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addAchievementModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Create</button>
      </div>
    </Modal>
  );
}

// ── Add Tracker ──
function AddTrackerModal({ openId, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', type: 'boolean', unit: '', goal: '', color: '#1a7a4a', weeklyTarget: '', weeklyCoins: '' });
  const isNumber = form.type === 'number';
  function submit() {
    if (!form.name) return;
    onAdd({
      id: 't' + Date.now(),
      name: form.name,
      type: form.type,
      unit: form.unit,
      goal: parseFloat(form.goal) || null,
      color: form.color,
      weeklyTarget: parseInt(form.weeklyTarget) || null,
      weeklyCoins: parseInt(form.weeklyCoins) || null,
    });
    setForm({ name: '', type: 'boolean', unit: '', goal: '', color: '#1a7a4a', weeklyTarget: '', weeklyCoins: '' });
    onClose('addTrackerModal');
  }
  return (
    <Modal id="addTrackerModal" openId={openId} onClose={onClose}>
      <h3>New Tracker</h3>
      <div className="fg"><label>Name</label><input type="text" placeholder="e.g. Gym Session" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="fg">
        <label>Type</label>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="boolean">✓ / ✗  (Yes or No)</option>
          <option value="number">Number (e.g. amount saved)</option>
        </select>
      </div>
      {isNumber && <div className="fg"><label>Unit</label><input type="text" placeholder="£, g, km..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>}
      {isNumber && <div className="fg"><label>Monthly Target</label><input type="number" placeholder="500" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} /></div>}
      <div className="fg"><label>Colour</label><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
      <div style={{ borderTop: '1px solid var(--border-lt)', margin: '14px 0' }}></div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--em-mid)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>⬡ Weekly Coin Challenge (optional)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="fg" style={{ marginBottom: 0 }}><label>Times per week</label><input type="number" placeholder="e.g. 5" min="1" max="7" value={form.weeklyTarget} onChange={e => setForm(f => ({ ...f, weeklyTarget: e.target.value }))} /></div>
        <div className="fg" style={{ marginBottom: 0 }}><label>⬡ Coins reward</label><input type="number" placeholder="e.g. 10" min="1" value={form.weeklyCoins} onChange={e => setForm(f => ({ ...f, weeklyCoins: e.target.value }))} /></div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>Hit the weekly target to earn coins every week.</div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addTrackerModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Add</button>
      </div>
    </Modal>
  );
}

// ── Multi-log modal ──
function MultiLogModal({ openId, onClose, trackers, multiSelectedDays, onSave }) {
  function submit() {
    const logs = {};
    trackers.forEach(t => {
      const el = document.getElementById('mlog-' + t.id);
      if (!el) return;
      if (t.type === 'boolean') { if (el.checked) logs[t.id] = true; }
      else { const v = parseFloat(el.value); if (!isNaN(v) && v !== 0) logs[t.id] = v; }
    });
    onSave(logs);
    onClose('multiLogModal');
  }
  return (
    <Modal id="multiLogModal" openId={openId} onClose={onClose}>
      <h3>Log for {multiSelectedDays.length} selected day{multiSelectedDays.length !== 1 ? 's' : ''}</h3>
      <div>
        {!trackers.length
          ? <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>Add trackers first.</div>
          : trackers.map(t => (
            <div key={t.id} className="log-entry-row">
              <label className="log-entry-label">
                <div className="log-dot" style={{ background: t.color }}></div>
                {t.name}
              </label>
              {t.type === 'boolean'
                ? <input type="checkbox" className="log-checkbox" id={`mlog-${t.id}`} />
                : <input type="number" className="log-number-input" id={`mlog-${t.id}`} placeholder={t.unit || '0'} />
              }
            </div>
          ))
        }
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('multiLogModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Apply to All</button>
      </div>
    </Modal>
  );
}

// ── Add Shop Item ──
function AddShopModal({ openId, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', price: '', url: '', imageUrl: '', priority: 'med', notes: '', coinCost: '' });
  const [status, setStatus] = useState('');
  const [fetching, setFetching] = useState(false);
  const timerRef = useRef(null);

  async function runAutofill(url) {
    if (!url || !url.startsWith('http')) return;
    setStatus('⏳ Fetching product info…');
    setFetching(true);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: 'You are a product info extractor. Given a product URL, respond ONLY with a JSON object (no markdown) with keys: name (string), price (string like "£49.99" or "" if unknown), imageUrl (string — a direct image URL for the product, or "" if not determinable from URL alone), notes (one sentence description). Make reasonable guesses based on the URL path and domain.',
          messages: [{ role: 'user', content: `Extract product info from this URL: ${url}` }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';
      let info;
      try { info = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { info = null; }
      if (info) {
        setForm(f => ({
          ...f,
          name: f.name || info.name || '',
          price: f.price || info.price || '',
          imageUrl: info.imageUrl || f.imageUrl,
          notes: f.notes || info.notes || '',
        }));
        setStatus('✓ Auto-filled from URL');
      } else {
        setStatus('Could not extract info — fill in manually');
      }
    } catch (e) {
      setStatus('Auto-fill unavailable — fill in manually');
    }
    setFetching(false);
  }

  function handleUrlChange(val) {
    setForm(f => ({ ...f, url: val }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runAutofill(val), 900);
  }

  function submit() {
    if (!form.name) return;
    onAdd({
      id: 's' + Date.now(),
      name: form.name,
      categoryId: null,
      price: form.price,
      url: form.url,
      imageUrl: form.imageUrl,
      priority: form.priority,
      notes: form.notes,
      coinCost: parseInt(form.coinCost) || 0,
      bought: false,
    });
    setForm({ name: '', price: '', url: '', imageUrl: '', priority: 'med', notes: '', coinCost: '' });
    setStatus('');
    onClose('addShopModal');
  }

  return (
    <Modal id="addShopModal" openId={openId} onClose={onClose}>
      <h3>Add Item</h3>
      <div className="fg">
        <label>Link (optional — paste to auto-fill)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="url" placeholder="https://amazon.co.uk/..." style={{ flex: 1 }} value={form.url} onChange={e => handleUrlChange(e.target.value)} />
          <button className="btn btn-ghost btn-sm" disabled={fetching} onClick={() => runAutofill(form.url)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Fill ↓</button>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: status.startsWith('✓') ? 'var(--em)' : 'var(--text-muted)', marginTop: '5px', minHeight: '14px' }}>{status}</div>
      </div>
      <div className="fg"><label>Item Name</label><input type="text" placeholder="e.g. AirPods Pro" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="fg"><label>Price (optional)</label><input type="text" placeholder="£149.99" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
      <div className="fg"><label>Image URL (optional)</label><input type="url" placeholder="Auto-filled from link, or paste directly" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
      <div className="fg">
        <label>Priority</label>
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          <option value="high">🔴 High — want soon</option>
          <option value="med">🟡 Medium</option>
          <option value="low">🟢 Low — nice to have</option>
        </select>
      </div>
      <div className="fg"><label>Notes</label><input type="text" placeholder="Why you want it, alternatives..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      <div className="fg"><label>⬡ Coin Cost (optional)</label><input type="number" placeholder="e.g. 100" min="0" value={form.coinCost} onChange={e => setForm(f => ({ ...f, coinCost: e.target.value }))} /></div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addShopModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Add Item</button>
      </div>
    </Modal>
  );
}

// ── Add Category ──
function AddCategoryModal({ openId, onClose, onAdd }) {
  const [name, setName] = useState('');
  function submit() {
    if (!name.trim()) return;
    onAdd({ id: 'c' + Date.now(), name: name.trim() });
    setName('');
    onClose('addCategoryModal');
  }
  return (
    <Modal id="addCategoryModal" openId={openId} onClose={onClose}>
      <h3>New Category</h3>
      <div className="fg"><label>Category Name</label><input type="text" placeholder="e.g. Clothes, Tech, Books" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addCategoryModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Create</button>
      </div>
    </Modal>
  );
}

// ── Add Holiday ──
function AddHolidayModal({ openId, onClose, onAdd }) {
  const [form, setForm] = useState({ dest: '', from: '', to: '', accom: '', flight: '', budget: '', status: 'planning', notes: '' });
  function submit() {
    if (!form.dest.trim()) return;
    onAdd({ id: 'h' + Date.now(), ...form });
    setForm({ dest: '', from: '', to: '', accom: '', flight: '', budget: '', status: 'planning', notes: '' });
    onClose('addHolidayModal');
  }
  return (
    <Modal id="addHolidayModal" openId={openId} onClose={onClose} style={{ maxWidth: '480px' }}>
      <h3>Plan a Holiday</h3>
      <div className="fg"><label>Destination</label><input type="text" placeholder="e.g. Lisbon, Portugal" value={form.dest} onChange={e => setForm(f => ({ ...f, dest: e.target.value }))} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="fg"><label>Departure</label><input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} /></div>
        <div className="fg"><label>Return</label><input type="date" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} /></div>
      </div>
      <div className="fg"><label>Accommodation</label><input type="text" placeholder="e.g. Hotel Lisboa, Airbnb..." value={form.accom} onChange={e => setForm(f => ({ ...f, accom: e.target.value }))} /></div>
      <div className="fg"><label>Flight Info</label><input type="text" placeholder="e.g. EasyJet EZY1234, 06:30 LGW→LIS" value={form.flight} onChange={e => setForm(f => ({ ...f, flight: e.target.value }))} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="fg"><label>Total Budget</label><input type="text" placeholder="£1,200" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
        <div className="fg">
          <label>Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planning">🟡 Planning</option>
            <option value="booked">🟢 Booked</option>
            <option value="completed">✓ Completed</option>
          </select>
        </div>
      </div>
      <div className="fg"><label>Notes</label><input type="text" placeholder="Things to do, pack list, ideas..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => onClose('addHolidayModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Add Trip</button>
      </div>
    </Modal>
  );
}

// ── Add Habit ──
function AddHabitModal({ openId, onClose, onAdd }) {
  const emptyMs = () => ({ _id: 'ms' + Date.now() + Math.random(), amount: '1', unit: 'weeks', coins: '' });
  const [form, setForm] = useState({ name: '', color: '#1a7a4a', endless: false, milestones: [emptyMs()] });

  function toDuration(amount, unit) {
    const mul = { hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000 };
    return parseInt(amount) * (mul[unit] || mul.days);
  }
  function msLabel(amount, unit) {
    const n = parseInt(amount);
    const s = { hours: 'hour', days: 'day', weeks: 'week', months: 'month' };
    return `${n} ${n === 1 ? s[unit] : unit}`;
  }
  function updateMs(_id, key, val) {
    setForm(f => ({ ...f, milestones: f.milestones.map(m => m._id === _id ? { ...m, [key]: val } : m) }));
  }
  function removeMs(_id) {
    setForm(f => ({ ...f, milestones: f.milestones.filter(m => m._id !== _id) }));
  }

  function submit() {
    if (!form.name.trim()) return;
    const milestones = form.milestones
      .filter(m => m.amount && m.coins && parseInt(m.coins) > 0)
      .map((m, i) => ({
        id: 'm' + Date.now() + i,
        duration: toDuration(parseInt(m.amount), m.unit),
        coins: parseInt(m.coins),
        label: msLabel(parseInt(m.amount), m.unit),
        awarded: false,
      }))
      .sort((a, b) => a.duration - b.duration);
    onAdd({
      id: 'hb' + Date.now(),
      name: form.name.trim(),
      color: form.color,
      endless: form.endless,
      startTime: Date.now(),
      relapseCount: 0,
      milestones,
    });
    setForm({ name: '', color: '#1a7a4a', endless: false, milestones: [emptyMs()] });
    onClose('addHabitModal');
  }

  return (
    <Modal id="addHabitModal" openId={openId} onClose={onClose} style={{ maxWidth: '460px' }}>
      <h3>New Habit</h3>
      <div className="fg"><label>Habit Name</label><input type="text" placeholder="e.g. Alcohol, Fast Food, Smoking..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="fg"><label>Colour</label><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>

      <div style={{ borderTop: '1px solid var(--border-lt)', margin: '14px 0' }}></div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--em-mid)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>⬡ Reward Milestones</div>

      {form.milestones.map((m, i) => (
        <div key={m._id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px' }}>
          <div className="fg" style={{ flex: '0 0 54px', marginBottom: 0 }}>
            {i === 0 && <label style={{ fontSize: '9px' }}>After</label>}
            <input type="number" min="1" value={m.amount} onChange={e => updateMs(m._id, 'amount', e.target.value)} style={{ textAlign: 'center' }} />
          </div>
          <div className="fg" style={{ flex: 1, marginBottom: 0 }}>
            {i === 0 && <label style={{ fontSize: '9px' }}>Unit</label>}
            <select value={m.unit} onChange={e => updateMs(m._id, 'unit', e.target.value)}>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div className="fg" style={{ flex: '0 0 72px', marginBottom: 0 }}>
            {i === 0 && <label style={{ fontSize: '9px' }}>⬡ Coins</label>}
            <input type="number" min="1" placeholder="e.g. 20" value={m.coins} onChange={e => updateMs(m._id, 'coins', e.target.value)} />
          </div>
          <button
            onClick={() => removeMs(m._id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '8px 4px', flexShrink: 0, lineHeight: 1, marginBottom: '1px' }}
          >✕</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, milestones: [...f.milestones, emptyMs()] }))} style={{ marginBottom: '14px', fontSize: '12px' }}>
        + Add Milestone
      </button>

      <div style={{ borderTop: '1px solid var(--border-lt)', margin: '4px 0 14px' }}></div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={form.endless} onChange={e => setForm(f => ({ ...f, endless: e.target.checked }))} style={{ marginTop: '3px', accentColor: 'var(--em)', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>∞ Endless</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Track this habit forever — the counter never ends, even after all milestones are earned</div>
        </div>
      </label>

      <div className="modal-actions" style={{ marginTop: '18px' }}>
        <button className="btn btn-ghost" onClick={() => onClose('addHabitModal')}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Start Tracking</button>
      </div>
    </Modal>
  );
}

// ── Main Modals container ──
export default function Modals({ openModal, S, update, onClose, onOpen, onShowCoinToast }) {
  function handleAddLink(link) {
    update(prev => ({ ...prev, links: [...prev.links, link] }));
  }
  function handleAddYT(yt) {
    update(prev => ({ ...prev, ytWidgets: [...(prev.ytWidgets || []), yt] }));
  }
  function handleAddAchievement(ach) {
    update(prev => ({ ...prev, achievements: [...prev.achievements, ach] }));
  }
  function handleAddTracker(tracker) {
    update(prev => ({ ...prev, trackers: [...prev.trackers, tracker] }));
  }
  function handleAddNotepad() {
    // Set a flag so HubSection knows to render the notepad widget
    update(prev => ({ ...prev, _showNotepad: true }));
  }
  function handleMultiLogSave(logs) {
    update(prev => {
      const newLogs = { ...prev.logs };
      (prev.multiSelectedDays || []).forEach(key => {
        if (Object.keys(logs).length) newLogs[key] = { ...(newLogs[key] || {}), ...logs };
      });
      return { ...prev, logs: newLogs, multiSelectMode: false, multiSelectedDays: [], _multiLogOpen: false };
    });
  }
  function handleAddShopItem(item) {
    update(prev => ({ ...prev, shopItems: [...prev.shopItems, item] }));
  }
  function handleAddCategory(cat) {
    update(prev => ({ ...prev, shopCategories: [...prev.shopCategories, cat] }));
  }
  function handleAddHoliday(holiday) {
    update(prev => ({ ...prev, holidays: [...(prev.holidays || []), holiday] }));
  }
  function handleAddHabit(habit) {
    update(prev => ({ ...prev, habits: [...(prev.habits || []), habit] }));
  }

  // Determine effective openId — _multiLogOpen overrides
  const effectiveOpen = S._multiLogOpen ? 'multiLogModal' : openModal;

  return (
    <>
      <AddLinkModal
        openId={effectiveOpen}
        onClose={onClose}
        onSwitchModal={onOpen}
        onAddNotepad={handleAddNotepad}
      />
      <AddLinkOnlyModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddLink} />
      <AddYouTubeModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddYT} />
      <CoinHistoryModal openId={effectiveOpen} onClose={onClose} coins={S.coins || 0} coinHistory={S.coinHistory || []} />
      <AddAchievementModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddAchievement} />
      <AddTrackerModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddTracker} />
      <MultiLogModal
        openId={effectiveOpen}
        onClose={id => { update(prev => ({ ...prev, _multiLogOpen: false })); onClose(id); }}
        trackers={S.trackers}
        multiSelectedDays={S.multiSelectedDays || []}
        onSave={handleMultiLogSave}
      />
      <AddShopModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddShopItem} />
      <AddCategoryModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddCategory} />
      <AddHolidayModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddHoliday} />
      <AddHabitModal openId={effectiveOpen} onClose={onClose} onAdd={handleAddHabit} />
    </>
  );
}
