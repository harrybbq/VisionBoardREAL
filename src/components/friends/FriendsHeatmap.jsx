import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

/**
 * 91-day activity heatmap for a friend's profile card.
 *
 * Takes a flat `days` array (oldest-first, 91 entries expected) where
 * each entry is { ymd, intensity (0..3), summary? }. We don't generate
 * here — the data shape is the same whether it comes from a Sprint 2
 * mock or a Sprint 3 server query, so the component is a pure renderer.
 *
 * Layout: 13 columns × 7 rows, ~11px cells. Month labels above the
 * grid, only printed when the column's first day crosses a month
 * boundary so the row stays sparse and readable.
 *
 * Tooltip is rendered into document.body via portal so it can escape
 * any `overflow:hidden` ancestor (the friend card itself).
 */

function fmtDate(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Group flat days array into 13 week columns. */
function toWeekCols(days) {
  const cols = [];
  for (let w = 0; w < 13; w++) cols.push(days.slice(w * 7, w * 7 + 7));
  return cols;
}

/** One label per column; blank unless the month changed since previous col. */
function getMonthLabels(weekCols) {
  return weekCols.map((col, i) => {
    const first = col[0]?.ymd;
    if (!first) return '';
    const m = new Date(first + 'T00:00:00').getMonth();
    if (i === 0) return MONTHS[m];
    const prev = weekCols[i - 1]?.[0]?.ymd;
    if (!prev) return '';
    const prevM = new Date(prev + 'T00:00:00').getMonth();
    return m !== prevM ? MONTHS[m] : '';
  });
}

export default function FriendsHeatmap({ days = [] }) {
  const weekCols = useMemo(() => toWeekCols(days), [days]);
  const monthLabels = useMemo(() => getMonthLabels(weekCols), [weekCols]);
  const [tooltip, setTooltip] = useState(null);

  const activeCount = days.filter(d => d.intensity > 0).length;

  return (
    <div className="fc-heatmap-wrap">
      <div className="fc-heatmap-title">
        <span>Activity · 3 months</span>
        <span>{activeCount} active days</span>
      </div>
      <div className="fc-heatmap-inner">
        {/* Month labels — fixed-width cells aligned 1:1 with the columns below */}
        <div className="fc-month-labels">
          {weekCols.map((_, i) => (
            <div key={i} className="fc-month-lbl">{monthLabels[i]}</div>
          ))}
        </div>
        <div className="fc-heatmap-grid">
          {weekCols.map((col, wi) => (
            <div key={wi} className="fc-heatmap-col">
              {col.map((day, di) => (
                <div
                  key={di}
                  className="fc-cell"
                  data-i={day.intensity}
                  onMouseEnter={e => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTooltip({ x: r.left + r.width / 2, y: r.top, day });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Portal so the tooltip isn't clipped by overflow:hidden on the
          card. Position is fixed-relative-to-viewport because that's
          what getBoundingClientRect returned. */}
      {tooltip && createPortal(
        <div className="fc-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <span className="fc-tooltip-date">{fmtDate(tooltip.day.ymd)}</span>
          {tooltip.day.summary || (tooltip.day.intensity > 0 ? 'Logged activity' : 'Nothing logged')}
        </div>,
        document.body
      )}
    </div>
  );
}
