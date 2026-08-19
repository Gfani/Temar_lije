import React, { useState, useEffect } from 'react';
import { X, KeyRound, AlertCircle } from 'lucide-react';
import './join_class_room.css';

export default function JoinClassRoom({
  isOpen = true,
  onClose = () => {},
  onJoin,
}) {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = classCode.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a classroom invitation code.');
      return;
    }

    if (onJoin) {
      const result = onJoin(trimmed);
      if (result && result.error) {
        setError(result.error);
        return;
      }
    }

    setClassCode('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-icon-badge">
          <KeyRound size={24} />
        </div>

        <h2 className="modal-title">Join a classroom</h2>
        <p className="modal-subtitle">
          Enter the 6-character invitation code provided by your teacher.
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="classCode">Classroom Code</label>
            <input
              type="text"
              id="classCode"
              name="classCode"
              className="form-input code-input"
              value={classCode}
              onChange={(e) => {
                setClassCode(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="e.g. RRWC3C"
              maxLength={10}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="modal-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-join">
              Join classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
