import React, { useCallback, useState } from 'react';
import styles from './study-buddy.module.css';

/* Inline icons — no external icon library required. */

const PlusIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ChatIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V16h-.5A2.5 2.5 0 0 1 2 13.5v-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const BookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* left page */}
    <path
      d="M15 6.2C12.6 4.4 9.4 3.8 6.4 4.4c-.85.17-1.4.93-1.4 1.8v12.4c0 1.08.99 1.87 2.03 1.64 2.53-.56 5.24.02 7.34 1.56.19.14.44.14.63 0V6.53a.6.6 0 0 0-.24-.33Z"
      fill="#22B8CF"
    />
    {/* right page */}
    <path
      d="M15 6.2c2.4-1.8 5.6-2.4 8.6-1.8.85.17 1.4.93 1.4 1.8v12.4c0 1.08-.99 1.87-2.03 1.64-2.53-.56-5.24.02-7.34 1.56a.42.42 0 0 1-.63 0V6.53c0-.13.04-.25.24-.33Z"
      fill="#34D399"
    />
    {/* spine */}
    <path d="M15 6.4v15.4" stroke="#0F5132" strokeWidth="1.1" strokeLinecap="round" />
    {/* sparkle */}
    <path
      d="M24 1.5c.18 1.05.55 1.78 1.15 2.38.6.6 1.33.97 2.38 1.15-1.05.18-1.78.55-2.38 1.15-.6.6-.97 1.33-1.15 2.38-.18-1.05-.55-1.78-1.15-2.38-.6-.6-1.33-.97-2.38-1.15 1.05-.18 1.78-.55 2.38-1.15.6-.6.97-1.33 1.15-2.38Z"
      fill="#FBBF24"
    />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const DEFAULT_CONVERSATIONS = [{ id: 'seed-1', title: 'New conversation' }];

const SUGGESTED_PROMPTS = [
  'Summarise the key ideas from my latest material.',
  'Make a 5-question practice quiz from my notes.',
  'Explain the hardest concept in my materials simply.',
];

/**
 * StudyBuddy
 * Renders the Study Buddy landing page: a conversation sidebar
 * (new-chat action + saved conversations) and a welcome card with
 * prompt starters. Fully self-contained state — wire the callbacks
 * below to real API calls / routing when integrating.
 */
export default function StudyBuddy({
  initialConversations = DEFAULT_CONVERSATIONS,
  onNewChat,
  onSelectConversation,
  onStartChat,
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [startError, setStartError] = useState('');

  const startChat = useCallback(
    async (prompt) => {
      if (isStartingChat) return;
      setIsStartingChat(true);
      setStartError('');
      try {
        let conversation;
        if (prompt ? onStartChat : onNewChat) {
          conversation = prompt ? await onStartChat(prompt) : await onNewChat();
        } else {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
        const next = conversation ?? {
          id: `${Date.now()}`,
          title: prompt ? prompt.slice(0, 48) : 'New conversation',
        };
        setConversations((prev) => [next, ...prev]);
        setActiveConversationId(next.id);
      } catch (err) {
        setStartError('Could not start a new chat. Try again.');
      } finally {
        setIsStartingChat(false);
      }
    },
    [isStartingChat, onNewChat, onStartChat]
  );

  const handleSelectConversation = useCallback(
    (id) => {
      setActiveConversationId(id);
      onSelectConversation?.(id);
    },
    [onSelectConversation]
  );

  const savedCount = conversations.length;

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <BookIcon className={styles.headerIconGlyph} />
          <div className={styles.headerText}>
            <span className={styles.headerTitle}>Study Buddy</span>
            <span className={styles.headerSubtitle}>Grounded in your materials</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.newChatButton}
          onClick={() => startChat()}
          disabled={isStartingChat}
          aria-busy={isStartingChat}
        >
          {isStartingChat ? (
            <SpinnerIcon className={styles.spinner} />
          ) : (
            <PlusIcon className={styles.buttonIcon} />
          )}
          <span>{isStartingChat ? 'Starting…' : 'New chat'}</span>
        </button>

        {startError && (
          <p className={styles.inlineError} role="alert">
            {startError}
          </p>
        )}

        <ul className={styles.conversationList}>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                className={`${styles.conversationItem} ${
                  activeConversationId === conversation.id ? styles.conversationItemActive : ''
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <ChatIcon className={styles.conversationIcon} />
                <span className={styles.conversationTitle}>{conversation.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.mainCard}>
        <div className={styles.mainCardInner}>
          <h1 className={styles.heading}>Ask Study Buddy</h1>
          <p className={styles.description}>
            Study Buddy reads the materials your teachers shared with you and answers with
            references to them. Start a new conversation to begin.
          </p>

          <div className={styles.promptList}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={styles.promptButton}
                onClick={() => startChat(prompt)}
                disabled={isStartingChat}
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.blankChatButton}
            onClick={() => startChat()}
            disabled={isStartingChat}
            aria-busy={isStartingChat}
          >
            {isStartingChat ? (
              <>
                <SpinnerIcon className={styles.spinner} />
                <span>Starting…</span>
              </>
            ) : (
              <span>Start a blank chat</span>
            )}
          </button>

          <p className={styles.hintText}>
            Or pick one of your {savedCount} saved conversation{savedCount === 1 ? '' : 's'} on the
            left.
          </p>
        </div>
      </main>
    </div>
  );
}