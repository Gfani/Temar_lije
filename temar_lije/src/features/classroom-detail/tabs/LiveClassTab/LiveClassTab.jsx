import React, { useState, useCallback, useRef } from 'react';
import styles from './LiveClassTab.module.css';

/**
 * Small inline icon set (no external icon library required).
 * Kept as simple functional components so they inherit currentColor.
 */
const VideoIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 8.5V7.8c0-.9 0-1.35-.16-1.72a1.9 1.9 0 0 0-.92-.92C13.55 5 13.1 5 12.2 5H5.8c-.9 0-1.35 0-1.72.16a1.9 1.9 0 0 0-.92.92C3 6.45 3 6.9 3 7.8v6.4c0 .9 0 1.35.16 1.72.15.38.4.68.92.92.37.16.82.16 1.72.16h6.4c.9 0 1.35 0 1.72-.16a1.9 1.9 0 0 0 .92-.92c.16-.37.16-.82.16-1.72v-.7l3.16 2.16c.63.44 1.47-.01 1.47-.78V7.12c0-.77-.84-1.22-1.47-.78L15 8.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const UserPlusIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M18.5 8v5.5M15.75 10.75h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SparkleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11 3.5c.3 2.1 1 3.6 2.1 4.7 1.1 1.1 2.6 1.8 4.7 2.1-2.1.3-3.6 1-4.7 2.1-1.1 1.1-1.8 2.6-2.1 4.7-.3-2.1-1-3.6-2.1-4.7-1.1-1.1-2.6-1.8-4.7-2.1 2.1-.3 3.6-1 4.7-2.1 1.1-1.1 1.8-2.6 2.1-4.7Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 15.5c.16 1 .48 1.7 1 2.24.52.53 1.24.85 2.24 1-.99.16-1.72.48-2.24 1a3.5 3.5 0 0 0-1 2.25c-.16-1-.48-1.72-1-2.25-.52-.52-1.25-.84-2.24-1 1-.15 1.72-.47 2.24-1 .52-.53.84-1.24 1-2.24Z"
      fill="currentColor"
    />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * LiveClassTab
 * Renders the "Live class" tab panel of a classroom: the meeting-room
 * entry card on the left, and the Attendance + Live quiz utilities on
 * the right. Fully self-contained state — wire the callbacks below to
 * real API calls when integrating.
 */
export default function LiveClassTab({
  onJoinLiveClass,
  onTakeAttendance,
  onCreateQuiz,
}) {
  // ---- Join live class ----
  const [isJoining, setIsJoining] = useState(false);
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
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } catch (err) {
      setJoinError('Could not join the room. Try again.');
    } finally {
      setIsJoining(false);
    }
  }, [isJoining, onJoinLiveClass]);

  const handleTakeAttendance = useCallback(async () => {
    if (isTakingAttendance) return;
    setIsTakingAttendance(true);
    setAttendanceError('');
    const name = checkInName.trim();
    try {
      if (onTakeAttendance) {
        await onTakeAttendance(name);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      setCheckIns((prev) => [
        {
          id: `${Date.now()}`,
          name: name || 'Anonymous',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setCheckInName('');
      nameInputRef.current?.focus();
    } catch (err) {
      setAttendanceError('Check-in failed. Please try again.');
    } finally {
      setIsTakingAttendance(false);
    }
  }, [checkInName, isTakingAttendance, onTakeAttendance]);

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
            <VideoIcon className={styles.videoBadgeIcon} />
          </div>
          <h2 className={styles.roomTitle}>Live class room</h2>
          <p className={styles.roomDescription}>
            Video, audio, screen sharing, chat and raise-hand run inside the classroom&rsquo;s own
            meeting room. Everyone with the classroom open joins the same room.
          </p>

          <button
            type="button"
            className={styles.joinButton}
            onClick={handleJoinLiveClass}
            disabled={isJoining}
            aria-busy={isJoining}
          >
            {isJoining ? (
              <>
                <SpinnerIcon className={styles.spinner} />
                Joining&hellip;
              </>
            ) : (
              'Join live class'
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
                <SpinnerIcon className={styles.spinner} />
              ) : (
                <UserPlusIcon className={styles.buttonIcon} />
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
              <SpinnerIcon className={styles.spinner} />
            ) : (
              <SparkleIcon className={styles.buttonIcon} />
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