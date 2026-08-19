import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export enum SyncAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Logs a synchronization event for offline-to-online reconciliation.
   */
  async logSyncEvent(data: {
    deviceHubId: string;
    entityName: string;
    entityId: string;
    action: SyncAction | string;
    payload: any;
  }) {
    const { deviceHubId, entityName, entityId, action, payload } = data;

    if (!deviceHubId || !entityName || !entityId || !action) {
      throw new BadRequestException('deviceHubId, entityName, entityId, and action are required');
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload || {});

    return await this.databaseService.syncLog.create({
      data: {
        deviceHubId,
        entityName,
        entityId,
        action: action as any,
        payload: payloadString,
        syncedAt: new Date(),
      },
    });
  }

  /**
   * Retrieves sync logs for a specific device hub or entity.
   */
  async getSyncLogs(deviceHubId?: string, entityName?: string) {
    const where: any = {};
    if (deviceHubId) where.deviceHubId = deviceHubId;
    if (entityName) where.entityName = entityName;

    return await this.databaseService.syncLog.findMany({
      where,
      orderBy: { syncedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Finds records modified locally after the last sync date
   */
  async getLocalChanges(lastSyncTimestamp: any) {
    const lastSyncDate = new Date(lastSyncTimestamp || 0);

    this.logger.log(`Fetching local changes modified after: ${lastSyncDate.toISOString()}`);

    return {
      assignments: await this.databaseService.assignment.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      quizzes: await this.databaseService.quiz.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      attendanceRecords: await this.databaseService.attendanceRecord.findMany({
        where: { checkedInAt: { gt: lastSyncDate } },
      }),
    };
  }

  /**
   * Applies cloud records locally using Last-Write-Wins conflict resolution
   */
  async applyCloudChanges(incomingData: any) {
    let appliedAssignmentsCount = 0;
    let skippedAssignmentsCount = 0;

    let appliedQuizzesCount = 0;
    let skippedQuizzesCount = 0;

    let appliedAttendanceCount = 0;
    let skippedAttendanceCount = 0;

    // 1. Process Assignments
    const assignments = incomingData?.assignments || [];
    for (const assignment of assignments) {
      const localRecord = await this.databaseService.assignment.findUnique({
        where: { id: assignment.id },
      });

      if (!localRecord || new Date(assignment.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.databaseService.assignment.upsert({
          where: { id: assignment.id },
          create: {
            id: assignment.id,
            classroomId: assignment.classroomId || assignment.classId,
            createdById: assignment.createdById,
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate || assignment.deadline ? new Date(assignment.dueDate || assignment.deadline) : null,
            totalPoints: assignment.totalPoints || 100,
            createdAt: new Date(assignment.createdAt),
            updatedAt: new Date(assignment.updatedAt),
          },
          update: {
            classroomId: assignment.classroomId || assignment.classId,
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.dueDate || assignment.deadline ? new Date(assignment.dueDate || assignment.deadline) : null,
            totalPoints: assignment.totalPoints || 100,
            updatedAt: new Date(assignment.updatedAt),
          },
        });
        appliedAssignmentsCount++;
      } else {
        skippedAssignmentsCount++;
      }
    }

    // 2. Process Quizzes
    const quizzes = incomingData?.quizzes || [];
    for (const quiz of quizzes) {
      const localRecord = await this.databaseService.quiz.findUnique({
        where: { id: quiz.id },
      });

      if (!localRecord || new Date(quiz.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.databaseService.quiz.upsert({
          where: { id: quiz.id },
          create: {
            id: quiz.id,
            classroomId: quiz.classroomId || quiz.classId,
            title: quiz.title,
            description: quiz.description || null,
            durationMinutes: quiz.durationMinutes || 30,
            isPublished: quiz.isPublished ?? false,
            createdAt: new Date(quiz.createdAt),
            updatedAt: new Date(quiz.updatedAt),
          },
          update: {
            classroomId: quiz.classroomId || quiz.classId,
            title: quiz.title,
            description: quiz.description || null,
            durationMinutes: quiz.durationMinutes || 30,
            isPublished: quiz.isPublished ?? false,
            updatedAt: new Date(quiz.updatedAt),
          },
        });
        appliedQuizzesCount++;
      } else {
        skippedQuizzesCount++;
      }
    }

    // 3. Process Attendance Records
    const attendances = incomingData?.attendance || incomingData?.attendanceRecords || [];
    for (const attendance of attendances) {
      const localRecord = await this.databaseService.attendanceRecord.findUnique({
        where: { id: attendance.id },
      });

      if (!localRecord || new Date(attendance.checkedInAt || attendance.updatedAt) > new Date(localRecord.checkedInAt)) {
        await this.databaseService.attendanceRecord.upsert({
          where: { id: attendance.id },
          create: {
            id: attendance.id,
            sessionId: attendance.sessionId,
            studentId: attendance.studentId,
            status: attendance.status || 'PRESENT',
            checkedInAt: attendance.checkedInAt ? new Date(attendance.checkedInAt) : new Date(),
          },
          update: {
            sessionId: attendance.sessionId,
            studentId: attendance.studentId,
            status: attendance.status || 'PRESENT',
            checkedInAt: attendance.checkedInAt ? new Date(attendance.checkedInAt) : new Date(),
          },
        });
        appliedAttendanceCount++;
      } else {
        skippedAttendanceCount++;
      }
    }

    return {
      assignments: { applied: appliedAssignmentsCount, skipped: skippedAssignmentsCount },
      quizzes: { applied: appliedQuizzesCount, skipped: skippedQuizzesCount },
      attendance: { applied: appliedAttendanceCount, skipped: skippedAttendanceCount },
    };
  }
}