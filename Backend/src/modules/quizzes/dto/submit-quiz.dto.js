const {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} = require('class-validator');
const { Type } = require('class-transformer');

class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty({ message: 'questionId is required' })
  questionId;

  @IsString()
  @IsNotEmpty({ message: 'selectedOptionId is required' })
  selectedOptionId;
}

class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one answer must be submitted' })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers;
}

module.exports = { SubmitQuizDto, SubmitAnswerDto };
