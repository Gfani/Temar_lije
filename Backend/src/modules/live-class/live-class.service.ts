import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AttendanceService } from '../attendance/attendance.service';

/**
 * Service managing live class sessions, token generation, and end-of-session reporting.
 */
@Injectable()
export class LiveClassService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Generates a room access token for video session participants (students and teachers).
   */
  generateSessionToken(classId: string, userId: string, role = 'STUDENT') {
    if (!classId || !userId) {
      throw new BadRequestException(
        'classId and userId are required to generate a session token',
      );
    }

    const tokenPayload = {
      token: `live_token_${classId}_${userId}_${Date.now()}`,
      classId,
      userId,
      role: role.toUpperCase(),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };

    return tokenPayload;
  }

  /**
   * Initiates a live class session and records it as active in the database.
   */
  async startSession(classId: string) {
    if (!classId) {
      throw new BadRequestException(
        'classId is required to start a live session',
      );
    }

    const now = new Date();

    // Create a new ACTIVE attendance/live session record
    const session = await this.databaseService.attendanceSession.create({
      data: {
        classroomId: classId,
        isActive: true,
        startedAt: now,
      },
    });

    return session;
  }

  /**
   * Concludes an active live session, updates status, and generates the final attendance report.
   */
  async endSession(classId: string) {
    if (!classId) {
      throw new BadRequestException(
        'classId is required to end a live session',
      );
    }

    const now = new Date();

    // Update active sessions for this classroom to inactive/ended
    const updateResult = await this.databaseService.attendanceSession.updateMany({
      where: { classroomId: classId, isActive: true },
      data: {
        isActive: false,
        endedAt: now,
      },
    });

    // Generate final attendance summary report
    const attendanceReport =
      await this.attendanceService.getAttendanceReport(classId);

    return {
      message: 'Live session ended successfully',
      classId,
      sessionsEnded: updateResult.count,
      endedAt: now.toISOString(),
      attendanceReport,
    };
  }

  /**
   * Checks if an active session exists for a classroom.
   */
  async getActiveSession(classId: string) {
    if (!classId) {
      throw new BadRequestException('classId is required');
    }

    const session = await this.databaseService.attendanceSession.findFirst({
      where: { classroomId: classId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });

    return {
      isActive: Boolean(session),
      session: session || null,
    };
  }
}

