import React from 'react';
import { X } from 'lucide-react';

/** Click-outside-to-close overlay. `wide` uses the mega layout. */
const Modal = ({ onClose, wide = false, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className={wide ? 'modal-content modal-content-mega' : 'modal-content'}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="modal-close" aria-label="Close" onClick={onClose}>
        <X size={24} />
      </button>
      {children}
    </div>
  </div>
);

export default Modal;
