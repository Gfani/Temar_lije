const { Module } = require('@nestjs/common');
const { QuizzesController } = require('./quizzes.controller');
const { QuizzesService } = require('./quizzes.service');
const { PrismaService } = require('../../database/prisma.service');

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService, PrismaService],
  exports: [QuizzesService],
})
class QuizzesModule {}

module.exports = { QuizzesModule };
