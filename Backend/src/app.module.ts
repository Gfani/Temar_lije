import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './modules/chat/chat.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LiveClassModule } from './modules/live-class/live-class.module';

@Module({
  imports: [DatabaseModule, ChatModule, AttendanceModule, LiveClassModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
