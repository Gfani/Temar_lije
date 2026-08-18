const { IsEmail, IsString, IsNotEmpty, MaxLength } = require('class-validator');
const { Transform } = require('class-transformer');

/**
 * Request body for POST /auth/login.
 */
class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  email;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(72)
  password;
}

module.exports = { LoginDto };
