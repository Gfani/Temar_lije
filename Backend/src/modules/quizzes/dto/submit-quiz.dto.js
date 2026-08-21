const {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} = require('class-validator');
const { Type } = require('class-transformer');

class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty({ message: 'questionId is required' })
  questionId;

  @IsOptional()
  selectedOptionId;
}

class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers;

  @IsOptional()
  @IsString()
  studentId;
}

module.exports = { SubmitQuizDto, SubmitAnswerDto };

