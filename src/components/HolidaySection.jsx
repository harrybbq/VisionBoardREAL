const STATUS_LABEL = { planning: 'Planning', booked: 'Booked', completed: 'Completed' };

export default function HolidaySection({ S, update, active, onOpenModal }) {
  const { holidays } = S;

  function handleDelete(id) {
    update(prev => ({ ...prev, holidays: (prev.holidays || []).filter(h => h.id !== id) }));
  }

  return (
    <section id="holiday" className={`section${active ? ' active' : ''}`}>
      <div className="holiday-layout">
        <div className="holiday-toolbar">
          <div>
            <div className="eyebrow">Adventures</div>
            <div className="sec-title">Holiday Planner</div>
          </div>
          <button className="btn btn-primary" onClick={() => onOpenModal('addHolidayModal')}>+ Plan Trip</button>
        </div>
        <div className="holiday-grid" id="holidayGrid">
          {(!holidays || holidays.length === 0) ? (
            <div className="holiday-empty">
              <div className="holiday-empty-icon">✈</div>
              No trips planned yet.<br />Hit <strong>+ Plan Trip</strong> to add your first holiday!
            </div>
          ) : (
            holidays.map(h => {
              const dateRange = h.from && h.to
                ? `${new Date(h.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → ${new Date(h.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : h.from ? `From ${new Date(h.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Dates TBC';
              const nights = h.from && h.to
                ? Math.round((new Date(h.to) - new Date(h.from)) / (1000 * 60 * 60 * 24)) + ' nights'
                : '';
              return (
                <div key={h.id} className="holiday-card">
                  <div className="holiday-card-hero">
                    <div className="holiday-card-hero-overlay"></div>
                    <div className="holiday-card-hero-info">
                      <div className="holiday-dest">{h.dest}</div>
                      <div className="holiday-dates">{dateRange}{nights ? ' · ' + nights : ''}</div>
                    </div>
                  </div>
                  <div className="holiday-card-body">
                    {h.flight && (
                      <div className="holiday-row">
                        <div className="holiday-row-icon">✈</div>
                        <div className="holiday-row-label">Flight</div>
                        <div className="holiday-row-value">{h.flight}</div>
                      </div>
                    )}
                    {h.accom && (
                      <div className="holiday-row">
                        <div className="holiday-row-icon">🏨</div>
                        <div className="holiday-row-label">Stay</div>
                        <div className="holiday-row-value">{h.accom}</div>
                      </div>
                    )}
                    {h.budget && (
                      <div className="holiday-row">
                        <div className="holiday-row-icon">💷</div>
                        <div className="holiday-row-label">Budget</div>
                        <div className="holiday-row-value cost">{h.budget}</div>
                      </div>
                    )}
                    {h.notes && (
                      <div className="holiday-row">
                        <div className="holiday-row-icon">📝</div>
                        <div className="holiday-row-label">Notes</div>
                        <div className="holiday-row-value">{h.notes}</div>
                      </div>
                    )}
                  </div>
                  <div className="holiday-card-footer">
                    <span className={`holiday-status ${h.status}`}>{STATUS_LABEL[h.status] || h.status}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => handleDelete(h.id)}
                    >Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
