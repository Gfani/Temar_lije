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
   *
   * @param {string} classId - The classroom ID.
   * @param {string} userId - The user ID requesting the token.
   * @param {string} [role='STUDENT'] - Role of the user ('TEACHER' or 'STUDENT').
   * @returns {Object} Access token payload.
   */
  generateSessionToken(classId, userId, role = 'STUDENT') {
    if (!classId || !userId) {
      throw new BadRequestException(
        'classId and userId are required to generate a session token',
      );
    }

    // Mock access token structure encoding classroom, user, role, and expiration
    const tokenPayload = {
      token: `live_token_${classId}_${userId}_${Date.now()}`,
      classId,
      userId,
      role: role.toUpperCase(),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hour validity
    };

    return tokenPayload;
  }

  /**
   * Initiates a live class session and records it as ACTIVE in the database.
   *
   * @param {string} classId - The classroom ID.
   * @returns {Promise<Object>} Created live class session record.
   */
  async startSession(classId) {
    if (!classId) {
      throw new BadRequestException(
        'classId is required to start a live session',
      );
    }

    const now = new Date();

    // Create a new ACTIVE live class session record
    const session = await this.databaseService.liveClass.create({
      data: {
        classId,
        status: 'ACTIVE',
        startTime: now,
      },
    });

    // Optionally update classroom startTime for attendance reference
    try {
      await this.databaseService.classroom.update({
        where: { id: classId },
        data: { startTime: now },
      });
    } catch (err) {
      // If classroom record doesn't exist yet, non-fatal fallback
    }

    return session;
  }

  /**
   * Concludes an active live session, updates status to ENDED, and generates the final attendance report.
   *
   * @param {string} classId - The classroom ID.
   * @returns {Promise<Object>} Concluded session details and final attendance summary report.
   */
  async endSession(classId) {
    if (!classId) {
      throw new BadRequestException(
        'classId is required to end a live session',
      );
    }

    const now = new Date();

    // Update active sessions for this classroom to ENDED
    const updateResult = await this.databaseService.liveClass.updateMany({
      where: { classId, status: 'ACTIVE' },
      data: {
        status: 'ENDED',
        endTime: now,
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
}
