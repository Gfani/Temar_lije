import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceGateway } from './attendance.gateway';

/**
 * AttendanceModule bundling attendance controllers, providers, and gateway services.
 */
@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway],
  exports: [AttendanceService, AttendanceGateway],
})
export class AttendanceModule {}
