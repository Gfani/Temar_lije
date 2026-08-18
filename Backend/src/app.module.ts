import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LiveClassModule } from './modules/live-class/live-class.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    AttendanceModule,
    LiveClassModule,
    MaterialsModule,
    AssignmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}