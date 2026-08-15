import React, { useCallback, useState } from 'react';
import { Plus, MessageSquare, BookOpen, Loader2 } from 'lucide-react';
import styles from './study-buddy.module.css';

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
          <BookOpen className={styles.headerIconGlyph} />
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
            <Loader2 className={`${styles.spinner} animate-spin`} />
          ) : (
            <Plus className={styles.buttonIcon} />
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
                <MessageSquare className={styles.conversationIcon} />
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
                <Loader2 className={`${styles.spinner} animate-spin`} />
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