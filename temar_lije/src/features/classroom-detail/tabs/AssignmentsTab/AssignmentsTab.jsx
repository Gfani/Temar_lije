import React, { useCallback, useState } from 'react';
import { Megaphone, Trash2, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import styles from './AssignmentsTab.module.css';

const DEFAULT_ASSIGNMENTS = [
  {
    id: 'seed-weather-app',
    title: 'Weather App Project',
    description: 'Create a Flutter project and build a weather app with live API integration and offline caching.',
    deadline: '2026-08-30T23:59:00',
    submissionCount: 3,
  },
  {
    id: 'seed-state-mgmt',
    title: 'State Management Exercise',
    description: 'Implement Provider / Riverpod state architecture in your classroom project.',
    deadline: '2026-09-05T23:59:00',
    submissionCount: 1,
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

export default function AssignmentsTab({
  isTeacher = false,
  currentUser,
  initialAssignments = DEFAULT_ASSIGNMENTS,
  onAnnounceAssignment,
  onDeleteAssignment,
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceError, setAnnounceError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [submittedIds, setSubmittedIds] = useState({});

  const handleAnnounceAssignment = useCallback(async () => {
    if (!isTeacher || isAnnouncing) return;
    const title = prompt('Enter assignment title:');
    if (!title || !title.trim()) return;
    const description = prompt('Enter assignment description:') || '';

    setIsAnnouncing(true);
    setAnnounceError('');
    try {
      let assignment = {
        id: `asg-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || 'Complete the assignment instructions provided.',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submissionCount: 0,
      };

      if (onAnnounceAssignment) {
        assignment = (await onAnnounceAssignment(assignment)) || assignment;
      }
      setAssignments((prev) => [assignment, ...prev]);
    } catch (err) {
      setAnnounceError('Could not announce the assignment. Try again.');
    } finally {
      setIsAnnouncing(false);
    }
  }, [isTeacher, isAnnouncing, onAnnounceAssignment]);

  const handleDeleteAssignment = useCallback(
    async (id) => {
      if (!isTeacher || deletingId) return;
      if (!confirm('Are you sure you want to delete this assignment?')) return;
      setDeletingId(id);
      setDeleteError('');
      try {
        if (onDeleteAssignment) {
          await onDeleteAssignment(id);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        setDeleteError('Could not delete the assignment. Try again.');
      } finally {
        setDeletingId(null);
      }
    },
    [isTeacher, deletingId, onDeleteAssignment]
  );

  const handleSubmitAssignment = (id) => {
    const file = prompt('Enter link or filename for your submission (e.g., github.com/... or project.zip):');
    if (file && file.trim()) {
      setSubmittedIds((prev) => ({ ...prev, [id]: true }));
      alert('Assignment submitted successfully!');
    }
  };

  return (
    <div className={styles.container}>
      {isTeacher && (
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
      )}

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
          <p className={styles.emptyState}>
            {isTeacher
              ? 'No assignments announced yet. Announce one for your class.'
              : 'No assignments assigned yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <ul className={styles.assignmentList}>
          {assignments.map((assignment) => {
            const isDeleting = deletingId === assignment.id;
            const isSubmitted = !!submittedIds[assignment.id];

            return (
              <li key={assignment.id} className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <h3 className={styles.assignmentTitle}>{assignment.title}</h3>
                  {isTeacher && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      disabled={deletingId !== null}
                      aria-busy={isDeleting}
                      aria-label={`Delete ${assignment.title}`}
                      title="Delete assignment"
                    >
                      {isDeleting ? (
                        <Loader2 className={`${styles.spinner} animate-spin`} />
                      ) : (
                        <Trash2 className={styles.deleteIcon} />
                      )}
                    </button>
                  )}
                </div>

                <p className={styles.assignmentDescription}>{assignment.description}</p>
                <p className={styles.assignmentDeadline}>{formatDeadline(assignment.deadline)}</p>

                <div className={styles.assignmentFooter}>
                  {isTeacher ? (
                    <p className={styles.assignmentSubmissions}>
                      {formatSubmissions(assignment.submissionCount)}
                    </p>
                  ) : (
                    <div>
                      {isSubmitted ? (
                        <span style={{ color: '#14785c', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                          <CheckCircle2 size={16} /> Submitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          style={{
                            padding: '6px 14px',
                            background: '#14785c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onClick={() => handleSubmitAssignment(assignment.id)}
                        >
                          <Upload size={14} /> Submit work
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}