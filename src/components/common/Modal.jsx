import { useEffect, useRef } from 'react';

// Generic overlay + box. Callers own the content; this handles backdrop/ESC
// close, focuses the box on open, and marks the region for screen readers.
export default function Modal({ onClose, children, boxClassName = '' }) {
  const boxRef = useRef(null);

  // Mount-only — focusing the box every render this effect re-ran would steal
  // focus back from whatever the user is actively typing in every time. Split
  // out from the ESC listener below specifically so a caller passing a new
  // onClose function identity each render (e.g. an inline `() => ...` in a
  // parent that re-renders on every keystroke — see admin forms) can't
  // trigger it again after the initial mount.
  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className={`modal-box ${boxClassName}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={boxRef}
      >
        {children}
      </div>
    </div>
  );
}
