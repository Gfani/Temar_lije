const { IsEmail, MaxLength } = require('class-validator');
const { Transform } = require('class-transformer');

class ForgotPasswordDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  email;
}

module.exports = { ForgotPasswordDto };
