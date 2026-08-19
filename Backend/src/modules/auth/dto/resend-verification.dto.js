const { IsEmail, MaxLength } = require('class-validator');
const { Transform } = require('class-transformer');

/**
 * Same email normalization as every other DTO in this module —
 * deliberately kept consistent everywhere an email is accepted, so
 * lookups never silently miss due to casing/whitespace drift.
 */
class ResendVerificationDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  email;
}

module.exports = { ResendVerificationDto };
