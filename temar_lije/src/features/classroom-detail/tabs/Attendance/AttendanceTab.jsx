import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, UserCheck, Calendar, Download } from 'lucide-react';
import './AttendanceTab.css';

const DEFAULT_RECORDS = [
  { id: '1', date: 'Aug 18, 2026', title: 'Session 4: State Management', presentCount: 24, totalCount: 26, status: 'Present' },
  { id: '2', date: 'Aug 16, 2026', title: 'Session 3: Lifecycle Hooks', presentCount: 25, totalCount: 26, status: 'Present' },
  { id: '3', date: 'Aug 14, 2026', title: 'Session 2: Widgets & Layouts', presentCount: 26, totalCount: 26, status: 'Present' },
  { id: '4', date: 'Aug 11, 2026', title: 'Session 1: Introduction to Framework', presentCount: 26, totalCount: 26, status: 'Present' },
];

export default function AttendanceTab({
  isTeacher = false,
  currentUser = { name: 'User', role: 'Student' },
  onTakeAttendance
}) {
  const [checkInName, setCheckInName] = useState('');
  const [records, setRecords] = useState(DEFAULT_RECORDS);
  const [studentCheckedIn, setStudentCheckedIn] = useState(false);

  const handleInputChange = (e) => {
    setCheckInName(e.target.value);
  };

  const handleTakeAttendance = (e) => {
    e.preventDefault();
    if (!isTeacher) return;
    const sessionTitle = checkInName.trim() || `Session ${records.length + 1}`;
    const newRecord = {
      id: `${Date.now()}`,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      title: sessionTitle,
      presentCount: 25,
      totalCount: 26,
      status: 'Present',
    };
    setRecords((prev) => [newRecord, ...prev]);
    setCheckInName('');
    alert(`Attendance logged for "${sessionTitle}"!`);
  };

  const handleStudentSelfCheckIn = () => {
    setStudentCheckedIn(true);
    alert(`Attendance recorded for ${currentUser?.name || 'Student'}!`);
  };

  return (
    <div className="classroom-detail-container">
      {/* Attendance Control Panel */}
      <div className="attendance-control-card">
        {isTeacher ? (
          <form onSubmit={handleTakeAttendance} className="attendance-action-row">
            <input
              type="text"
              className="attendance-input"
              placeholder="Session topic or check-in title (e.g. Session 5 - Live Coding)"
              value={checkInName}
              onChange={handleInputChange}
            />
            <button type="submit" className="attendance-btn">
              <ClipboardCheck className="attendance-btn-icon" />
              Take session attendance
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>
                Your Attendance Status
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                Overall attendance rate: <strong>100% (4/4 Sessions)</strong>
              </p>
            </div>
            <button
              type="button"
              className="attendance-btn"
              onClick={handleStudentSelfCheckIn}
              disabled={studentCheckedIn}
              style={studentCheckedIn ? { backgroundColor: '#059669' } : {}}
            >
              {studentCheckedIn ? <CheckCircle2 size={16} /> : <UserCheck size={16} />}
              {studentCheckedIn ? 'Checked In Today ✓' : 'Check In for Today'}
            </button>
          </div>
        )}
      </div>

      {/* Attendance Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
        <div style={{ flex: 1, padding: '16px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
            {isTeacher ? 'Class Average Attendance' : 'My Attendance Rate'}
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#14785c', margin: '6px 0 0 0' }}>
            96.8%
          </h2>
        </div>
        <div style={{ flex: 1, padding: '16px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Completed Sessions
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: '6px 0 0 0' }}>
            {records.length}
          </h2>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>Attendance History</h4>
          {isTeacher && (
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#14785c',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => alert('Exporting attendance report (CSV)...')}
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.8rem' }}>
              <th style={{ padding: '12px 20px' }}>SESSION / TOPIC</th>
              <th style={{ padding: '12px 20px' }}>DATE</th>
              <th style={{ padding: '12px 20px' }}>{isTeacher ? 'ATTENDEES' : 'YOUR STATUS'}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{r.title}</td>
                <td style={{ padding: '14px 20px', color: '#6b7280' }}>{r.date}</td>
                <td style={{ padding: '14px 20px' }}>
                  {isTeacher ? (
                    <span style={{ color: '#14785c', fontWeight: '600' }}>
                      {r.presentCount} / {r.totalCount} ({Math.round((r.presentCount / r.totalCount) * 100)}%)
                    </span>
                  ) : (
                    <span style={{ color: '#14785c', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> {r.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
