const {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Dependencies,
} = require('@nestjs/common');
const { QuizzesService } = require('./quizzes.service');

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
  @Post('quizzes/create')
  @Post('quizzes')
  async createQuiz(
    @Param('classroomId') classroomId,
    @Req() req,
    @Body() dto,
  ) {
    const targetClassId = classroomId || dto.classId || dto.classroomId;
    const teacherId = req.user ? (req.user.id || req.user.sub) : null;
    return this.quizzesService.createQuiz(targetClassId, teacherId, dto);
  }

  /**
   * Teacher/Student: get all quizzes for a classroom
   */
  @Get('classrooms/:classroomId/quizzes')
  @Get('quizzes/class/:classroomId')
  @Get('quizzes/:classroomId')
  async getQuizzesByClassroom(
    @Param('classroomId') classroomId,
    @Req() req,
  ) {
    const user = req.user || { role: 'STUDENT' };
    return this.quizzesService.getQuizzesByClassroom(classroomId, user);
  }

  /**
   * Teacher: publish a draft quiz
   */
  @Patch('quizzes/:quizId/publish')
  async publishQuiz(@Param('quizId') quizId, @Req() req) {
    const teacherId = req.user ? (req.user.id || req.user.sub) : null;
    return this.quizzesService.publishQuiz(quizId, teacherId);
  }

  /**
   * Student: get quiz questions without answers revealed
   */
  @Get('quizzes/:quizId')
  async getQuiz(@Param('quizId') quizId, @Req() req) {
    const user = req.user || { role: 'STUDENT' };
    const userId = user.id || user.sub;
    if (user.role === 'TEACHER') {
      return this.quizzesService.getQuizAnalytics(quizId, userId);
    }
    return this.quizzesService.getQuizForStudent(quizId, userId);
  }

  /**
   * Student: submit answers and receive instant graded score
   */
  @Post('quizzes/:quizId/submit')
  async submitQuiz(
    @Param('quizId') quizId,
    @Req() req,
    @Body() dto,
  ) {
    const studentId = req.user ? (req.user.id || req.user.sub) : dto.studentId;
    return this.quizzesService.submitQuiz(quizId, studentId, dto);
  }

  /**
   * Student: get individual submission breakdown
   */
  @Get('quizzes/:quizId/result')
  async getSubmissionResult(@Param('quizId') quizId, @Req() req) {
    const studentId = req.user ? (req.user.id || req.user.sub) : null;
    return this.quizzesService.getSubmissionResult(quizId, studentId);
  }

  /**
   * Teacher: get class-wide performance analytics
   */
  @Get('quizzes/:quizId/analytics')
  async getQuizAnalytics(@Param('quizId') quizId, @Req() req) {
    const teacherId = req.user ? (req.user.id || req.user.sub) : null;
    return this.quizzesService.getQuizAnalytics(quizId, teacherId);
  }

  /**
   * Teacher: delete a quiz
   */
  @Delete('quizzes/:quizId')
  @Post('quizzes/:quizId/delete')
  async deleteQuiz(@Param('quizId') quizId) {
    return this.quizzesService.deleteQuiz(quizId);
  }
}

module.exports = { QuizzesController };


module.exports = { QuizzesController };
