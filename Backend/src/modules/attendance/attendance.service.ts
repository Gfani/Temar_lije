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
   * Allowed IPs:
   * - Starts with '192.168.1.'
   * - Is loopback: '127.0.0.1', '::1', '::ffff:127.0.0.1'
   *
   * @param {string} rawIp - The client IP address extracted from socket/request.
   * @returns {boolean} True if local classroom IP, false otherwise.
   */
  isLocalIp(rawIp) {
    if (!rawIp || typeof rawIp !== 'string') return false;

    // Clean IP string by trimming and removing IPv6 wrapper prefix if present
    const cleanIp = rawIp.replace(/^::ffff:/, '').trim();

    return (
      cleanIp.startsWith('192.168.1.') ||
      cleanIp === '127.0.0.1' ||
      cleanIp === '::1' ||
      cleanIp === 'localhost'
    );
  }

  /**
   * Records student check-in for a live class session.
   * Enforces classroom Wi-Fi restriction and evaluates punctuality (PRESENT vs LATE).
   *
   * @param {string} classId - The unique ID of the classroom.
   * @param {string} studentId - The unique ID of the student.
   * @param {string} clientIp - The IP address of the client connection.
   * @returns {Promise<Object>} The updated/created attendance record.
   */
  async recordCheckIn(classId, studentId, clientIp) {
    if (!classId || !studentId) {
      throw new BadRequestException('Both classId and studentId are required for check-in');
    }

    // 1. Enforce local Wi-Fi check
    if (!this.isLocalIp(clientIp)) {
      throw new UnauthorizedException('You must be connected to the classroom Wi-Fi hotspot');
    }

    // 2. Check current timestamp against class start time
    const now = new Date();

    // Fetch active live session or classroom schedule
    const liveSession = await this.databaseService.liveClass.findFirst({
      where: { classId, status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    const classroom = await this.databaseService.classroom.findUnique({
      where: { id: classId },
    });

    // Determine reference start time (default to active live session start time, class startTime, or current time)
    const startTime = liveSession?.startTime || classroom?.startTime || now;

    // Calculate time difference in minutes
    const diffInMinutes = (now.getTime() - new Date(startTime).getTime()) / (1000 * 60);

    // If join time is within 15 minutes of start, mark PRESENT; otherwise LATE
    const status = diffInMinutes <= 15 ? 'PRESENT' : 'LATE';

    const cleanIp = (clientIp || '').replace(/^::ffff:/, '').trim();

    // 3. Upsert attendance record in Prisma
    const record = await this.databaseService.attendance.upsert({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
      update: {
        status,
        ipAddress: cleanIp,
        checkInTime: now,
      },
      create: {
        classId,
        studentId,
        status,
        ipAddress: cleanIp,
        checkInTime: now,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return record;
  }

  /**
   * Generates an aggregated attendance report for a classroom.
   * Groups students into PRESENT, LATE, and ABSENT lists with counts.
   *
   * @param {string} classId - The unique ID of the classroom.
   * @returns {Promise<Object>} Aggregated attendance report.
   */
  async getAttendanceReport(classId) {
    if (!classId) {
      throw new BadRequestException('classId is required');
    }

    // Retrieve recorded check-ins for the class
    const attendanceRecords = await this.databaseService.attendance.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Retrieve all enrolled students in the class
    const enrollments = await this.databaseService.classroomStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const checkedInStudentIds = new Set(attendanceRecords.map((rec) => rec.studentId));

    // Filter into status groups
    const present = attendanceRecords.filter((rec) => rec.status === 'PRESENT');
    const late = attendanceRecords.filter((rec) => rec.status === 'LATE');

    // Identify enrolled students who have no check-in record as ABSENT
    const absent = enrollments
      .filter((enrollment) => !checkedInStudentIds.has(enrollment.studentId))
      .map((enrollment) => ({
        studentId: enrollment.studentId,
        status: 'ABSENT',
        student: enrollment.student,
        checkInTime: null,
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
