const {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Dependencies,
} = require('@nestjs/common');
const { QuizzesService } = require('./quizzes.service');
const { CreateQuizDto } = require('./dto/create-quiz.dto');
const { SubmitQuizDto } = require('./dto/submit-quiz.dto');
const { JwtAuthGuard } = require('../../common/guards/JwtAuthGuard');
const { RolesGuard } = require('../../common/guards/RolesGuard');
const { Roles } = require('../../common/decorators/roles.decorator');

@Controller()
@Dependencies(QuizzesService)
class QuizzesController {
  constructor(quizzesService) {
    this.quizzesService = quizzesService;
  }

  /**
   * Teacher: create a quiz for a specific classroom
   */
  @Post('classrooms/:classroomId/quizzes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  async createQuiz(
    @Param('classroomId') classroomId,
    @Req() req,
    @Body() dto,
  ) {
    const teacherId = req.user.id || req.user.sub;
    return this.quizzesService.createQuiz(classroomId, teacherId, dto);
  }

  /**
   * Teacher/Student: get all quizzes for a classroom
   */
  @Get('classrooms/:classroomId/quizzes')
  @UseGuards(JwtAuthGuard)
  async getQuizzesByClassroom(
    @Param('classroomId') classroomId,
    @Req() req,
  ) {
    return this.quizzesService.getQuizzesByClassroom(classroomId, req.user);
  }

  /**
   * Teacher: publish a draft quiz
   */
  @Patch('quizzes/:quizId/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  async publishQuiz(@Param('quizId') quizId, @Req() req) {
    const teacherId = req.user.id || req.user.sub;
    return this.quizzesService.publishQuiz(quizId, teacherId);
  }

  /**
   * Student: get quiz questions without answers revealed
   */
  @Get('quizzes/:quizId')
  @UseGuards(JwtAuthGuard)
  async getQuiz(@Param('quizId') quizId, @Req() req) {
    const userId = req.user.id || req.user.sub;
    if (req.user.role === 'TEACHER') {
      return this.quizzesService.getQuizAnalytics(quizId, userId);
    }
    return this.quizzesService.getQuizForStudent(quizId, userId);
  }

  /**
   * Student: submit answers and receive instant graded score
   */
  @Post('quizzes/:quizId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  async submitQuiz(
    @Param('quizId') quizId,
    @Req() req,
    @Body() dto,
  ) {
    const studentId = req.user.id || req.user.sub;
    return this.quizzesService.submitQuiz(quizId, studentId, dto);
  }

  /**
   * Student: get individual submission breakdown
   */
  @Get('quizzes/:quizId/result')
  @UseGuards(JwtAuthGuard)
  async getSubmissionResult(@Param('quizId') quizId, @Req() req) {
    const studentId = req.user.id || req.user.sub;
    return this.quizzesService.getSubmissionResult(quizId, studentId);
  }

  /**
   * Teacher: get class-wide performance analytics
   */
  @Get('quizzes/:quizId/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER')
  async getQuizAnalytics(@Param('quizId') quizId, @Req() req) {
    const teacherId = req.user.id || req.user.sub;
    return this.quizzesService.getQuizAnalytics(quizId, teacherId);
  }
}

module.exports = { QuizzesController };
