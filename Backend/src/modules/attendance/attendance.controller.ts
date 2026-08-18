import { Controller, Get, Post, Body, Param, Req, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

/**
 * Controller providing REST API endpoints for attendance reporting and check-in.
 */
@Controller('attendance')
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
}
