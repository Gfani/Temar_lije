const { IsString, IsNotEmpty } = require('class-validator');

class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'token is required' })
  token;
}

module.exports = { VerifyEmailDto };
