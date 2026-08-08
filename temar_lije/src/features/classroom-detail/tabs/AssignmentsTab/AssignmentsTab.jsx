import React, { useCallback, useState } from 'react';
import styles from './AssignmentsTab.module.css';

/* Inline icons — no external icon library required. */

const MegaphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.5 10.5v3a1.5 1.5 0 0 0 1.5 1.5h1l.9 3.3a1 1 0 0 0 .97.75h.63a1 1 0 0 0 .96-1.27L8.6 15h1.3l7.4 3.1a.9.9 0 0 0 1.25-.83V6.73a.9.9 0 0 0-1.25-.83L9.9 9H5A1.5 1.5 0 0 0 3.5 10.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M18.5 8.75v6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7m1.5 0-.6 11.4a2 2 0 0 1-2 1.9h-5.8a2 2 0 0 1-2-1.9L6 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 10.5v6M14 10.5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const DEFAULT_ASSIGNMENTS = [
  {
    id: 'seed-weather-app',
    title: 'Weather App',
    description: 'Create Flutter folder and build a weather app using a live weather API',
    deadline: null,
    submissionCount: 0,
  },
];

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline';
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatSubmissions(count) {
  if (!count) return 'No submissions yet.';
  return `${count} submission${count === 1 ? '' : 's'}`;
}

/**
 * AssignmentsTab
 * Renders the "Assignments" tab panel of a classroom: an "Announce
 * assignment" action and the list of posted assignments, each with a
 * delete control. Fully self-contained state — wire the callbacks
 * below to real API calls when integrating.
 */
export default function AssignmentsTab({
  initialAssignments = DEFAULT_ASSIGNMENTS,
  onAnnounceAssignment,
  onDeleteAssignment,
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceError, setAnnounceError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const handleAnnounceAssignment = useCallback(async () => {
    if (isAnnouncing) return;
    setIsAnnouncing(true);
    setAnnounceError('');
    try {
      let assignment;
      if (onAnnounceAssignment) {
        assignment = await onAnnounceAssignment();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      setAssignments((prev) => [
        assignment ?? {
          id: `${Date.now()}`,
          title: 'Untitled assignment',
          description: 'Add a description for this assignment.',
          deadline: null,
          submissionCount: 0,
        },
        ...prev,
      ]);
    } catch (err) {
      setAnnounceError('Could not announce the assignment. Try again.');
    } finally {
      setIsAnnouncing(false);
    }
  }, [isAnnouncing, onAnnounceAssignment]);

  const handleDeleteAssignment = useCallback(
    async (id) => {
      if (deletingId) return;
      setDeletingId(id);
      setDeleteError('');
      try {
        if (onDeleteAssignment) {
          await onDeleteAssignment(id);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        setDeleteError('Could not delete the assignment. Try again.');
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, onDeleteAssignment]
  );

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.announceButton}
        onClick={handleAnnounceAssignment}
        disabled={isAnnouncing}
        aria-busy={isAnnouncing}
      >
        {isAnnouncing ? (
          <SpinnerIcon className={styles.spinner} />
        ) : (
          <MegaphoneIcon className={styles.buttonIcon} />
        )}
        <span>{isAnnouncing ? 'Announcing…' : 'Announce assignment'}</span>
      </button>

      {announceError && (
        <p className={styles.inlineError} role="alert">
          {announceError}
        </p>
      )}
      {deleteError && (
        <p className={styles.inlineError} role="alert">
          {deleteError}
        </p>
      )}

      {assignments.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyState}>No assignments yet. Announce one for your class.</p>
        </div>
      ) : (
        <ul className={styles.assignmentList}>
          {assignments.map((assignment) => {
            const isDeleting = deletingId === assignment.id;
            return (
              <li key={assignment.id} className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <h3 className={styles.assignmentTitle}>{assignment.title}</h3>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    disabled={deletingId !== null}
                    aria-busy={isDeleting}
                    aria-label={`Delete ${assignment.title}`}
                  >
                    {isDeleting ? (
                      <SpinnerIcon className={styles.spinner} />
                    ) : (
                      <TrashIcon className={styles.deleteIcon} />
                    )}
                  </button>
                </div>

                <p className={styles.assignmentDescription}>{assignment.description}</p>
                <p className={styles.assignmentDeadline}>{formatDeadline(assignment.deadline)}</p>

                <div className={styles.assignmentFooter}>
                  <p className={styles.assignmentSubmissions}>
                    {formatSubmissions(assignment.submissionCount)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}