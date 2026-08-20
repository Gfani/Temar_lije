import { Controller, Get, Post, Body, Param, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import * as JwtAuthGuardModule from '../../common/guards/JwtAuthGuard';

/**
 * Controller providing REST API endpoints for attendance reporting and check-in.
 */
@Controller('attendance')
@UseGuards(JwtAuthGuardModule.JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * POST /attendance/check-in
   * Student check-in endpoint.
   */
  @Post('check-in')
  async recordCheckIn(@Body() body: any, @Req() req: any) {
    const classId = body?.classId;
    const studentId = body?.studentId;
    if (!classId || !studentId) {
      throw new BadRequestException('classId and studentId are required for check-in');
    }

    const xForwardedFor = req.headers?.['x-forwarded-for'];
    const rawIp = xForwardedFor
      ? (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]).trim()
      : req.ip || req.socket?.remoteAddress || '127.0.0.1';

    return await this.attendanceService.recordCheckIn(classId, studentId, rawIp);
  }

  /**
   * GET /attendance/:classId/report
   * Retrieves the aggregated attendance summary report for teachers.
   *
   * @param {string} classId - The classroom ID.
   * @returns {Promise<Object>} Aggregated attendance report grouped by status.
   */
  @Get(':classId/report')
  async getAttendanceReport(@Param('classId') classId: string) {
    return await this.attendanceService.getAttendanceReport(classId);
  }

  /**
   * GET /attendance/:classId/live-tracking
   * Retrieves automated live attendance tracking metrics (PRESENT, LATE, ABSENT, durationMinutes).
   */
  @Get(':classId/live-tracking')
  async getClassroomAttendance(@Param('classId') classId: string) {
    return await this.attendanceService.getClassroomAttendance(classId);
  }
}

