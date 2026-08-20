import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AttendanceService } from '../attendance/attendance.service';

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
 * Service managing live class sessions, token generation, and end-of-session reporting.
 */
@Injectable()
export class LiveClassService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly attendanceService: AttendanceService,
  ) {}

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
        title: 'Live Classroom',
        inviteCode: 'LIVE' + Math.floor(100 + Math.random() * 900),
        createdById: defaultUser.id,
      },
    });
    return created.id;
  }

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

    const validClassId = await this.ensureClassroomExists(classId);
    const now = new Date();

    const session = await this.databaseService.attendanceSession.create({
      data: {
        classroomId: validClassId,
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

    const validClassId = await this.ensureClassroomExists(classId);
    const now = new Date();

    const updateResult = await this.databaseService.attendanceSession.updateMany({
      where: { classroomId: validClassId, isActive: true },
      data: {
        isActive: false,
        endedAt: now,
      },
    });

    const attendanceReport =
      await this.attendanceService.getAttendanceReport(validClassId);

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

    const validClassId = toUuid(classId);
    const session = await this.databaseService.attendanceSession.findFirst({
      where: { classroomId: validClassId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });

    return {
      isActive: Boolean(session),
      session: session || null,
    };
  }
}

