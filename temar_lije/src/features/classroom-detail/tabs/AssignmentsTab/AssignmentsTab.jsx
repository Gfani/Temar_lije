import React, { useCallback, useState } from 'react';
import { Megaphone, Trash2, Loader2 } from 'lucide-react';
import styles from './AssignmentsTab.module.css';

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
          <Loader2 className={`${styles.spinner} animate-spin`} />
        ) : (
          <Megaphone className={styles.buttonIcon} />
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
                      <Loader2 className={`${styles.spinner} animate-spin`} />
                    ) : (
                      <Trash2 className={styles.deleteIcon} />
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