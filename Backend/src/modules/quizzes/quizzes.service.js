const {
  Injectable,
  Dependencies,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} = require('@nestjs/common');
const { PrismaService } = require('../../database/prisma.service');

@Injectable()
@Dependencies(PrismaService)
class QuizzesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Validate cross-field invariants on questions before touching the database
   */
  _validateQuestions(questions) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const correctCount = q.options.filter((opt) => opt.isCorrect === true).length;

      if (correctCount !== 1) {
        throw new BadRequestException(
          `Question ${i + 1} ("${q.text.slice(0, 30)}...") must have exactly one correct option. Found ${correctCount}.`,
        );
      }

      if (q.type === 'TRUE_FALSE') {
        if (q.options.length !== 2) {
          throw new BadRequestException(
            `True/False Question ${i + 1} must have exactly 2 options (True and False).`,
          );
        }
      }
    }
  }

  /**
   * Create a new quiz for a classroom
   */
  async createQuiz(classroomId, teacherId, dto) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Only the teacher of this classroom can create quizzes');
    }

    this._validateQuestions(dto.questions);

    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        classroomId,
        createdById: teacherId,
        isPublished: false,
        questions: {
          create: dto.questions.map((q, index) => ({
            text: q.text,
            type: q.type,
            points: q.points || 1,
            order: index + 1,
            options: {
              create: q.options.map((opt) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });
  }

  /**
   * Publish a draft quiz so students can view and take it
   */
  async publishQuiz(quizId, teacherId) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { classroom: true },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.createdById !== teacherId && quiz.classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Only the quiz author can publish this quiz');
    }

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { isPublished: true },
    });
  }

  /**
   * Get all quizzes for a classroom based on the requesting user's role
   */
  async getQuizzesByClassroom(classroomId, user) {
    const isTeacher = user.role === 'TEACHER';

    const where = {
      classroomId,
      ...(isTeacher ? {} : { isPublished: true }),
    };

    const quizzes = await this.prisma.quiz.findMany({
      where,
      include: {
        questions: {
          select: {
            id: true,
            points: true,
          },
        },
        submissions: {
          where: isTeacher ? {} : { studentId: user.id },
          select: {
            id: true,
            studentId: true,
            score: true,
            maxScore: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes.map((q) => {
      const totalPoints = q.questions.reduce((sum, item) => sum + item.points, 0);
      const studentSubmission = !isTeacher && q.submissions.length > 0 ? q.submissions[0] : null;

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        isPublished: q.isPublished,
        dueDate: q.dueDate,
        createdAt: q.createdAt,
        questionCount: q.questions.length,
        totalPoints,
        submissionCount: isTeacher ? q.submissions.length : undefined,
        submitted: !isTeacher ? !!studentSubmission : undefined,
        score: studentSubmission ? studentSubmission.score : undefined,
        maxScore: studentSubmission ? studentSubmission.maxScore : undefined,
      };
    });
  }

  /**
   * Get student-facing quiz questions (strips correct answers before sending)
   */
  async getQuizForStudent(quizId, studentId) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              select: {
                id: true,
                text: true,
                // Deliberately omits isCorrect to prevent client-side answer inspection
              },
            },
          },
        },
        submissions: {
          where: { studentId },
        },
      },
    });

    if (!quiz || !quiz.isPublished) {
      throw new NotFoundException('Quiz not found or not currently published');
    }

    const existingSubmission = quiz.submissions.length > 0 ? quiz.submissions[0] : null;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      dueDate: quiz.dueDate,
      totalPoints,
      alreadySubmitted: !!existingSubmission,
      submission: existingSubmission
        ? {
            id: existingSubmission.id,
            score: existingSubmission.score,
            maxScore: existingSubmission.maxScore,
            submittedAt: existingSubmission.submittedAt,
          }
        : null,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        order: q.order,
        options: q.options,
      })),
    };
  }

  /**
   * Submit and grade a quiz
   */
  async submitQuiz(quizId, studentId, dto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz || !quiz.isPublished) {
      throw new NotFoundException('Quiz not found or is not currently active');
    }

    // Enforce 1 submission attempt per student per quiz
    const existing = await this.prisma.quizSubmission.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted this quiz');
    }

    // Build question map for fast grading lookup
    const questionMap = new Map();
    for (const q of quiz.questions) {
      questionMap.set(q.id, q);
    }

    let totalScore = 0;
    let totalMaxScore = 0;
    const answerRecords = [];

    for (const submittedAns of dto.answers) {
      const question = questionMap.get(submittedAns.questionId);
      if (!question) continue;

      totalMaxScore += question.points;
      const selectedOpt = question.options.find(
        (opt) => opt.id === submittedAns.selectedOptionId,
      );

      const isCorrect = selectedOpt ? selectedOpt.isCorrect === true : false;
      const pointsAwarded = isCorrect ? question.points : 0;
      totalScore += pointsAwarded;

      answerRecords.push({
        questionId: question.id,
        selectedOptionId: submittedAns.selectedOptionId,
        isCorrect,
        pointsAwarded,
      });
    }

    // Create submission in transaction
    const submission = await this.prisma.quizSubmission.create({
      data: {
        quizId,
        studentId,
        score: totalScore,
        maxScore: totalMaxScore,
        answers: {
          create: answerRecords,
        },
      },
      include: {
        answers: true,
      },
    });

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return {
      submissionId: submission.id,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Get student's detailed submission results
   */
  async getSubmissionResult(quizId, studentId) {
    const submission = await this.prisma.quizSubmission.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId,
        },
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
        answers: {
          include: {
            selectedOption: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found for this quiz');
    }

    return {
      id: submission.id,
      quizTitle: submission.quiz.title,
      score: submission.score,
      maxScore: submission.maxScore,
      percentage:
        submission.maxScore > 0
          ? Math.round((submission.score / submission.maxScore) * 100)
          : 0,
      submittedAt: submission.submittedAt,
      answers: submission.answers.map((ans) => {
        const question = submission.quiz.questions.find((q) => q.id === ans.questionId);
        const correctOpt = question?.options.find((opt) => opt.isCorrect);

        return {
          questionId: ans.questionId,
          questionText: question?.text || '',
          selectedOptionId: ans.selectedOptionId,
          selectedText: ans.selectedOption?.text || 'No answer selected',
          correctOptionId: correctOpt?.id,
          correctText: correctOpt?.text,
          isCorrect: ans.isCorrect,
          pointsAwarded: ans.pointsAwarded,
          maxPoints: question?.points || 1,
        };
      }),
    };
  }

  /**
   * Get class-wide analytics for teacher
   */
  async getQuizAnalytics(quizId, teacherId) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classroom: true,
        questions: {
          include: {
            options: true,
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.createdById !== teacherId && quiz.classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Only the teacher can view analytics for this quiz');
    }

    const totalSubmissions = quiz.submissions.length;
    const scores = quiz.submissions.map((s) => s.score);
    const avgScore =
      totalSubmissions > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / totalSubmissions)
        : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;

    return {
      quizId: quiz.id,
      title: quiz.title,
      totalSubmissions,
      averageScore: avgScore,
      highestScore,
      lowestScore,
      submissions: quiz.submissions.map((s) => ({
        id: s.id,
        studentName: s.student.fullName || s.student.email,
        studentEmail: s.student.email,
        score: s.score,
        maxScore: s.maxScore,
        percentage: s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0,
        submittedAt: s.submittedAt,
      })),
    };
  }
}

module.exports = { QuizzesService };
