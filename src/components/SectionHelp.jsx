import { useState, useEffect, useRef } from 'react';

export default function SectionHelp({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <span ref={ref} className="section-help-wrap">
      <button className="section-help-btn" onClick={() => setOpen(v => !v)} title="About this screen">?</button>
      {open && (
        <div className="section-help-tooltip">
          <div className="section-help-arrow" />
          {text}
        </div>
      )}
    </span>
  );
}
