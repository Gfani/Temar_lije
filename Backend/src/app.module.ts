import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LiveClassModule } from './modules/live-class/live-class.module';

@Module({
  imports: [DatabaseModule, AttendanceModule, LiveClassModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}