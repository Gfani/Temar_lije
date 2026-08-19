const {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  MaxLength,
} = require('class-validator');
const { Type } = require('class-transformer');
const { CreateQuestionOptionDto } = require('./create-question-option.dto');

const QuestionType = Object.freeze({
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
});

class CreateQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Question text is required' })
  @MaxLength(500)
  text;

  @IsEnum(QuestionType, {
    message: 'Type must be MULTIPLE_CHOICE or TRUE_FALSE',
  })
  type;

  /**
   * Defaults are intentionally NOT set here (no @IsOptional +
   * default value) — a teacher should consciously assign weight per
   * question rather than silently getting "1" without realizing it.
   * The service layer applies a default of 1 only if this is
   * genuinely omitted; see quizzes.service.js.
   */
  @IsInt()
  @Min(1, { message: 'Points must be at least 1' })
  @Max(100, { message: 'Points must be 100 or fewer' })
  points;

  /**
   * ArrayMaxSize(8) is a deliberate, opinionated ceiling — not a
   * technical limit, a UX/quality one. Nothing about the schema
   * breaks at 20 options; a question with that many is almost
   * certainly a mistake or a bad question design, and catching it
   * here (400 Bad Request, clear message) is kinder than silently
   * accepting it and producing a barely-usable quiz UI.
   */
  @IsArray()
  @ArrayMinSize(2, { message: 'A question needs at least 2 options' })
  @ArrayMaxSize(8, { message: 'A question can have at most 8 options' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options;
}

module.exports = { CreateQuestionDto, QuestionType };
