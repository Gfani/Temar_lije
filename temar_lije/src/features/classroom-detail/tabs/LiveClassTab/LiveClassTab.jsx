import React, { useState, useCallback, useRef } from 'react';
import { Video, UserPlus, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { startLiveSession, endLiveSession, getLiveToken, recordCheckIn } from '../../../../services/apiClient';
import styles from './LiveClassTab.module.css';

/**
 * LiveClassTab
 * Renders the "Live class" tab panel of a classroom: the meeting-room
 * entry card on the left, and the Attendance + Live quiz utilities on the right.
 */
export default function LiveClassTab({
  classId = '66666666-6666-4666-8666-666666666666',
  studentId = '33333333-3333-4333-8333-333333333333',
  onJoinLiveClass,
  onTakeAttendance,
  onCreateQuiz,
}) {
  // ---- Join live class ----
  const [isJoining, setIsJoining] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [joinError, setJoinError] = useState('');

  // ---- Attendance ----
  const [checkInName, setCheckInName] = useState('');
  const [checkIns, setCheckIns] = useState([]);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const nameInputRef = useRef(null);

  // ---- Live quiz ----
  const [quizzes, setQuizzes] = useState([]);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');

  const handleJoinLiveClass = useCallback(async () => {
    if (isJoining) return;
    setIsJoining(true);
    setJoinError('');
    try {
      if (onJoinLiveClass) {
        await onJoinLiveClass();
      } else {
        // Call backend live-class APIs
        await startLiveSession(classId);
        const tokenRes = await getLiveToken(classId, studentId);
        setSessionToken(tokenRes?.token);
        setIsLiveActive(true);
      }
    } catch (err) {
      setJoinError(err.message || 'Could not join the room. Try again.');
    } finally {
      setIsJoining(false);
    }
  }, [isJoining, onJoinLiveClass, classId, studentId]);

  const handleEndLiveClass = useCallback(async () => {
    try {
      await endLiveSession(classId);
      setIsLiveActive(false);
      setSessionToken(null);
    } catch (err) {
      console.error(err);
    }
  }, [classId]);

  const handleTakeAttendance = useCallback(async () => {
    if (isTakingAttendance) return;
    setIsTakingAttendance(true);
    setAttendanceError('');
    const name = checkInName.trim();
    try {
      if (onTakeAttendance) {
        await onTakeAttendance(name);
      } else {
        await recordCheckIn(classId, studentId);
      }
      setCheckIns((prev) => [
        {
          id: `${Date.now()}`,
          name: name || 'Student Check-in',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setCheckInName('');
      nameInputRef.current?.focus();
    } catch (err) {
      setAttendanceError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setIsTakingAttendance(false);
    }
  }, [checkInName, isTakingAttendance, onTakeAttendance, classId, studentId]);

  const handleCreateQuiz = useCallback(async () => {
    if (isCreatingQuiz) return;
    setIsCreatingQuiz(true);
    setQuizError('');
    try {
      let quiz;
      if (onCreateQuiz) {
        quiz = await onCreateQuiz();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      setQuizzes((prev) => [
        quiz ?? { id: `${Date.now()}`, title: `Untitled quiz ${prev.length + 1}` },
        ...prev,
      ]);
    } catch (err) {
      setQuizError('Could not create the quiz. Try again.');
    } finally {
      setIsCreatingQuiz(false);
    }
  }, [isCreatingQuiz, onCreateQuiz]);

  const handleNameKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTakeAttendance();
    }
  };

  return (
    <div className={styles.container}>
      {/* Left: live meeting room */}
      <section className={styles.mainCard} aria-label="Live class room">
        <div className={styles.mainCardInner}>
          <div className={styles.videoBadge}>
            <Video className={styles.videoBadgeIcon} />
          </div>
          <h2 className={styles.roomTitle}>Live class room</h2>
          <p className={styles.roomDescription}>
            Video, audio, screen sharing, chat and raise-hand run inside the classroom&rsquo;s own
            meeting room. Everyone with the classroom open joins the same room.
          </p>

          {isLiveActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#047857',
                  backgroundColor: '#ecfdf5',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} /> Live Class Session Active
              </div>
              {sessionToken && (
                <code
                  style={{
                    fontSize: '11px',
                    color: '#6b7573',
                    background: '#f3f7f5',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Token: {sessionToken.substring(0, 32)}...
                </code>
              )}
              <button
                type="button"
                className={styles.joinButton}
                onClick={handleEndLiveClass}
                style={{ backgroundColor: '#dc2626' }}
              >
                End Live Session
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.joinButton}
              onClick={handleJoinLiveClass}
              disabled={isJoining}
              aria-busy={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className={`${styles.spinner} animate-spin`} />
                  Joining&hellip;
                </>
              ) : (
                'Join live class'
              )}
            </button>
          )}

          {joinError && (
            <p className={styles.inlineError} role="alert">
              {joinError}
            </p>
          )}
        </div>
      </section>

      {/* Right: attendance + live quiz */}
      <aside className={styles.sidebar}>
        <section className={styles.panel} aria-labelledby="attendance-heading">
          <h3 id="attendance-heading" className={styles.panelHeading}>
            Attendance
          </h3>

          <div className={styles.attendanceRow}>
            <input
              ref={nameInputRef}
              type="text"
              className={styles.textInput}
              placeholder="Check-in name (optional)"
              value={checkInName}
              onChange={(e) => setCheckInName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              disabled={isTakingAttendance}
              aria-label="Check-in name (optional)"
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleTakeAttendance}
              disabled={isTakingAttendance}
              aria-busy={isTakingAttendance}
            >
              {isTakingAttendance ? (
                <Loader2 className={`${styles.spinner} animate-spin`} />
              ) : (
                <UserPlus className={styles.buttonIcon} />
              )}
              <span>{isTakingAttendance ? 'Checking in…' : 'Take attendance'}</span>
            </button>
          </div>

          {attendanceError && (
            <p className={styles.inlineError} role="alert">
              {attendanceError}
            </p>
          )}

          <div className={styles.emptyOrList}>
            {checkIns.length === 0 ? (
              <p className={styles.emptyState}>No check-ins yet. Start one while you teach live.</p>
            ) : (
              <ul className={styles.checkInList}>
                {checkIns.map((c) => (
                  <li key={c.id} className={styles.checkInItem}>
                    <span className={styles.checkInName}>{c.name}</span>
                    <span className={styles.checkInTime}>{c.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="live-quiz-heading">
          <h3 id="live-quiz-heading" className={styles.panelHeading}>
            Live quiz
          </h3>

          <button
            type="button"
            className={styles.newQuizButton}
            onClick={handleCreateQuiz}
            disabled={isCreatingQuiz}
            aria-busy={isCreatingQuiz}
          >
            {isCreatingQuiz ? (
              <Loader2 className={`${styles.spinner} animate-spin`} />
            ) : (
              <Sparkles className={styles.buttonIcon} />
            )}
            <span>{isCreatingQuiz ? 'Creating…' : 'New quiz'}</span>
          </button>

          {quizError && (
            <p className={styles.inlineError} role="alert">
              {quizError}
            </p>
          )}

          <div className={styles.emptyOrList}>
            {quizzes.length === 0 ? (
              <p className={styles.emptyState}>No quizzes yet.</p>
            ) : (
              <ul className={styles.quizList}>
                {quizzes.map((q) => (
                  <li key={q.id} className={styles.quizItem}>
                    {q.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}