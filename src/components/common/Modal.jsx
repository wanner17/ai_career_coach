import { useEffect, useRef } from 'react';

// Generic overlay + box. Callers own the content; this handles backdrop/ESC
// close, focuses the box on open, and marks the region for screen readers.
export default function Modal({ onClose, children, boxClassName = '' }) {
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.focus();
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
