import React, { useCallback, useState } from 'react';
import { Calendar, Trash2, Loader2 } from 'lucide-react';
import styles from './AssignmentsTab.module.css';

const DEFAULT_ASSIGNMENTS = [
  {
    id: 'seed-weather-app',
    title: 'weather App',
    description: 'create flutter folder and and build a weather app using live weather API',
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

export default function AssignmentsTab({
  initialAssignments = DEFAULT_ASSIGNMENTS,
  isTeacher = true,
  onAnnounceAssignment,
  onDeleteAssignment,
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceError, setAnnounceError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const handleAnnounceSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (isAnnouncing) return;
      if (!title.trim() && !description.trim()) return;

      setIsAnnouncing(true);
      setAnnounceError('');
      try {
        const newAssignment = {
          id: `${Date.now()}`,
          title: title.trim() || 'Untitled assignment',
          description: description.trim() || '',
          deadline: deadline || null,
          submissionCount: 0,
        };
        if (onAnnounceAssignment) {
          await onAnnounceAssignment(newAssignment);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        setAssignments((prev) => [newAssignment, ...prev]);
        setTitle('');
        setDescription('');
        setDeadline('');
      } catch (err) {
        setAnnounceError('Could not announce the assignment. Try again.');
      } finally {
        setIsAnnouncing(false);
      }
    },
    [isAnnouncing, title, description, deadline, onAnnounceAssignment]
  );

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
  };

  const handleDeleteAssignment = useCallback(
    async (id) => {
      if (deletingId) return;
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
    [deletingId, onDeleteAssignment]
  );

  return (
    <div className={styles.container}>
      {isTeacher && (
        <form className={styles.announceFormCard} onSubmit={handleAnnounceSubmit}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder="Assignment title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isAnnouncing}
          />

          <textarea
            className={styles.descriptionInput}
            placeholder="What should students do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isAnnouncing}
          />

          <div className={styles.formBottomRow}>
            <div className={styles.deadlineGroup}>
              <span className={styles.deadlineLabel}>
                <Calendar size={15} /> Deadline
              </span>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={isAnnouncing}
              />
            </div>

            <div className={styles.actionButtonsRow}>
              <button
                type="submit"
                className={styles.btnAnnounce}
                disabled={isAnnouncing || (!title.trim() && !description.trim())}
              >
                {isAnnouncing ? (
                  <>
                    <Loader2 className={`${styles.spinner} animate-spin`} />
                    <span>Announcing…</span>
                  </>
                ) : (
                  <span>Announce</span>
                )}
              </button>

              <button
                type="button"
                className={styles.btnCancel}
                onClick={handleCancel}
                disabled={isAnnouncing}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
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
                  {isTeacher && (
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
                  )}
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