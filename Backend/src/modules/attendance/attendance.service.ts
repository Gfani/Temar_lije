import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

function toUuid(id: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16).padStart(2, '0');
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Service managing classroom attendance tracking, Wi-Fi hotspot verification, and reporting.
 */
@Injectable()
export class AttendanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async ensureClassroomExists(classId: string): Promise<string> {
    const validClassId = toUuid(classId);
    const existing = await this.databaseService.classroom.findUnique({
      where: { id: validClassId },
    });
    if (existing) return existing.id;

    const anyClassroom = await this.databaseService.classroom.findFirst();
    if (anyClassroom) return anyClassroom.id;

    let defaultUser = await this.databaseService.user.findFirst();
    if (!defaultUser) {
      defaultUser = await this.databaseService.user.create({
        data: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'teacher@temarlije.local',
          fullName: 'Default Teacher',
          role: 'TEACHER',
        },
      });
    }

    const created = await this.databaseService.classroom.create({
      data: {
        id: validClassId,
        title: 'Classroom',
        inviteCode: 'CLS' + Math.floor(100 + Math.random() * 900),
        createdById: defaultUser.id,
      },
    });
    return created.id;
  }

  private async ensureUserExists(userId: string): Promise<string> {
    const validUserId = toUuid(userId);
    const existing = await this.databaseService.user.findUnique({
      where: { id: validUserId },
    });
    if (existing) return existing.id;

    const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '');
    const created = await this.databaseService.user.create({
      data: {
        id: validUserId,
        email: `${sanitized || 'student'}@placeholder.com`,
        fullName: `Student ${userId}`,
        role: 'STUDENT',
      },
    });
    return created.id;
  }

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
      throw new BadRequestException(
        'Both classId and studentId are required for check-in',
      );
    }

    // 1. Enforce local Wi-Fi check
    if (!this.isLocalIp(clientIp)) {
      throw new UnauthorizedException(
        'You must be connected to the classroom Wi-Fi hotspot',
      );
    }

    const validClassId = await this.ensureClassroomExists(classId);
    const validStudentId = await this.ensureUserExists(studentId);

    // 2. Find or create an active attendance session for this class
    let session = await this.databaseService.attendanceSession.findFirst({
      where: { classroomId: validClassId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      session = await this.databaseService.attendanceSession.create({
        data: {
          classroomId: validClassId,
          isActive: true,
          startedAt: new Date(),
        },
      });
    }

    // Calculate time difference in minutes
    const now = new Date();
    const startTime = session.startedAt || now;
    const diffInMinutes =
      (now.getTime() - new Date(startTime).getTime()) / (1000 * 60);

    // If join time is within 15 minutes of start, mark PRESENT; otherwise LATE
    const status = diffInMinutes <= 15 ? 'PRESENT' : 'LATE';

    // Check if record exists for this session & student
    const existingRecord = await this.databaseService.attendanceRecord.findFirst({
      where: {
        sessionId: session.id,
        studentId: validStudentId,
      },
    });

    if (existingRecord) {
      return existingRecord;
    }

    return await this.databaseService.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: validStudentId,
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

    const validClassId = toUuid(classId);

    const sessions = await this.databaseService.attendanceSession.findMany({
      where: { classroomId: validClassId },
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
      where: { classroomId: validClassId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const checkedInStudentIds = new Set(
      attendanceRecords.map((rec) => rec.studentId),
    );

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
      classId: validClassId,
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