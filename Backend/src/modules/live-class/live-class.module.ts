import { Module } from '@nestjs/common';
import { LiveClassController } from './live-class.controller';
import { LiveClassService } from './live-class.service';
import { LiveClassGateway } from './live-class.gateway';
import { AttendanceModule } from '../attendance/attendance.module';

/**
 * LiveClassModule encapsulating live class control, streaming gateway, and attendance integration.
 */
@Module({
  imports: [AttendanceModule],
  controllers: [LiveClassController],
  providers: [LiveClassService, LiveClassGateway],
  exports: [LiveClassService, LiveClassGateway],
})
export class LiveClassModule {}
