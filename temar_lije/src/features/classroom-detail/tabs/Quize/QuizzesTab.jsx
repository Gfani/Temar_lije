import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  BarChart3,
  BookOpen,
  Loader2,
  Users,
  Eye,
} from 'lucide-react';
import {
  getQuizzes,
  createQuiz,
  publishQuiz,
  getQuizDetails,
  submitQuiz,
  getSubmissionResult,
  getQuizAnalytics,
  deleteQuiz,
} from '../../../../services/apiClient';

export default function QuizzesTab({
  classId = '',
  isTeacher = false,
  currentUser = { name: 'User', role: 'Student' },
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Teacher: Create Quiz Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDesc, setNewQuizDesc] = useState('');
  const [newQuizDuration, setNewQuizDuration] = useState(15);
  const [newQuizPublish, setNewQuizPublish] = useState(true);
  const [questions, setQuestions] = useState([
    {
      id: 'q1',
      text: '',
      type: 'MULTIPLE_CHOICE',
      points: 1,
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
      ],
    },
  ]);

  // Teacher: Analytics Modal
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Student: Quiz Taking State
  const [takingQuiz, setTakingQuiz] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({}); // { [questionId]: selectedOptionId }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [takeError, setTakeError] = useState('');

  // Student: Quiz Results Modal
  const [resultModal, setResultModal] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Deleting Quiz
  const [deletingId, setDeletingId] = useState(null);

  // Load quizzes for current classroom
  const loadQuizzesList = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getQuizzes(classId);
      const list = Array.isArray(data) ? data : data?.all || [];
      setQuizzes(list);
    } catch (err) {
      console.warn('Failed to load quizzes:', err);
      setError('Could not load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadQuizzesList();
  }, [loadQuizzesList]);

  // --- Question Builder Handlers (Teacher) ---
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        text: '',
        type: 'MULTIPLE_CHOICE',
        points: 1,
        options: [
          { id: `opt_1_${Date.now()}`, text: '', isCorrect: true },
          { id: `opt_2_${Date.now()}`, text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      alert('A quiz must contain at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        if (field === 'type' && value === 'TRUE_FALSE') {
          return {
            ...q,
            type: value,
            options: [
              { id: 'tf_true', text: 'True', isCorrect: true },
              { id: 'tf_false', text: 'False', isCorrect: false },
            ],
          };
        }
        if (field === 'type' && value === 'MULTIPLE_CHOICE' && q.type === 'TRUE_FALSE') {
          return {
            ...q,
            type: value,
            options: [
              { id: `opt_1_${Date.now()}`, text: '', isCorrect: true },
              { id: `opt_2_${Date.now()}`, text: '', isCorrect: false },
            ],
          };
        }
        return { ...q, [field]: value };
      })
    );
  };

  const handleOptionTextChange = (qIdx, optIdx, text) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOptions = q.options.map((opt, oi) =>
          oi === optIdx ? { ...opt, text } : opt
        );
        return { ...q, options: newOptions };
      })
    );
  };

  const handleSetCorrectOption = (qIdx, optIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOptions = q.options.map((opt, oi) => ({
          ...opt,
          isCorrect: oi === optIdx,
        }));
        return { ...q, options: newOptions };
      })
    );
  };

  const handleAddOption = (qIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        if (q.options.length >= 6) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: `opt_${q.options.length + 1}_${Date.now()}`, text: '', isCorrect: false },
          ],
        };
      })
    );
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        if (q.options.length <= 2) return q;
        const remaining = q.options.filter((_, oi) => oi !== optIdx);
        // Ensure at least one option remains correct
        const hasCorrect = remaining.some((o) => o.isCorrect);
        if (!hasCorrect && remaining.length > 0) {
          remaining[0].isCorrect = true;
        }
        return { ...q, options: remaining };
      })
    );
  };

  // Create Quiz Form Submission
  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newQuizTitle.trim()) {
      setCreateError('Please enter a quiz title.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setCreateError(`Question ${i + 1} is missing question text.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          setCreateError(`Option ${j + 1} in Question ${i + 1} cannot be empty.`);
          return;
        }
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        setCreateError(`Question ${i + 1} must have exactly one correct answer selected.`);
        return;
      }
    }

    setCreating(true);
    try {
      await createQuiz(classId, {
        title: newQuizTitle.trim(),
        description: newQuizDesc.trim() || undefined,
        durationMinutes: Number(newQuizDuration) || 15,
        isPublished: newQuizPublish,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          points: Number(q.points) || 1,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text.trim(),
            isCorrect: o.isCorrect,
          })),
        })),
      });

      setShowCreateModal(false);
      // Reset form
      setNewQuizTitle('');
      setNewQuizDesc('');
      setNewQuizDuration(15);
      setQuestions([
        {
          id: 'q1',
          text: '',
          type: 'MULTIPLE_CHOICE',
          points: 1,
          options: [
            { id: 'opt_1', text: '', isCorrect: true },
            { id: 'opt_2', text: '', isCorrect: false },
          ],
        },
      ]);
      await loadQuizzesList();
    } catch (err) {
      setCreateError(err.message || 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  // Publish Quiz
  const handlePublish = async (quizId) => {
    try {
      await publishQuiz(quizId);
      await loadQuizzesList();
    } catch (err) {
      alert(err.message || 'Failed to publish quiz');
    }
  };

  // Delete Quiz
  const handleDelete = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      await loadQuizzesList();
    } catch (err) {
      alert(err.message || 'Failed to delete quiz');
    } finally {
      setDeletingId(null);
    }
  };

  // Teacher: View Analytics
  const handleOpenAnalytics = async (quiz) => {
    setAnalyticsQuiz(quiz);
    setLoadingAnalytics(true);
    try {
      const data = await getQuizAnalytics(quiz.id);
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Student: Start Taking Quiz
  const handleStartTakingQuiz = async (quiz) => {
    setTakeError('');
    setLoading(true);
    try {
      const details = await getQuizDetails(quiz.id);
      setTakingQuiz(details);
      setCurrentQuestionIdx(0);
      setStudentAnswers({});
    } catch (err) {
      alert(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  // Student: Answer selection
  const handleSelectOption = (questionId, optionId) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Student: Submit Answers
  const handleSubmitQuizAnswers = async () => {
    if (!takingQuiz) return;
    const answeredCount = Object.keys(studentAnswers).length;
    const totalCount = takingQuiz.questions?.length || 0;

    if (
      answeredCount < totalCount &&
      !window.confirm(
        `You have answered ${answeredCount} of ${totalCount} questions. Are you sure you want to submit? Unanswered questions will receive 0 points.`
      )
    ) {
      return;
    }

    setSubmittingQuiz(true);
    setTakeError('');
    try {
      const answersList = (takingQuiz.questions || []).map((q) => ({
        questionId: q.id,
        selectedOptionId: studentAnswers[q.id] !== undefined ? studentAnswers[q.id] : null,
      }));

      const answersPayload = {
        studentId: currentUser?.id,
        answers: answersList,
      };

      const result = await submitQuiz(takingQuiz.id, answersPayload);
      setTakingQuiz(null);
      setResultModal(result);
      await loadQuizzesList();
    } catch (err) {
      setTakeError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Student: View Past Result
  const handleViewResult = async (quizId) => {
    setLoadingResult(true);
    try {
      const data = await getSubmissionResult(quizId);
      setResultModal(data);
    } catch (err) {
      alert(err.message || 'Failed to load quiz results');
    } finally {
      setLoadingResult(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: '700',
              margin: '0 0 4px 0',
              color: '#16181b',
            }}
          >
            {isTeacher ? 'Classroom Quizzes' : 'Available Quizzes'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
            {isTeacher
              ? 'Create deterministic assessments, manage questions, and analyze class performance.'
              : 'Test your knowledge, review instant grades, and monitor your understanding.'}
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
              boxShadow: '0 2px 4px rgba(20, 120, 92, 0.2)',
            }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Create Quiz
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Quizzes Grid */}
      {loading ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Loader2
            size={32}
            className="animate-spin"
            style={{ margin: '0 auto 12px', color: '#14785c' }}
          />
          <p style={{ color: '#6b7280', margin: 0 }}>Loading quizzes...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
          }}
        >
          <BookOpen
            size={40}
            style={{ margin: '0 auto 12px', color: '#9ca3af', opacity: 0.8 }}
          />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#16181b' }}>
            No Quizzes Available
          </h3>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            {isTeacher
              ? 'Click "Create Quiz" above to publish your first assessment.'
              : 'There are no active quizzes in this classroom right now.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '16px',
          }}
        >
          {quizzes.map((quiz) => {
            const isSubmitted = quiz.submitted === true;
            const scorePercentage =
              quiz.maxScore && quiz.maxScore > 0
                ? Math.round((quiz.score / quiz.maxScore) * 100)
                : null;

            return (
              <div
                key={quiz.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#0369a1',
                        background: '#e0f2fe',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} /> {quiz.durationMinutes || 15} mins ·{' '}
                      {quiz.questionCount || 0} Qs
                    </span>

                    {isTeacher ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          color: quiz.isPublished ? '#15803d' : '#b45309',
                          background: quiz.isPublished ? '#dcfce7' : '#fef3c7',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </span>
                    ) : isSubmitted ? (
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
                        <CheckCircle2 size={12} /> Score: {scorePercentage}%
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          color: '#4b5563',
                          background: '#f3f4f6',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        Not Taken
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: '600',
                      margin: '0 0 6px 0',
                      color: '#16181b',
                    }}
                  >
                    {quiz.title}
                  </h3>

                  {quiz.description && (
                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: '#6b7280',
                        margin: '0 0 10px 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {quiz.description}
                    </p>
                  )}

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#8b9491',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span>Total Points: {quiz.totalPoints || quiz.questionCount || 0}</span>
                    {isTeacher && <span>Submissions: {quiz.submissionCount || 0}</span>}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isTeacher ? (
                    <>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#f3f7f5',
                          color: '#14785c',
                          border: '1px solid #c2ded6',
                          borderRadius: '8px',
                          fontSize: '0.825rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                        onClick={() => handleOpenAnalytics(quiz)}
                      >
                        <BarChart3 size={14} /> Analytics
                      </button>

                      {!quiz.isPublished && (
                        <button
                          type="button"
                          style={{
                            padding: '8px 12px',
                            background: '#14785c',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.825rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                          onClick={() => handlePublish(quiz.id)}
                        >
                          Publish
                        </button>
                      )}

                      <button
                        type="button"
                        style={{
                          padding: '8px',
                          background: '#fff',
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={() => handleDelete(quiz.id)}
                        disabled={deletingId === quiz.id}
                        title="Delete quiz"
                      >
                        {deletingId === quiz.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {isSubmitted ? (
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            background: '#f3f7f5',
                            color: '#14785c',
                            border: '1px solid #c2ded6',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                          onClick={() => handleViewResult(quiz.id)}
                          disabled={loadingResult}
                        >
                          <Eye size={15} /> Review Results
                        </button>
                      ) : (
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            background: '#14785c',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                          onClick={() => handleStartTakingQuiz(quiz)}
                        >
                          Take Quiz <ChevronRight size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TEACHER: Create Quiz Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#16181b' }}>
                Create New Quiz
              </h3>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleSaveQuiz}>
              {/* Basic Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: '#374151',
                    }}
                  >
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 3 Checkpoint: Core Grammar"
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: '#374151',
                    }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Short summary or instructions for students..."
                    value={newQuizDesc}
                    onChange={(e) => setNewQuizDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      boxSizing: 'border-box',
                      minHeight: '60px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: '#374151',
                      }}
                    >
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={newQuizDuration}
                      onChange={(e) => setNewQuizDuration(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                    <input
                      type="checkbox"
                      id="publishCheck"
                      checked={newQuizPublish}
                      onChange={(e) => setNewQuizPublish(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#14785c' }}
                    />
                    <label
                      htmlFor="publishCheck"
                      style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}
                    >
                      Publish immediately
                    </label>
                  </div>
                </div>
              </div>

              {/* Question Builder Section */}
              <div style={{ marginTop: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#16181b' }}>
                    Questions ({questions.length})
                  </h4>
                  <button
                    type="button"
                    style={{
                      padding: '6px 12px',
                      background: '#f3f7f5',
                      color: '#14785c',
                      border: '1px solid #c2ded6',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onClick={handleAddQuestion}
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px',
                        }}
                      >
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#16181b' }}>
                          Question {qIdx + 1}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={q.type}
                            onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.8rem',
                            }}
                          >
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="TRUE_FALSE">True / False</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Remove Question"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Enter question text here..."
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          boxSizing: 'border-box',
                          marginBottom: '12px',
                        }}
                        required
                      />

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                          Select the radio button next to the correct answer:
                        </span>

                        {q.options.map((opt, optIdx) => (
                          <div
                            key={opt.id || optIdx}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={opt.isCorrect}
                              onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                              style={{ width: '16px', height: '16px', accentColor: '#14785c' }}
                              title="Mark as correct answer"
                            />

                            <input
                              type="text"
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt.text}
                              onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                              readOnly={q.type === 'TRUE_FALSE'}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '0.85rem',
                                background: q.type === 'TRUE_FALSE' ? '#f3f4f6' : '#fff',
                              }}
                              required
                            />

                            {q.type === 'MULTIPLE_CHOICE' && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(qIdx, optIdx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#9ca3af',
                                  cursor: 'pointer',
                                  padding: '2px',
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}

                        {q.type === 'MULTIPLE_CHOICE' && q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '4px 8px',
                              background: 'none',
                              border: 'none',
                              color: '#14785c',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              marginTop: '4px',
                            }}
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '16px',
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#14785c',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save & Create Quiz'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER: Analytics Modal */}
      {analyticsQuiz && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#16181b' }}>
                  Quiz Analytics: {analyticsQuiz.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Class-wide grading overview & student submissions
                </span>
              </div>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
                onClick={() => setAnalyticsQuiz(null)}
              >
                ✕
              </button>
            </div>

            {loadingAnalytics ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ margin: '0 auto 8px', color: '#14785c' }}
                />
                <p style={{ color: '#6b7280' }}>Loading analytics...</p>
              </div>
            ) : !analyticsData ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
                No analytics data available.
              </p>
            ) : (
              <div>
                {/* Stats Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                      Submissions
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: '#1e293b' }}>
                      {analyticsData.totalSubmissions || 0}
                    </strong>
                  </div>

                  <div
                    style={{
                      background: '#f0fdf4',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block' }}>
                      Class Average
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>
                      {analyticsData.averageScore || 0} pts
                    </strong>
                  </div>

                  <div
                    style={{
                      background: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #bae6fd',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#0369a1', display: 'block' }}>
                      High / Low
                    </span>
                    <strong style={{ fontSize: '1.25rem', color: '#0284c7' }}>
                      {analyticsData.highestScore || 0} / {analyticsData.lowestScore || 0}
                    </strong>
                  </div>
                </div>

                {/* Submissions List */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#16181b' }}>
                  Student Submissions
                </h4>

                {analyticsData.submissions?.length === 0 ? (
                  <p style={{ color: '#8b9491', fontSize: '0.875rem' }}>
                    No students have submitted this quiz yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    {analyticsData.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#ffffff',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.875rem', color: '#16181b' }}>
                            {sub.studentName}
                          </strong>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                            }}
                          >
                            {sub.studentEmail}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontWeight: '700',
                              color: '#15803d',
                              fontSize: '0.9rem',
                            }}
                          >
                            {sub.percentage}% ({sub.score}/{sub.maxScore} pts)
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#9ca3af',
                            }}
                          >
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => setAnalyticsQuiz(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT: Quiz Taking Interactive View */}
      {takingQuiz && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 30px -5px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#16181b' }}>
                  {takingQuiz.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Question {currentQuestionIdx + 1} of {takingQuiz.questions?.length || 0}
                </span>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#0369a1',
                  background: '#e0f2fe',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={13} /> {takingQuiz.durationMinutes || 15} mins
              </span>
            </div>

            {takeError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {takeError}
              </div>
            )}

            {/* Current Question */}
            {takingQuiz.questions && takingQuiz.questions[currentQuestionIdx] && (
              <div>
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: '#16181b',
                    marginBottom: '18px',
                    lineHeight: 1.4,
                  }}
                >
                  {takingQuiz.questions[currentQuestionIdx].text}
                </div>

                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {takingQuiz.questions[currentQuestionIdx].options.map((opt) => {
                    const questionId = takingQuiz.questions[currentQuestionIdx].id;
                    const isSelected = studentAnswers[questionId] === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(questionId, opt.id)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #14785c' : '1px solid #e5e7eb',
                          backgroundColor: isSelected ? '#f3f7f5' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #14785c' : '2px solid #d1d5db',
                            backgroundColor: '#fff',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.92rem',
                            color: isSelected ? '#14785c' : '#374151',
                            fontWeight: isSelected ? '600' : '400',
                          }}
                        >
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Question Navigation & Submit */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '28px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: currentQuestionIdx === 0 ? '#9ca3af' : '#374151',
                  cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTakingQuiz(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                {currentQuestionIdx < (takingQuiz.questions?.length || 0) - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIdx((prev) =>
                        Math.min((takingQuiz.questions?.length || 1) - 1, prev + 1)
                      )
                    }
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#14785c',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitQuizAnswers}
                    disabled={submittingQuiz}
                    style={{
                      padding: '8px 22px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#14785c',
                      color: '#fff',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {submittingQuiz ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Submit Quiz
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT: Quiz Results Modal */}
      {resultModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 30px -5px rgba(0,0,0,0.15)',
            }}
          >
            {/* Score Banner */}
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                borderRadius: '12px',
                background: resultModal.percentage >= 70 ? '#f0fdf4' : '#fff7ed',
                border:
                  resultModal.percentage >= 70 ? '1px solid #bbf7d0' : '1px solid #ffedd5',
                marginBottom: '20px',
              }}
            >
              <Award
                size={36}
                style={{
                  margin: '0 auto 8px',
                  color: resultModal.percentage >= 70 ? '#15803d' : '#c2410c',
                }}
              />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#16181b' }}>
                {resultModal.percentage}%
              </h3>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.875rem' }}>
                You scored <strong>{resultModal.score}</strong> out of{' '}
                <strong>{resultModal.maxScore}</strong> total points
              </p>
            </div>

            {/* Answer Breakdown */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#16181b' }}>
              Question Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resultModal.answers?.map((ans, idx) => (
                <div
                  key={ans.questionId || idx}
                  style={{
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    background: ans.isCorrect ? '#fcfdfd' : '#fffcfc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#16181b' }}>
                      Question {idx + 1}: {ans.questionText}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: ans.isCorrect ? '#15803d' : '#dc2626',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {ans.isCorrect ? (
                        <>
                          <CheckCircle2 size={14} /> +{ans.pointsAwarded} pt
                        </>
                      ) : (
                        <>
                          <XCircle size={14} /> 0 pt
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.825rem', color: '#4b5563' }}>
                    <span>Your Answer: </span>
                    <strong style={{ color: ans.isCorrect ? '#15803d' : '#dc2626' }}>
                      {ans.selectedText}
                    </strong>
                  </div>

                  {!ans.isCorrect && ans.correctText && (
                    <div style={{ fontSize: '0.825rem', color: '#15803d' }}>
                      <span>Correct Answer: </span>
                      <strong>{ans.correctText}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#14785c',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => setResultModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
