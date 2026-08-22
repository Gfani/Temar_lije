import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  BadRequestException,
} from '@nestjs/common';
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
    const studentId = req.user?.id || req.user?.sub || body?.studentId;
    if (!classId) {
      throw new BadRequestException('classId is required for check-in');
    }

    const authHeader = req.headers?.authorization;
    const xForwardedFor = req.headers?.['x-forwarded-for'];
    const rawIp = xForwardedFor
      ? (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]).trim()
      : req.ip || req.socket?.remoteAddress || '127.0.0.1';

    return await this.attendanceService.recordCheckIn(classId, studentId, rawIp, authHeader);
  }

  /**
   * GET /attendance/:classId/report and GET /attendance/class/:classId/report
   * Retrieves the aggregated attendance summary report for teachers.
   */
  @Get(':classId/report')
  async getAttendanceReport(@Param('classId') classId: string) {
    return await this.attendanceService.getAttendanceReport(classId);
  }

  @Get('class/:classId/report')
  async getAttendanceReportAlias(@Param('classId') classId: string) {
    return await this.attendanceService.getAttendanceReport(classId);
  }

  /**
   * GET /attendance/:classId/live-tracking and GET /attendance/class/:classId/live-tracking
   * Retrieves automated live attendance tracking metrics (PRESENT, LATE, ABSENT, durationMinutes).
   */
  @Get(':classId/live-tracking')
  async getClassroomAttendance(@Param('classId') classId: string) {
    return await this.attendanceService.getClassroomAttendance(classId);
  }

  @Get('class/:classId/live-tracking')
  async getClassroomAttendanceAlias(@Param('classId') classId: string) {
    return await this.attendanceService.getClassroomAttendance(classId);
  }
}
