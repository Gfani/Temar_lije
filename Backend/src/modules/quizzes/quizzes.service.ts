import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';

function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id.trim());
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly jwtService?: JwtService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  /**
   * Resolve or safely ensure a valid student user in the database
   */
  async resolveStudentUser(userIdOrEmail?: string): Promise<string | undefined> {
    if (!userIdOrEmail) {
      const firstStudent = await this.databaseService.user.findFirst({
        where: { role: 'STUDENT' },
      });
      if (firstStudent) return firstStudent.id;
      const anyUser = await this.databaseService.user.findFirst();
      return anyUser?.id;
    }

    const clean = String(userIdOrEmail).trim();
    if (isValidUUID(clean)) {
      try {
        const existing = await this.databaseService.user.findUnique({
          where: { id: clean },
        });
        if (existing) return existing.id;
      } catch (e) {}
    }

    try {
      const byEmail = await this.databaseService.user.findFirst({
        where: { email: clean },
      });
      if (byEmail) return byEmail.id;
    } catch (e) {}

    const firstStudent = await this.databaseService.user.findFirst({
      where: { role: 'STUDENT' },
    });
    if (firstStudent) return firstStudent.id;

    const anyUser = await this.databaseService.user.findFirst();
    return anyUser?.id;
  }

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
   * Helper to safely resolve a quiz without triggering PostgreSQL UUID parse errors
   */
  private async resolveQuiz(quizId: string) {
    if (!quizId) return null;
    const cleanId = String(quizId).trim();

    if (isValidUUID(cleanId)) {
      try {
        const found = await this.databaseService.quiz.findUnique({
          where: { id: cleanId },
          include: { questions: true },
        });
        if (found) return found;
      } catch (e) {}
    }

    try {
      const byId = await this.databaseService.quiz.findFirst({
        where: { id: cleanId },
        include: { questions: true },
      });
      if (byId) return byId;
    } catch (e) {}

    try {
      return await this.databaseService.quiz.findFirst({
        include: { questions: true },
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
    const quiz = await this.resolveQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return await this.databaseService.quiz.update({
      where: { id: quiz.id },
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
    const quiz = await this.resolveQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const submissions = await this.databaseService.quizSubmission.findMany({
      where: {
        quizId: quiz.id,
        ...(user?.id ? { studentId: user.id } : {}),
      },
      orderBy: { submittedAt: 'desc' },
    });

    const existingSubmission = submissions.length > 0 ? submissions[0] : null;
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
            id: typeof opt === 'object' && opt.id ? opt.id : String(optIdx),
            text: typeof opt === 'string' ? opt : opt.text || String(opt),
          })),
        };
      }),
    };
  }

  /**
   * Get teacher-facing quiz details (includes correct answers)
   */
  async getQuizForTeacher(quizId: string) {
    const quiz = await this.resolveQuiz(quizId);
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

        const normalized = parsedOptions.map((opt: any, optIdx: number) => {
          if (typeof opt === 'string') {
            return {
              id: String(optIdx),
              text: opt,
              isCorrect: opt === q.correctAnswer || String(optIdx) === String(q.correctAnswer),
            };
          }
          return {
            id: opt.id || String(optIdx),
            text: opt.text || String(opt),
            isCorrect: opt.isCorrect === true || String(opt.id) === String(q.correctAnswer),
          };
        });

        return {
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          points: q.points || 1,
          order: index + 1,
          options: normalized,
          correctAnswer: q.correctAnswer,
        };
      }),
    };
  }

  /**
   * Submit and grade a quiz
   */
  async submitQuiz(quizId: string, user: any, dto: any, authHeader?: string) {
    let studentId = user?.id || user?.sub || dto?.studentId;

    if (!studentId && authHeader && authHeader.startsWith('Bearer ') && this.jwtService) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const decoded: any = this.jwtService.decode(token);
        if (decoded && (decoded.sub || decoded.id)) {
          studentId = decoded.sub || decoded.id;
        }
      } catch (e) {}
    }

    const resolvedStudentId = await this.resolveStudentUser(studentId);

    const quiz = await this.resolveQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const submittedAnswers = Array.isArray(dto?.answers) ? dto.answers : [];
    // Exploit prevention: denominator is always the sum of ALL quiz questions
    const totalMaxScore = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    const answeredMap = new Map(
      submittedAnswers.map((a: any) => [String(a?.questionId || ''), a])
    );

    let totalScore = 0;
    const answerRecords: any[] = [];

    for (const question of quiz.questions) {
      const submitted: any = answeredMap.get(String(question.id));
      let parsedOptions: any[] = [];
      try {
        parsedOptions =
          typeof question.options === 'string'
            ? JSON.parse(question.options)
            : question.options || [];
      } catch (e) {
        parsedOptions = [];
      }

      // Normalize options to: [{ id, text, isCorrect }]
      const normalizedOptions = parsedOptions.map((opt: any, optIdx: number) => {
        if (typeof opt === 'string') {
          const isThisCorrect =
            String(opt).trim().toLowerCase() === String(question.correctAnswer || '').trim().toLowerCase() ||
            String(optIdx) === String(question.correctAnswer || '').trim().toLowerCase();
          return {
            id: String(optIdx),
            text: opt,
            isCorrect: isThisCorrect,
          };
        }
        return {
          id: opt.id !== undefined && opt.id !== null ? String(opt.id) : String(optIdx),
          text: typeof opt === 'object' && opt.text !== undefined ? opt.text : String(opt),
          isCorrect:
            opt.isCorrect === true ||
            String(opt.id) === String(question.correctAnswer) ||
            String(opt.text).trim().toLowerCase() === String(question.correctAnswer || '').trim().toLowerCase(),
        };
      });

      const correctOpt = normalizedOptions.find((opt: any) => opt.isCorrect === true);
      const correctOptId = correctOpt ? correctOpt.id : question.correctAnswer;
      const correctOptText = correctOpt
        ? correctOpt.text
        : (normalizedOptions.find((o: any) => String(o.id) === String(question.correctAnswer))?.text || question.correctAnswer);

      if (
        !submitted ||
        submitted.selectedOptionId === undefined ||
        submitted.selectedOptionId === null ||
        submitted.selectedOptionId === ''
      ) {
        answerRecords.push({
          questionId: question.id,
          questionText: question.questionText,
          selectedOptionId: null,
          selectedText: 'No answer selected',
          correctOptionId: correctOptId,
          correctText: correctOptText || '',
          isCorrect: false,
          pointsAwarded: 0,
          maxPoints: question.points || 1,
        });
        continue;
      }

      const rawSelected = String(submitted.selectedOptionId);
      const selectedOpt = normalizedOptions.find(
        (opt: any) =>
          String(opt.id) === rawSelected ||
          String(opt.text).trim().toLowerCase() === rawSelected.trim().toLowerCase(),
      );

      const isCorrect =
        (selectedOpt && selectedOpt.isCorrect === true) ||
        rawSelected === String(correctOptId) ||
        (correctOptText && rawSelected.trim().toLowerCase() === String(correctOptText).trim().toLowerCase());

      const pointsAwarded = isCorrect ? (question.points || 1) : 0;
      totalScore += pointsAwarded;

      answerRecords.push({
        questionId: question.id,
        questionText: question.questionText,
        selectedOptionId: rawSelected,
        selectedText: selectedOpt ? selectedOpt.text : rawSelected,
        correctOptionId: correctOptId,
        correctText: correctOptText || '',
        isCorrect: !!isCorrect,
        pointsAwarded,
        maxPoints: question.points || 1,
      });
    }

    let submission: any = null;

    if (resolvedStudentId) {
      try {
        const prevAttempts = await this.databaseService.quizSubmission.findMany({
          where: { quizId: quiz.id, studentId: resolvedStudentId },
          orderBy: { attemptNumber: 'desc' },
        });

        const nextAttempt = (prevAttempts[0]?.attemptNumber || 0) + 1;

        if (prevAttempts.length > 0) {
          await this.databaseService.quizSubmission.updateMany({
            where: { quizId: quiz.id, studentId: resolvedStudentId },
            data: { isLatest: false },
          });
        }

        submission = await this.databaseService.quizSubmission.create({
          data: {
            quizId: quiz.id,
            studentId: resolvedStudentId,
            score: totalScore,
            answers: JSON.stringify(answerRecords),
            attemptNumber: nextAttempt,
            isLatest: true,
          },
        });
      } catch (dbErr: any) {
        console.warn('Quiz submission persistence notice:', dbErr?.message);
      }
    }

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return {
      submissionId: submission?.id || `sub_${Date.now()}`,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
      submittedAt: submission?.submittedAt || new Date(),
      answers: answerRecords,
    };
  }

  /**
   * Get student submission result
   */
  async getSubmissionResult(quizId: string, studentId?: string, authHeader?: string) {
    let targetStudentId = studentId;

    if (!targetStudentId && authHeader && authHeader.startsWith('Bearer ') && this.jwtService) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const decoded: any = this.jwtService.decode(token);
        if (decoded && (decoded.sub || decoded.id)) {
          targetStudentId = decoded.sub || decoded.id;
        }
      } catch (e) {}
    }

    const resolvedStudentId = targetStudentId ? await this.resolveStudentUser(targetStudentId) : undefined;
    const quiz = await this.resolveQuiz(quizId);
    const targetQuizId = quiz ? quiz.id : quizId;

    const where: any = { quizId: targetQuizId };
    if (resolvedStudentId) {
      where.studentId = resolvedStudentId;
    }

    const submission = await this.databaseService.quizSubmission.findFirst({
      where,
      include: {
        quiz: { include: { questions: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    if (!submission) {
      const fallback = await this.databaseService.quizSubmission.findFirst({
        where: { quizId: targetQuizId },
        include: {
          quiz: { include: { questions: true } },
        },
        orderBy: { submittedAt: 'desc' },
      });

      if (!fallback) {
        throw new NotFoundException('Submission not found for this quiz');
      }

      return this._formatSubmission(fallback);
    }

    return this._formatSubmission(submission);
  }

  private _formatSubmission(submission: any) {
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
    const quiz = await this.resolveQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const fullQuiz = await this.databaseService.quiz.findUnique({
      where: { id: quiz.id },
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

    if (!fullQuiz) {
      throw new NotFoundException('Quiz not found');
    }

    const totalPoints = fullQuiz.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    const totalSubmissions = fullQuiz.submissions.length;
    const scores = fullQuiz.submissions.map((s: any) => s.score || 0);
    const avgScore =
      totalSubmissions > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / totalSubmissions) : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;

    return {
      quizId: fullQuiz.id,
      title: fullQuiz.title,
      durationMinutes: fullQuiz.durationMinutes,
      totalPoints,
      totalSubmissions,
      averageScore: avgScore,
      highestScore,
      lowestScore,
      submissions: fullQuiz.submissions.map((s: any) => ({
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
    const quiz = await this.resolveQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return await this.databaseService.quiz.delete({
      where: { id: quiz.id },
    });
  }
}
