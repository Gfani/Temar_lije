const {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} = require('class-validator');
const { Transform } = require('class-transformer');

/**
 * Roles a user is allowed to self-select at registration.
 * Frozen to prevent accidental mutation elsewhere in the codebase.
 */
const RegisterRole = Object.freeze({
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
});

/**
 * Request body for POST /auth/register.
 */
class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(120)
  fullName;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254) // RFC 5321 max mailbox length
  email;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be 72 characters or fewer' })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain a lowercase letter',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain an uppercase letter',
  })
  @Matches(/(?=.*\d)/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Password must contain a symbol' })
  password;

  @IsEnum(RegisterRole, { message: 'Role must be either STUDENT or TEACHER' })
  role;
}

module.exports = { RegisterDto, RegisterRole };
