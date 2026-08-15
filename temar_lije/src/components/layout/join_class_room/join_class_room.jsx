import React, { useState } from 'react';
import { X } from 'lucide-react';
import './join_class.css';

/**
 * JoinClassRoom modal component.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open.
 * @param {Function} props.onClose - Callback when closing the modal.
 * @param {Function} props.onJoin - Callback with the 6-character code.
 */
export default function JoinClassRoom({ isOpen, onClose, onJoin }) {
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      if (onJoin) {
        onJoin(code.trim());
      }
    }
  };

  const handleChange = (e) => {
    // Keep uppercase and limit to 6 alphanumeric characters
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (val.length <= 6) {
      setCode(val);
    }
  };

  return (
    <div className="join-modal-overlay" onClick={onClose}>
      <div className="join-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="join-modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        <h2 className="join-modal-title">Join a classroom</h2>
        <p className="join-modal-subtitle">Enter the six-character code from your teacher.</p>
        
        <form onSubmit={handleSubmit} className="join-modal-form">
          <div className="join-modal-input-group">
            <label htmlFor="invitationCode" className="join-modal-label">
              Invitation code
            </label>
            <input
              type="text"
              id="invitationCode"
              className="join-modal-input"
              placeholder="A B 1 2 C D"
              value={code}
              onChange={handleChange}
              maxLength={6}
            />
          </div>
          
          <div className="join-modal-actions">
            <button
              type="submit"
              className="join-modal-btn"
              disabled={code.length !== 6}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
