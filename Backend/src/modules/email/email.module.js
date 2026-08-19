const { Module } = require('@nestjs/common');
const { EmailService } = require('./email.service');

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
class EmailModule {}

module.exports = { EmailModule };
