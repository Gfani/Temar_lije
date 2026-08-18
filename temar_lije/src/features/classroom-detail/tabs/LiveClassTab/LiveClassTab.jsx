import React, { useState, useCallback, useRef } from 'react';
import { Video, UserPlus, Sparkles, Loader2, CheckCircle2, Radio } from 'lucide-react';
import styles from './LiveClassTab.module.css';

export default function LiveClassTab({
  isTeacher = false,
  currentUser = { name: 'User', role: 'Student' },
  onJoinLiveClass,
  onTakeAttendance,
  onCreateQuiz,
}) {
  // ---- Live Class Session ----
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // ---- Attendance ----
  const [checkIns, setCheckIns] = useState([
    { id: '1', name: 'Fiema Yaregal', time: '10:02 AM' },
    { id: '2', name: 'Gelila Sintayehu', time: '10:05 AM' },
  ]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [checkInName, setCheckInName] = useState('');
  const nameInputRef = useRef(null);

  // ---- Live quiz ----
  const [quizzes, setQuizzes] = useState([
    { id: 'q-1', title: 'Quick Poll: State vs Props Understanding' },
  ]);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');

  const handleToggleLiveSession = useCallback(async () => {
    if (isJoining) return;
    setIsJoining(true);
    setJoinError('');
    try {
      if (onJoinLiveClass) {
        await onJoinLiveClass();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      setIsSessionActive(!isSessionActive);
    } catch (err) {
      setJoinError('Could not connect to the live room. Try again.');
    } finally {
      setIsJoining(false);
    }
  }, [isJoining, isSessionActive, onJoinLiveClass]);

  const handleStudentCheckIn = useCallback(async () => {
    if (hasCheckedIn || isTakingAttendance) return;
    setIsTakingAttendance(true);
    setAttendanceError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const myName = currentUser?.name || 'Student';
      setCheckIns((prev) => [
        {
          id: `${Date.now()}`,
          name: myName,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setHasCheckedIn(true);
    } catch (err) {
      setAttendanceError('Could not record your attendance. Try again.');
    } finally {
      setIsTakingAttendance(false);
    }
  }, [hasCheckedIn, isTakingAttendance, currentUser]);

  const handleTeacherTakeAttendance = useCallback(async () => {
    if (isTakingAttendance) return;
    setIsTakingAttendance(true);
    setAttendanceError('');
    const name = checkInName.trim();
    try {
      if (onTakeAttendance) {
        await onTakeAttendance(name);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      if (name) {
        setCheckIns((prev) => [
          {
            id: `${Date.now()}`,
            name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
        setCheckInName('');
      } else {
        alert('Attendance session broadcasted to all online students!');
      }
    } catch (err) {
      setAttendanceError('Action failed. Please try again.');
    } finally {
      setIsTakingAttendance(false);
    }
  }, [checkInName, isTakingAttendance, onTakeAttendance]);

  const handleCreateQuiz = useCallback(async () => {
    if (!isTeacher || isCreatingQuiz) return;
    setIsCreatingQuiz(true);
    setQuizError('');
    try {
      const quizTitle = prompt('Enter live quiz question/title:');
      if (quizTitle && quizTitle.trim()) {
        setQuizzes((prev) => [
          { id: `q-${Date.now()}`, title: quizTitle.trim() },
          ...prev,
        ]);
      }
    } catch (err) {
      setQuizError('Could not create the quiz. Try again.');
    } finally {
      setIsCreatingQuiz(false);
    }
  }, [isTeacher, isCreatingQuiz]);

  return (
    <div className={styles.container}>
      {/* Left: live meeting room */}
      <section className={styles.mainCard} aria-label="Live class room">
        <div className={styles.mainCardInner}>
          <div className={styles.videoBadge}>
            {isSessionActive ? <Radio className={styles.videoBadgeIcon} /> : <Video className={styles.videoBadgeIcon} />}
          </div>
          <h2 className={styles.roomTitle}>
            {isTeacher
              ? (isSessionActive ? 'Live Broadcasting in Progress' : 'Host Live Classroom')
              : (isSessionActive ? 'Connected to Live Session' : 'Live Classroom')}
          </h2>
          <p className={styles.roomDescription}>
            {isTeacher
              ? 'Start interactive live teaching with video, audio, whiteboard sharing, and automated attendance logging.'
              : 'Join your teacher’s live session to watch whiteboard presentations, participate in discussions, and ask questions.'}
          </p>

          <button
            type="button"
            className={styles.joinButton}
            onClick={handleToggleLiveSession}
            disabled={isJoining}
            aria-busy={isJoining}
            style={isSessionActive ? { backgroundColor: '#c0402f' } : {}}
          >
            {isJoining ? (
              <>
                <Loader2 className={`${styles.spinner} animate-spin`} />
                Connecting&hellip;
              </>
            ) : isSessionActive ? (
              isTeacher ? 'End Live Session' : 'Leave Live Room'
            ) : (
              isTeacher ? 'Start Live Class (Host)' : 'Join Live Class'
            )}
          </button>

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
            {isTeacher ? 'Attendance Log (Teacher)' : 'My Attendance (Student)'}
          </h3>

          {isTeacher ? (
            <div className={styles.attendanceRow}>
              <input
                ref={nameInputRef}
                type="text"
                className={styles.textInput}
                placeholder="Student name (optional)"
                value={checkInName}
                onChange={(e) => setCheckInName(e.target.value)}
                disabled={isTakingAttendance}
              />
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleTeacherTakeAttendance}
                disabled={isTakingAttendance}
                aria-busy={isTakingAttendance}
              >
                {isTakingAttendance ? (
                  <Loader2 className={`${styles.spinner} animate-spin`} />
                ) : (
                  <UserPlus className={styles.buttonIcon} />
                )}
                <span>{checkInName ? 'Add' : 'Trigger Log'}</span>
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: '14px' }}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleStudentCheckIn}
                disabled={hasCheckedIn || isTakingAttendance}
                style={hasCheckedIn ? { backgroundColor: '#059669', width: '100%' } : { width: '100%' }}
              >
                {isTakingAttendance ? (
                  <Loader2 className={`${styles.spinner} animate-spin`} />
                ) : hasCheckedIn ? (
                  <CheckCircle2 className={styles.buttonIcon} />
                ) : (
                  <UserPlus className={styles.buttonIcon} />
                )}
                <span>{hasCheckedIn ? 'Marked Present ✓' : 'Mark Attendance for Today'}</span>
              </button>
            </div>
          )}

          {attendanceError && (
            <p className={styles.inlineError} role="alert">
              {attendanceError}
            </p>
          )}

          <div className={styles.emptyOrList}>
            {checkIns.length === 0 ? (
              <p className={styles.emptyState}>No check-ins recorded yet.</p>
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
            Live Quizzes & Polls
          </h3>

          {isTeacher && (
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
              <span>{isCreatingQuiz ? 'Creating…' : 'New Live Quiz'}</span>
            </button>
          )}

          {quizError && (
            <p className={styles.inlineError} role="alert">
              {quizError}
            </p>
          )}

          <div className={styles.emptyOrList}>
            {quizzes.length === 0 ? (
              <p className={styles.emptyState}>No live quizzes active right now.</p>
            ) : (
              <ul className={styles.quizList}>
                {quizzes.map((q) => (
                  <li key={q.id} className={styles.quizItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{q.title}</span>
                    {!isTeacher && (
                      <button
                        type="button"
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#14785c',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => alert(`Opening ${q.title}...`)}
                      >
                        Answer
                      </button>
                    )}
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