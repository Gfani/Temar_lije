import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { getAttendanceReport, recordCheckIn } from '../../../../services/apiClient';
import './AttendanceTab.css';

export default function AttendanceTab({
  classId = '66666666-6666-4666-8666-666666666666',
  studentId = '33333333-3333-4333-8333-333333333333',
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');
  const [checkInError, setCheckInError] = useState('');

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAttendanceReport(classId);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setCheckInMessage('');
    setCheckInError('');

    try {
      const res = await recordCheckIn(classId, studentId);
      setCheckInMessage(`Checked in successfully! Status: ${res.status || 'PRESENT'}`);
      await loadAttendance();
    } catch (err) {
      setCheckInError(err.message || 'Check-in failed. Are you connected to classroom Wi-Fi?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = report?.summary || { PRESENT: 0, LATE: 0, ABSENT: 0, totalEnrolled: 0 };
  const records = report?.records || { PRESENT: [], LATE: [], ABSENT: [] };
  const allRecords = [...records.PRESENT, ...records.LATE, ...records.ABSENT];

  return (
    <div className="classroom-detail-container">
      {/* Attendance Control Card */}
      <div className="attendance-control-card">
        <form onSubmit={handleCheckIn} className="attendance-action-row">
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#16181b' }}>
              Classroom Wi-Fi Hotspot Attendance Check-In
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b9491' }}>
              Connect to your classroom Wi-Fi and click to register your presence.
            </p>
          </div>
          <button type="submit" className="attendance-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="attendance-btn-icon animate-spin" />
            ) : (
              <ClipboardCheck className="attendance-btn-icon" />
            )}
            <span>{isSubmitting ? 'Checking in...' : 'Check-In Now'}</span>
          </button>
        </form>

        {checkInMessage && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#ecfdf5',
              color: '#047857',
              borderRadius: '6px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} /> {checkInMessage}
          </div>
        )}

        {checkInError && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} /> {checkInError}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e3e9e6', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '13px', color: '#8b9491' }}>Total Enrolled</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '24px', color: '#16181b' }}>{summary.totalEnrolled}</h3>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e9e6', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '13px', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Present
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: '24px', color: '#047857' }}>{summary.PRESENT}</h3>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e9e6', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '13px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Late
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: '24px', color: '#d97706' }}>{summary.LATE}</h3>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e9e6', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={14} /> Absent
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: '24px', color: '#dc2626' }}>{summary.ABSENT}</h3>
        </div>
      </div>

      {/* Attendance List */}
      {loading ? (
        <div className="attendance-empty-state-card">
          <Loader2 className="attendance-btn-icon animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p className="attendance-empty-state-text">Loading attendance report...</p>
        </div>
      ) : allRecords.length === 0 ? (
        <div className="attendance-empty-state-card">
          <p className="attendance-empty-state-text">
            No check-ins yet. Start one while you teach live.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e3e9e6', borderRadius: '12px', padding: '16px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#16181b' }}>Student Records</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allRecords.map((item, idx) => {
              const studentName = item.student?.fullName || item.student?.name || 'Student';
              const isPresent = item.status === 'PRESENT';
              const isLate = item.status === 'LATE';

              return (
                <li
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#fafbfc',
                    border: '1px solid #f0f4f2',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#16181b', fontSize: '14px' }}>{studentName}</span>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: isPresent ? '#ecfdf5' : isLate ? '#fffbeb' : '#fef2f2',
                      color: isPresent ? '#047857' : isLate ? '#b45309' : '#b91c1c',
                    }}
                  >
                    {item.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
