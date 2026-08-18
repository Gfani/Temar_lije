import React, { useCallback, useState, useEffect } from 'react';
import { Calendar, Trash2, Loader2, Upload, Link, FileText, CheckCircle } from 'lucide-react';
import { getAssignments, createAssignment, submitAssignment, getSubmissions, getFileUrl } from '../../../../services/apiClient';
import styles from './AssignmentsTab.module.css';

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline';
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatSubmissions(count) {
  if (!count && count !== 0) return 'No submissions yet.';
  return `${count} submission${count === 1 ? '' : 's'}`;
}

export default function AssignmentsTab({
  classId = '66666666-6666-4666-8666-666666666666',
  isTeacher = true,
  currentUserId = '33333333-3333-4333-8333-333333333333',
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceError, setAnnounceError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Student submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  // Teacher submissions modal state
  const [viewingSubmissionsAssignment, setViewingSubmissionsAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const handleOpenSubmissions = async (assignment) => {
    setViewingSubmissionsAssignment(assignment);
    setLoadingSubmissions(true);
    try {
      const data = await getSubmissions(assignment.id);
      setSubmissionsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setSubmissionsList([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssignments(classId);
      const list = data?.all || (Array.isArray(data) ? data : []);
      setAssignments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleAnnounceSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (isAnnouncing) return;
      if (!title.trim() && !description.trim()) return;

      setIsAnnouncing(true);
      setAnnounceError('');
      try {
        await createAssignment({
          title: title.trim() || 'Untitled assignment',
          description: description.trim() || '',
          deadline: deadline || undefined,
          classId,
        });

        setTitle('');
        setDescription('');
        setDeadline('');
        await loadAssignments();
      } catch (err) {
        setAnnounceError(err.message || 'Could not announce assignment. Try again.');
      } finally {
        setIsAnnouncing(false);
      }
    },
    [isAnnouncing, title, description, deadline, classId, loadAssignments]
  );

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    if (!submissionFile && !submissionLink.trim()) {
      setSubmissionError('Please select a file to upload or enter a link URL.');
      return;
    }

    setIsSubmittingWork(true);
    setSubmissionError('');
    setSubmissionSuccess('');

    try {
      const formData = new FormData();
      formData.append('studentId', currentUserId);
      if (submissionFile) formData.append('file', submissionFile);
      if (submissionLink) formData.append('linkUrl', submissionLink.trim());

      await submitAssignment(submittingAssignment.id, formData);
      setSubmissionSuccess('Work submitted successfully!');
      setTimeout(() => {
        setSubmittingAssignment(null);
        setSubmissionFile(null);
        setSubmissionLink('');
        setSubmissionSuccess('');
      }, 1200);
      await loadAssignments();
    } catch (err) {
      setSubmissionError(err.message || 'Submission failed.');
    } finally {
      setIsSubmittingWork(false);
    }
  };

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
            </div>
          </div>
        </form>
      )}

      {announceError && (
        <p className={styles.inlineError} role="alert">
          {announceError}
        </p>
      )}

      {loading ? (
        <div className={styles.emptyCard}>
          <Loader2 className={`${styles.spinner} animate-spin`} style={{ margin: '0 auto 1rem' }} />
          <p className={styles.emptyState}>Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyState}>No assignments yet. Announce one for your class.</p>
        </div>
      ) : (
        <ul className={styles.assignmentList}>
          {assignments.map((assignment) => {
            const count = assignment._count?.submissions ?? assignment.submissionCount ?? 0;
            return (
              <li key={assignment.id} className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <h3 className={styles.assignmentTitle}>{assignment.title}</h3>
                </div>

                <p className={styles.assignmentDescription}>{assignment.description}</p>
                <p className={styles.assignmentDeadline}>
                  {formatDeadline(assignment.dueDate || assignment.deadline)}
                </p>

                <div className={styles.assignmentFooter}>
                  <p className={styles.assignmentSubmissions}>{formatSubmissions(count)}</p>
                  {isTeacher ? (
                    <button
                      type="button"
                      onClick={() => handleOpenSubmissions(assignment)}
                      style={{
                        backgroundColor: '#f3f7f5',
                        color: '#14785c',
                        border: '1px solid #c2ded6',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Submissions
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmittingAssignment(assignment)}
                      style={{
                        backgroundColor: '#14785c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Submit Work
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Student Work Submission Modal */}
      {submittingAssignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '480px',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#16181b' }}>
              Submit Work: {submittingAssignment.title}
            </h3>

            {submissionSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a' }}>
                <CheckCircle size={18} /> {submissionSuccess}
              </div>
            )}
            {submissionError && <p style={{ color: '#dc2626', fontSize: '14px' }}>{submissionError}</p>}

            <form onSubmit={handleSubmitWork} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Upload File (PDF / Doc)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  style={{ fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Or Submission Link URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWork}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#14785c',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingWork ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher View Submissions Modal */}
      {viewingSubmissionsAssignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '560px',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#16181b' }}>
              Submissions: {viewingSubmissionsAssignment.title}
            </h3>

            {loadingSubmissions ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Loader2 className={`${styles.spinner} animate-spin`} style={{ margin: '0 auto 8px' }} />
                <p>Loading student submissions...</p>
              </div>
            ) : submissionsList.length === 0 ? (
              <p style={{ color: '#8b9491', padding: '16px 0' }}>No submissions received yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {submissionsList.map((sub) => {
                  const studentName = sub.student?.fullName || sub.student?.email || 'Student';
                  const fileLink = getFileUrl(sub.fileUrl);
                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #e3e9e6',
                        borderRadius: '8px',
                        backgroundColor: '#fafbfc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#16181b' }}>{studentName}</span>
                        <span style={{ fontSize: '12px', color: '#8b9491' }}>
                          {new Date(sub.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      {sub.submissionText && (
                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>{sub.submissionText}</p>
                      )}
                      {fileLink && (
                        <a
                          href={fileLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '13px',
                            color: '#14785c',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          <FileText size={14} /> View File / Link
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setViewingSubmissionsAssignment(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}