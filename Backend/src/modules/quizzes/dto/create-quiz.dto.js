const {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsISO8601,
} = require('class-validator');
const { Type } = require('class-transformer');
const { CreateQuestionDto } = require('./create-question.dto');

/**
 * Request body for POST /classrooms/:classroomId/quizzes.
 * classroomId is taken from the URL path, and createdById comes from
 * the authenticated teacher (req.user.id).
 */
class CreateQuizDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(150)
  title;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description;

  @IsOptional()
  @IsISO8601({}, { message: 'dueDate must be a valid ISO 8601 date' })
  dueDate;

  /**
   * ArrayMaxSize(50) is the same style of deliberate, generous-but-
   * bounded ceiling as CreateQuestionDto.options — protects against a
   * pathological payload (thousands of nested questions) reaching the
   * grading logic downstream, without meaningfully constraining any
   * real quiz.
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'A quiz needs at least 1 question' })
  @ArrayMaxSize(50, { message: 'A quiz can have at most 50 questions' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions;
}

module.exports = { CreateQuizDto };
