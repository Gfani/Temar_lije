import React, { useCallback, useState } from 'react';
import styles from './TeacherMemberTab.module.css';

/* Inline icons — no external icon library required. */

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4.75 19c.85-3.6 3.7-5.75 7.25-5.75s6.4 2.15 7.25 5.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const DEFAULT_MEMBERS = [
  { id: 'seed-fiema', name: 'Fiema Yaregal', joinedAt: '2026-08-06' },
  { id: 'seed-fani', name: 'Fani', joinedAt: '2026-08-06' },
  { id: 'seed-gelila', name: 'Gelila Sintayehu', joinedAt: '2026-08-07' },
];

function formatJoined(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Joined recently';
  return `Joined ${date.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

/**
 * TeacherMemberTab
 * Renders the "Members" tab panel of a classroom for the teacher:
 * a roster list with each student's name, join date, and a Remove
 * action. Fully self-contained state — wire onRemoveMember to a real
 * API call when integrating.
 */
export default function TeacherMemberTab({ initialMembers = DEFAULT_MEMBERS, onRemoveMember }) {
  const [members, setMembers] = useState(initialMembers);
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState('');

  const handleRemoveMember = useCallback(
    async (id) => {
      if (removingId) return;
      setRemovingId(id);
      setRemoveError('');
      try {
        if (onRemoveMember) {
          await onRemoveMember(id);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        setRemoveError('Could not remove this member. Try again.');
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, onRemoveMember]
  );

  return (
    <div className={styles.container}>
      {removeError && (
        <p className={styles.inlineError} role="alert">
          {removeError}
        </p>
      )}

      {members.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyState}>No members yet. Share the invitation code to invite students.</p>
        </div>
      ) : (
        <ul className={styles.memberList}>
          {members.map((member) => {
            const isRemoving = removingId === member.id;
            return (
              <li key={member.id} className={styles.memberRow}>
                <div className={styles.memberInfo}>
                  <span className={styles.avatar}>
                    <UserIcon className={styles.avatarIcon} />
                  </span>
                  <div className={styles.memberText}>
                    <span className={styles.memberName}>{member.name}</span>
                    <span className={styles.memberJoined}>{formatJoined(member.joinedAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removingId !== null}
                  aria-busy={isRemoving}
                  aria-label={`Remove ${member.name}`}
                >
                  {isRemoving ? (
                    <>
                      <SpinnerIcon className={styles.spinner} />
                      <span>Removing…</span>
                    </>
                  ) : (
                    <span>Remove</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}