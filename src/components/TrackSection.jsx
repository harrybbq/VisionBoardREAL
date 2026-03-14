import { useState, useEffect } from 'react';
import { getWeekKey, countWeekLogs, getTodayStr } from '../utils/helpers';

function getWeekProgress(logs, trackerId, weeklyTarget) {
  const dateStr = getTodayStr();
  const count = countWeekLogs(logs, trackerId, dateStr);
  return { count, target: weeklyTarget };
}

function TrackersList({ trackers, logs, onDelete, onOpenModal }) {
  return (
    <div className="card trackers-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0 }}>Trackers</h3>
        <button className="btn btn-primary btn-sm" onClick={() => onOpenModal('addTrackerModal')}>+</button>
      </div>
      <div id="trackersList">
        {!trackers.length && (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'center', padding: '14px 0' }}>No trackers yet</div>
        )}
        {trackers.map(t => {
          let challengeHtml = null;
          if (t.weeklyTarget && t.weeklyCoins) {
            const { count, target } = getWeekProgress(logs, t.id, t.weeklyTarget);
            const done = count >= target;
            const pct = Math.min(100, Math.round((count / target) * 100));
            const dateStr = getTodayStr();
            const weekKey = getWeekKey(dateStr);
            const awardKey = 'awarded_' + t.id + '_' + weekKey;
            const awarded = false; // we don't store these in the main state object easily, simplified
            challengeHtml = (
              <div style={{ marginTop: '6px', padding: '6px 8px', background: done ? 'rgba(200,151,10,.12)' : 'rgba(255,255,255,.5)', border: `1px solid ${done ? 'rgba(200,151,10,.3)' : 'var(--border-lt)'}`, borderRadius: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: done ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '.5px', textTransform: 'uppercase' }}>{done ? '✓ ' : ''}{count}/{target}x this week</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: 700, color: 'var(--gold)' }}>⬡ {t.weeklyCoins}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(0,0,0,.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--gold)' : t.color, borderRadius: '2px', transition: 'width .3s' }}></div>
                </div>
              </div>
            );
          }
          return (
            <div key={t.id} className="tracker-item">
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="tracker-left">
                    <div className="tracker-dot" style={{ background: t.color }}></div>
                    <div>
                      <div className="tracker-name">{t.name}</div>
                      <div className="tracker-type">{t.type === 'boolean' ? '✓ / ✗' : 'Number' + (t.unit ? ' · ' + t.unit : '')}</div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', borderRadius: '4px', padding: '2px 5px' }}
                  >✕</button>
                </div>
                {challengeHtml}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ S, update, onShowCoinToast }) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const { calYear, calMonth, trackers, logs, multiSelectMode, multiSelectedDays } = S;

  function changeMonth(d) {
    update(prev => {
      let m = prev.calMonth + d;
      let y = prev.calYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { ...prev, calMonth: m, calYear: y };
    });
  }

  function toggleMultiSelect() {
    update(prev => ({
      ...prev,
      multiSelectMode: !prev.multiSelectMode,
      multiSelectedDays: [],
    }));
  }

  function cancelMultiSelect() {
    update(prev => ({ ...prev, multiSelectMode: false, multiSelectedDays: [], selectedLogDate: null }));
  }

  function handleDayClick(key) {
    if (multiSelectMode) {
      update(prev => ({
        ...prev,
        multiSelectedDays: prev.multiSelectedDays.includes(key)
          ? prev.multiSelectedDays.filter(k => k !== key)
          : [...prev.multiSelectedDays, key],
      }));
    } else {
      update(prev => ({ ...prev, selectedLogDate: key }));
      // Scroll log panel into view after React re-renders
      setTimeout(() => {
        const panel = document.querySelector('.log-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const dim = new Date(calYear, calMonth + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const today = new Date();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ empty: true, key: 'e' + i });
  for (let day = 1; day <= dim; day++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayLogs = logs[key] || {};
    const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
    const isSelected = multiSelectedDays.includes(key);
    const tids = Object.keys(dayLogs);
    cells.push({ day, key, dayLogs, isToday, isSelected, tids });
  }

  const selectedKey = S.selectedLogDate;
  const selectedDay = selectedKey ? parseInt(selectedKey.split('-')[2]) : null;
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function saveLog() {
    const key = selectedKey;
    if (!key) return;
    const logData = {};
    trackers.forEach(t => {
      const el = document.getElementById('log-' + t.id);
      if (!el) return;
      if (t.type === 'boolean') { if (el.checked) logData[t.id] = true; }
      else { const v = parseFloat(el.value); if (!isNaN(v) && v !== 0) logData[t.id] = v; }
    });

    // Merge log save + weekly coin check into ONE atomic update to avoid
    // stale-state races across multiple setS calls.
    update(prev => {
      // 1. Save the log entry
      const newLogs = { ...prev.logs };
      if (Object.keys(logData).length) newLogs[key] = logData;
      else delete newLogs[key];

      let next = { ...prev, logs: newLogs };

      // 2. Check every weekly challenge against the freshly updated logs
      trackers.forEach(t => {
        if (!t.weeklyTarget || !t.weeklyCoins) return;
        const weekKey = getWeekKey(key);
        const awardKey = 'awarded_' + t.id + '_' + weekKey;
        if (next[awardKey]) return; // already rewarded this week
        const count = countWeekLogs(newLogs, t.id, key);
        if (count >= t.weeklyTarget) {
          const coins = (next.coins || 0) + t.weeklyCoins;
          const coinHistory = [
            { type: 'earn', label: t.name + ' weekly goal (' + t.weeklyTarget + 'x)', amount: t.weeklyCoins, ts: Date.now() },
            ...(next.coinHistory || []),
          ];
          onShowCoinToast('+' + t.weeklyCoins + ' ⬡ — ' + t.name + ' weekly goal!', true);
          next = { ...next, [awardKey]: true, coins, coinHistory };
        }
      });

      return next;
    });

    const btn = document.querySelector('.log-save-btn');
    if (btn) { btn.textContent = '✓ Saved'; btn.style.background = 'var(--em-light)'; setTimeout(() => { btn.textContent = 'Save'; btn.style.background = 'var(--em)'; }, 1400); }
  }

  function clearDay() {
    if (!selectedKey) return;
    if (!window.confirm('Remove all markers for this day?')) return;
    update(prev => {
      const newLogs = { ...prev.logs };
      delete newLogs[selectedKey];
      return { ...prev, logs: newLogs, selectedLogDate: null };
    });
  }

  return (
    <div className="card" style={{ padding: '22px' }}>
      <div className="cal-header">
        <div className="cal-month-title">{months[calMonth]} {calYear}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`multi-toggle-btn${multiSelectMode ? ' active' : ''}`}
            onClick={toggleMultiSelect}
          >{multiSelectMode ? '☑ Multi-select' : '☐ Multi-select'}</button>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
            <button className="cal-nav-btn" onClick={() => changeMonth(1)}>›</button>
          </div>
        </div>
      </div>

      {multiSelectMode && (
        <div id="multiSelectBar" style={{ display: 'block' }}>
          <div className="cal-multiselect-bar">
            <span>{multiSelectedDays.length} day{multiSelectedDays.length !== 1 ? 's' : ''} selected</span>
            <div className="ms-actions">
              <button className="ms-btn ms-btn-apply" onClick={() => {
                if (!multiSelectedDays.length) { alert('Select at least one day.'); return; }
                update(prev => ({ ...prev, _multiLogOpen: true }));
              }}>Apply to Selected</button>
              <button className="ms-btn ms-btn-cancel" onClick={cancelMultiSelect}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="cal-days-header">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map(cell => {
          if (cell.empty) return <div key={cell.key} className="cal-cell empty"></div>;
          const firstTid = cell.tids[0];
          const firstTracker = firstTid ? trackers.find(t => t.id === firstTid) : null;
          return (
            <div
              key={cell.key}
              className={`cal-cell${cell.isToday ? ' today' : ''}${cell.tids.length ? ' has-logs' : ''}${cell.isSelected ? ' selected' : ''}`}
              onClick={() => handleDayClick(cell.key)}
            >
              {firstTracker && <div className="cal-cell-fill" style={{ background: firstTracker.color }}></div>}
              <div className="cal-date">{cell.day}</div>
              {cell.tids.length > 0 && (
                <div className="cal-dots">
                  {cell.tids.map(tid => {
                    const tr = trackers.find(t => t.id === tid);
                    return tr ? <div key={tid} className="cal-dot" style={{ background: tr.color }}></div> : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        {trackers.map(t => (
          <div key={t.id} className="legend-item">
            <div className="legend-dot" style={{ background: t.color }}></div>
            {t.name}
          </div>
        ))}
      </div>

      {selectedKey && !multiSelectMode && (
        <div className="log-panel" style={{ display: 'block' }}>
          <div className="log-panel-header">{selectedDay} {shortMonths[calMonth]} {calYear}</div>
          <div id="logEntriesForm">
            {!trackers.length && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)' }}>Add trackers first.</div>
            )}
            {trackers.map(t => {
              const dayLogs = logs[selectedKey] || {};
              return (
                <div key={t.id} className="log-entry-row">
                  <label className="log-entry-label">
                    <div className="log-dot" style={{ background: t.color }}></div>
                    {t.name}
                  </label>
                  {t.type === 'boolean'
                    ? <input type="checkbox" className="log-checkbox" id={`log-${t.id}`} defaultChecked={dayLogs[t.id] === true} />
                    : <input type="number" className="log-number-input" id={`log-${t.id}`} defaultValue={dayLogs[t.id] !== undefined ? dayLogs[t.id] : ''} placeholder={t.unit || '0'} />
                  }
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="log-save-btn" onClick={saveLog}>Save</button>
            <button
              onClick={clearDay}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--mono)' }}
              title="Remove all markers for this day"
            >🗑 Clear Day</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackSection({ S, update, active, onOpenModal, onShowCoinToast }) {
  return (
    <section id="track" className={`section${active ? ' active' : ''}`}>
      <div style={{ marginBottom: '20px' }}>
        <div className="eyebrow">Daily Habits</div>
        <div className="sec-title">Track</div>
      </div>
      <div className="track-layout">
        <TrackersList
          trackers={S.trackers}
          logs={S.logs}
          onDelete={id => update(prev => ({ ...prev, trackers: prev.trackers.filter(t => t.id !== id) }))}
          onOpenModal={onOpenModal}
        />
        <CalendarView S={S} update={update} onShowCoinToast={onShowCoinToast} />
      </div>
    </section>
  );
}
