import React, { useState } from 'react';
import { Sparkles, Plus, Award, CheckCircle2, HelpCircle } from 'lucide-react';

const DEFAULT_QUIZZES = [
  {
    id: 'quiz-1',
    title: 'Mid-term Checkpoint: Core Concepts',
    questionsCount: 10,
    duration: '15 mins',
    avgScore: '84%',
    myScore: null,
  },
  {
    id: 'quiz-2',
    title: 'Quick Diagnostic Quiz: UI Elements & Layouts',
    questionsCount: 5,
    duration: '8 mins',
    avgScore: '91%',
    myScore: '100% (5/5)',
  }
];

export default function QuizzesTab({
  isTeacher = false,
  currentUser = { name: 'User', role: 'Student' }
}) {
  const [quizzes, setQuizzes] = useState(DEFAULT_QUIZZES);
  const [takingQuizId, setTakingQuizId] = useState(null);

  const handleCreateQuiz = () => {
    if (!isTeacher) return;
    const title = prompt('Enter quiz title:');
    if (!title || !title.trim()) return;

    const newQuiz = {
      id: `quiz-${Date.now()}`,
      title: title.trim(),
      questionsCount: 5,
      duration: '10 mins',
      avgScore: '0%',
      myScore: null,
    };
    setQuizzes((prev) => [newQuiz, ...prev]);
    alert(`Quiz "${title.trim()}" created successfully!`);
  };

  const handleTakeQuiz = (quiz) => {
    const ans = prompt(`Sample Question for ${quiz.title}:\n\nWhat is the primary benefit of an offline-first architecture?\nA) Zero battery usage\nB) Continued access without internet\nC) Faster monitor refresh rate\n\nEnter your answer (A, B, or C):`);
    if (ans) {
      alert(`Your response has been submitted! Score: 100% (Correct: B)`);
      setQuizzes((prev) =>
        prev.map((q) => (q.id === quiz.id ? { ...q, myScore: '100% (Completed)' } : q))
      );
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: '0 0 4px 0' }}>
            {isTeacher ? 'Classroom Quizzes (Teacher)' : 'Available Quizzes (Student)'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
            {isTeacher
              ? 'Create quizzes with automated grading and view class performance metrics.'
              : 'Test your understanding, practice key concepts, and check your scores.'}
          </p>
        </div>

        {isTeacher && (
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              background: '#14785c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onClick={handleCreateQuiz}
          >
            <Plus size={16} /> Create Quiz
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {quizzes.map((q) => (
          <div
            key={q.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#0369a1',
                    background: '#e0f2fe',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {q.questionsCount} Questions · {q.duration}
                </span>
                {q.myScore && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#15803d',
                      background: '#dcfce7',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={12} /> {q.myScore}
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: '600', margin: '0 0 8px 0' }}>{q.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px 0' }}>
                {isTeacher ? `Class Average: ${q.avgScore}` : 'Test your retention and core module knowledge.'}
              </p>
            </div>

            <div>
              {isTeacher ? (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={() => alert(`Reviewing analytics for ${q.title}...`)}
                >
                  View Class Results
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: q.myScore ? '#f3f4f6' : '#14785c',
                    color: q.myScore ? '#374151' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleTakeQuiz(q)}
                >
                  {q.myScore ? 'Retake Quiz' : 'Take Quiz'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
