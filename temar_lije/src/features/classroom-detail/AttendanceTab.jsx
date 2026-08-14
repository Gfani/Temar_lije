import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import './tabs/Attendance/AttendanceTab.css';

export default function AttendanceTab({ onTakeAttendance }) {
  const [checkInName, setCheckInName] = useState('');

  const handleInputChange = (e) => {
    setCheckInName(e.target.value);
  };

  const handleTakeAttendance = (e) => {
    e.preventDefault();
    if (onTakeAttendance) {
      onTakeAttendance(checkInName);
    } else {
      alert(`Taking attendance for: ${checkInName || 'Unnamed Check-in'}`);
    }
  };

  return (
    <div className="classroom-detail-container">
      {/* Attendance Control Panel */}
      <div className="attendance-control-card">
        <form onSubmit={handleTakeAttendance} className="attendance-action-row">
          <input
            type="text"
            className="attendance-input"
            placeholder="Check-in name (optional)"
            value={checkInName}
            onChange={handleInputChange}
          />
          <button type="submit" className="attendance-btn">
            <ClipboardCheck className="attendance-btn-icon" />
            Take attendance
          </button>
        </form>
      </div>

      {/* Empty State Card */}
      <div className="attendance-empty-state-card">
        <p className="attendance-empty-state-text">
          No check-ins yet. Start one while you teach live.
        </p>
      </div>
    </div>
  );
}
