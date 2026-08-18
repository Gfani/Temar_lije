import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Service managing classroom attendance tracking, Wi-Fi hotspot verification, and reporting.
 */
@Injectable()
export class AttendanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Helper method to validate if an IP address belongs to the local classroom Wi-Fi network.
   */
  isLocalIp(rawIp: string): boolean {
    if (!rawIp || typeof rawIp !== 'string') return false;
    const cleanIp = rawIp.replace(/^::ffff:/, '').trim();

    return (
      cleanIp.startsWith('192.168.1.') ||
      cleanIp === '127.0.0.1' ||
      cleanIp === '::1' ||
      cleanIp === 'localhost'
    );
  }

  /**
   * Records student check-in for an active attendance session.
   */
  async recordCheckIn(classId: string, studentId: string, clientIp: string) {
    if (!classId || !studentId) {
      throw new BadRequestException('Both classId and studentId are required for check-in');
    }

    // 1. Enforce local Wi-Fi check
    if (!this.isLocalIp(clientIp)) {
      throw new UnauthorizedException('You must be connected to the classroom Wi-Fi hotspot');
    }

    // 2. Find or create an active attendance session for this class
    let session = await this.databaseService.attendanceSession.findFirst({
      where: { classroomId: classId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      session = await this.databaseService.attendanceSession.create({
        data: {
          classroomId: classId,
          isActive: true,
          startedAt: new Date(),
        },
      });
    }

    const now = new Date();
    const startTime = session.startedAt || now;
    const diffInMinutes = (now.getTime() - new Date(startTime).getTime()) / (1000 * 60);
    const status = diffInMinutes <= 15 ? 'PRESENT' : 'LATE';

    // Check if record exists for this session & student
    const existingRecord = await this.databaseService.attendanceRecord.findFirst({
      where: {
        sessionId: session.id,
        studentId: studentId,
      },
    });

    if (existingRecord) {
      return existingRecord;
    }

    return await this.databaseService.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: studentId,
        status,
        checkedInAt: now,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  /**
   * Generates an aggregated attendance report for a classroom.
   */
  async getAttendanceReport(classId: string) {
    if (!classId) {
      throw new BadRequestException('classId is required');
    }

    const sessions = await this.databaseService.attendanceSession.findMany({
      where: { classroomId: classId },
      select: { id: true },
    });

    const sessionIds = sessions.map((s) => s.id);

    const attendanceRecords = await this.databaseService.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const enrollments = await this.databaseService.classroomMember.findMany({
      where: { classroomId: classId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const checkedInStudentIds = new Set(attendanceRecords.map((rec) => rec.studentId));

    const present = attendanceRecords.filter((rec) => rec.status === 'PRESENT');
    const late = attendanceRecords.filter((rec) => rec.status === 'LATE');

    const absent = enrollments
      .filter((enrollment) => !checkedInStudentIds.has(enrollment.userId))
      .map((enrollment) => ({
        studentId: enrollment.userId,
        status: 'ABSENT',
        student: enrollment.user,
        checkedInAt: null,
      }));

    return {
      classId,
      timestamp: new Date().toISOString(),
      summary: {
        totalEnrolled: enrollments.length || attendanceRecords.length,
        PRESENT: present.length,
        LATE: late.length,
        ABSENT: absent.length,
      },
      records: {
        PRESENT: present,
        LATE: late,
        ABSENT: absent,
      },
    };
  }
}

