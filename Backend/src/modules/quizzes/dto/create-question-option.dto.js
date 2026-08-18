const { IsString, IsNotEmpty, IsBoolean, MaxLength } = require('class-validator');

/**
 * One selectable option within a question. Whether this represents a
 * real multiple-choice distractor or one half of a True/False pair is
 * determined entirely by the parent Question's `type` — this DTO's
 * shape is identical either way, which is the whole point of
 * unifying the two question types at the schema level.
 */
class CreateQuestionOptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Option text is required' })
  @MaxLength(300)
  text;

  /**
   * Whether THIS specific option is the correct answer. Deliberately
   * not defaulted anywhere in the DTO chain — a teacher must
   * explicitly mark exactly one option per question as correct.
   * Cross-field invariants this single field can't express on its
   * own — "exactly one option must be correct," "True/False must
   * have exactly two options" — are checked in the service layer,
   * not here (see the note in quizzes.service.js). class-validator
   * decorators validate one field in isolation; they're the wrong
   * tool for rules that span multiple fields/objects.
   */
  @IsBoolean()
  isCorrect;
}

module.exports = { CreateQuestionOptionDto };
