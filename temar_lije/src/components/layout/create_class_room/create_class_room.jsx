import React, { useState, useEffect } from 'react';
import './create_class_room.css';

export default function CreateClassRoom({ 
  isOpen = true, 
  onClose = () => {}, 
  onCreate 
}) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: ''
  });

  // Listen for the Escape (Esc) key to close the modal
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) return;

    if (onCreate) {
      onCreate({
        title: trimmedTitle,
        subject: formData.subject.trim(),
        description: formData.description.trim()
      });
    }

   
    setFormData({ title: '', subject: '', description: '' });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <h2 className="modal-title">Create a classroom</h2>
        <p className="modal-subtitle">
          Students join with the invitation code generated for this classroom.
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              placeholder="Form 3 Biology"
              maxLength={60}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              className="form-input"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Biology"
              maxLength={60}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-input form-textarea"
              value={formData.description}
              onChange={handleChange}
              placeholder="What this class covers this term."
              rows="3"
              maxLength={300}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-create">
              Create classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}