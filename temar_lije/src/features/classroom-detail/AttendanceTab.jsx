import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import './AttendanceTab.css';

export default function AttendanceTab({ onTakeAttendance }) {
  const [checkInName, setCheckInName] = useState('');
  const tabs = ['Materials', 'Live class', 'Assignments', 'Attendance', 'Quizzes', 'Members'];
  const [activeTab, setActiveTab] = useState('Attendance');

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
      {/* Tab Navigation */}
      <div className="classroom-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`classroom-tab-pill ${tab === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

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
