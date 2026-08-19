import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import * as JwtAuthGuardModule from '../../common/guards/JwtAuthGuard';

/**
 * Controller providing REST API endpoints for attendance reporting.
 */
@Controller('attendance')
@UseGuards(JwtAuthGuardModule.JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * GET /attendance/:classId/report
   * Retrieves the aggregated attendance summary report for teachers.
   *
   * @param {string} classId - The classroom ID.
   * @returns {Promise<Object>} Aggregated attendance report grouped by status.
   */
  @Get(':classId/report')
  async getAttendanceReport(@Param('classId') classId) {
    return await this.attendanceService.getAttendanceReport(classId);
  }
}
