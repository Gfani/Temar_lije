import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id.trim());
}

@Injectable()
export class QuizzesService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Helper to resolve classroom by UUID, invite code, or fallback
   */
  private async resolveClassroom(classroomId: string) {
    if (!classroomId) return null;
    const cleanId = String(classroomId).trim();

    if (isValidUUID(cleanId)) {
      try {
        const found = await this.databaseService.classroom.findUnique({
          where: { id: cleanId },
          include: { teachers: true, members: true },
        });
        if (found) return found;
      } catch (e) {
        // Continue fallback
      }
    }

    try {
      const byCode = await this.databaseService.classroom.findFirst({
        where: { OR: [{ inviteCode: cleanId }, { id: cleanId }] },
        include: { teachers: true, members: true },
      });
      if (byCode) return byCode;
    } catch (e) {
      // Continue fallback
    }

    try {
      return await this.databaseService.classroom.findFirst({
        include: { teachers: true, members: true },
      });
    } catch (e) {
      return null;
    }
  }

  /**
   * Validate cross-field invariants on questions before touching the database
   */
  validateQuestions(questions: any[]) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException('A quiz must contain at least 1 question.');
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qText = q.text || q.questionText || '';
      if (!qText.trim()) {
        throw new BadRequestException(`Question ${i + 1} must have non-empty text.`);
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestException(
          `Question ${i + 1} ("${qText.slice(0, 30)}...") must have at least 2 options.`,
        );
      }

      const correctCount = q.options.filter((opt: any) => opt.isCorrect === true).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          `Question ${i + 1} ("${qText.slice(0, 30)}...") must have exactly one correct option. Found ${correctCount}.`,
        );
      }

      const qType = q.type || q.questionType;
      if (qType === 'TRUE_FALSE' && q.options.length !== 2) {
        throw new BadRequestException(
          `True/False Question ${i + 1} must have exactly 2 options (True and False).`,
        );
      }
    }
  }

  /**
   * Create a new quiz
   */
  async createQuiz(classroomId: string, teacherId: string | undefined, dto: any) {
    const classroom = await this.resolveClassroom(classroomId || dto.classId);
    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    this.validateQuestions(dto.questions);

    const questionsData = dto.questions.map((q: any) => {
      const optionsWithIds = q.options.map((opt: any, optIndex: number) => ({
        id: opt.id || `opt_${optIndex + 1}_${Date.now()}`,
        text: typeof opt === 'string' ? opt : opt.text,
        isCorrect: opt.isCorrect === true,
      }));

      const correctOpt = optionsWithIds.find((opt: any) => opt.isCorrect);

      return {
        questionText: q.text || q.questionText,
        questionType: q.type || q.questionType || 'MULTIPLE_CHOICE',
        points: q.points ? Number(q.points) : 1,
        options: JSON.stringify(optionsWithIds),
        correctAnswer: correctOpt ? correctOpt.id : '',
      };
    });

    return await this.databaseService.quiz.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        durationMinutes: Number(dto.durationMinutes) || Number(dto.timeLimitMinutes) || 15,
        classroomId: classroom.id,
        isPublished: dto.isPublished === true,
        questions: {
          create: questionsData,
        },
      },
      include: {
        questions: true,
      },
    });
  }

  /**
   * Publish a draft quiz
   */
  async publishQuiz(quizId: string) {
    const quiz = await this.databaseService.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return await this.databaseService.quiz.update({
      where: { id: quizId },
      data: { isPublished: true },
    });
  }

  /**
   * Get all quizzes for a classroom
   */
  async getQuizzesByClassroom(classroomId: string, user?: any) {
    const classroom = await this.resolveClassroom(classroomId);
    if (!classroom) {
      return [];
    }

    const isTeacher = user?.role === 'TEACHER';
    const where: any = {
      classroomId: classroom.id,
      deletedAt: null,
      ...(isTeacher ? {} : { isPublished: true }),
    };

    const quizzes = await this.databaseService.quiz.findMany({
      where,
      include: {
        questions: true,
        submissions: {
          where: user?.id && !isTeacher ? { studentId: user.id } : {},
          include: {
            student: {
              select: { id: true, fullName: true, name: true, email: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes.map((q: any) => {
      const totalPoints = q.questions.reduce((sum: number, item: any) => sum + (item.points || 1), 0);
      const studentSubmissions = user?.id ? q.submissions.filter((s: any) => s.studentId === user.id) : [];
      const latestSubmission = studentSubmissions.length > 0 ? studentSubmissions[0] : null;

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        durationMinutes: q.durationMinutes,
        isPublished: q.isPublished,
        createdAt: q.createdAt,
        questionCount: q.questions.length,
        totalPoints,
        submissionCount: isTeacher ? q.submissions.length : undefined,
        submitted: user ? !!latestSubmission : undefined,
        score: latestSubmission ? latestSubmission.score : undefined,
        maxScore: latestSubmission ? totalPoints : undefined,
      };
    });
  }

  /**
   * Get student-facing quiz questions (strips isCorrect)
   */
  async getQuizForStudent(quizId: string, user?: any) {
    const quiz = await this.databaseService.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        submissions: {
          where: user?.id ? { studentId: user.id } : {},
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const existingSubmission = quiz.submissions.length > 0 ? quiz.submissions[0] : null;
    const totalPoints = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      totalPoints,
      alreadySubmitted: !!existingSubmission,
      submission: existingSubmission
        ? {
            id: existingSubmission.id,
            score: existingSubmission.score,
            maxScore: totalPoints,
            submittedAt: existingSubmission.submittedAt,
          }
        : null,
      questions: quiz.questions.map((q: any, index: number) => {
        let parsedOptions: any[] = [];
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
        } catch (e) {
          parsedOptions = [];
        }

        return {
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          points: q.points || 1,
          order: index + 1,
          options: parsedOptions.map((opt: any, optIdx: number) => ({
            id: opt.id || String(optIdx),
            text: typeof opt === 'string' ? opt : opt.text,
          })),
        };
      }),
    };
  }

  /**
   * Get teacher-facing quiz details (includes correct answers)
   */
  async getQuizForTeacher(quizId: string) {
    const quiz = await this.databaseService.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const totalPoints = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      isPublished: quiz.isPublished,
      totalPoints,
      questions: quiz.questions.map((q: any, index: number) => {
        let parsedOptions: any[] = [];
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
        } catch (e) {
          parsedOptions = [];
        }

        return {
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          points: q.points || 1,
          order: index + 1,
          options: parsedOptions,
          correctAnswer: q.correctAnswer,
        };
      }),
    };
  }

  /**
   * Submit and grade a quiz
   */
  async submitQuiz(quizId: string, user: any, dto: any) {
    let studentId = user?.id || user?.sub || dto.studentId;

    if (!studentId || !isValidUUID(studentId)) {
      const firstUser = await this.databaseService.user.findFirst();
      studentId = firstUser?.id || studentId;
    }

    const quiz = await this.databaseService.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const questionMap = new Map(quiz.questions.map((q: any) => [q.id, q]));
    const submittedAnswers = Array.isArray(dto.answers) ? dto.answers : [];

    // Exploit prevention: denominator is always the sum of ALL quiz questions
    const totalMaxScore = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    const answeredMap = new Map(submittedAnswers.map((a: any) => [a.questionId, a]));

    let totalScore = 0;
    const answerRecords: any[] = [];

    for (const question of quiz.questions) {
      const submitted: any = answeredMap.get(question.id);
      let parsedOptions: any[] = [];
      try {
        parsedOptions =
          typeof question.options === 'string'
            ? JSON.parse(question.options)
            : question.options || [];
      } catch (e) {
        parsedOptions = [];
      }

      const correctOpt = parsedOptions.find((opt: any) => opt.isCorrect === true);
      const correctOptId = correctOpt ? correctOpt.id : question.correctAnswer;

      if (!submitted || !submitted.selectedOptionId) {
        answerRecords.push({
          questionId: question.id,
          questionText: question.questionText,
          selectedOptionId: null,
          selectedText: 'No answer selected',
          correctOptionId: correctOptId,
          correctText: correctOpt?.text || '',
          isCorrect: false,
          pointsAwarded: 0,
          maxPoints: question.points || 1,
        });
        continue;
      }

      const selectedOpt = parsedOptions.find(
        (opt: any) => opt.id === submitted.selectedOptionId || opt.text === submitted.selectedOptionId,
      );

      const isCorrect =
        selectedOpt && (selectedOpt.isCorrect === true || selectedOpt.id === correctOptId);
      const pointsAwarded = isCorrect ? (question.points || 1) : 0;
      totalScore += pointsAwarded;

      answerRecords.push({
        questionId: question.id,
        questionText: question.questionText,
        selectedOptionId: submitted.selectedOptionId,
        selectedText: selectedOpt?.text || submitted.selectedOptionId,
        correctOptionId: correctOptId,
        correctText: correctOpt?.text || '',
        isCorrect: !!isCorrect,
        pointsAwarded,
        maxPoints: question.points || 1,
      });
    }

    const submission = await this.databaseService.quizSubmission.create({
      data: {
        quizId,
        studentId,
        score: totalScore,
        answers: JSON.stringify(answerRecords),
        attemptNumber: 1,
        isLatest: true,
      },
    });

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return {
      submissionId: submission.id,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
      submittedAt: submission.submittedAt,
      answers: answerRecords,
    };
  }

  /**
   * Get student submission result
   */
  async getSubmissionResult(quizId: string, studentId?: string) {
    const where: any = { quizId };
    if (studentId && isValidUUID(studentId)) {
      where.studentId = studentId;
    }

    const submission = await this.databaseService.quizSubmission.findFirst({
      where,
      include: {
        quiz: { include: { questions: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found for this quiz');
    }

    const totalMaxScore = submission.quiz.questions.reduce(
      (sum: number, q: any) => sum + (q.points || 1),
      0,
    );

    let parsedAnswers: any[] = [];
    try {
      parsedAnswers =
        typeof submission.answers === 'string'
          ? JSON.parse(submission.answers)
          : submission.answers || [];
    } catch (e) {
      parsedAnswers = [];
    }

    return {
      id: submission.id,
      quizTitle: submission.quiz.title,
      score: submission.score || 0,
      maxScore: totalMaxScore,
      percentage: totalMaxScore > 0 ? Math.round(((submission.score || 0) / totalMaxScore) * 100) : 0,
      submittedAt: submission.submittedAt,
      answers: parsedAnswers,
    };
  }

  /**
   * Get class-wide analytics for teacher
   */
  async getQuizAnalytics(quizId: string) {
    const quiz = await this.databaseService.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        submissions: {
          include: {
            student: {
              select: { id: true, fullName: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const totalPoints = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    const totalSubmissions = quiz.submissions.length;
    const scores = quiz.submissions.map((s: any) => s.score || 0);
    const avgScore =
      totalSubmissions > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / totalSubmissions) : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;

    return {
      quizId: quiz.id,
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      totalPoints,
      totalSubmissions,
      averageScore: avgScore,
      highestScore,
      lowestScore,
      submissions: quiz.submissions.map((s: any) => ({
        id: s.id,
        studentName: s.student?.fullName || s.student?.name || s.student?.email || 'Student',
        studentEmail: s.student?.email || '',
        score: s.score || 0,
        maxScore: totalPoints,
        percentage: totalPoints > 0 ? Math.round(((s.score || 0) / totalPoints) * 100) : 0,
        submittedAt: s.submittedAt,
      })),
    };
  }

  /**
   * Delete a quiz
   */
  async deleteQuiz(quizId: string) {
    return await this.databaseService.quiz.delete({
      where: { id: quizId },
    });
  }
}
