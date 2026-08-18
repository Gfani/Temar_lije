import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly db: DatabaseService) { }

  /**
   * Finds records modified locally after the last sync date
   */
  async getLocalChanges(lastSyncTimestamp: any) {
    const lastSyncDate = new Date(lastSyncTimestamp || 0);

    this.logger.log(`Fetching local changes modified after: ${lastSyncDate.toISOString()}`);

    return {
      assignments: await this.db.assignment.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      quizzes: await this.db.quiz.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
      attendance: await this.db.attendance.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
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
      const localRecord = await this.db.assignment.findUnique({
        where: { id: assignment.id },
      });

      // Last-Write-Wins: Update only if cloud data is newer than what we have locally
      if (!localRecord || new Date(assignment.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.db.assignment.upsert({
          where: { id: assignment.id },
          create: {
            id: assignment.id,
            classId: assignment.classId,
            title: assignment.title,
            description: assignment.description,
            deadline: assignment.deadline ? new Date(assignment.deadline) : null,
            submissionCount: assignment.submissionCount || 0,
            createdAt: new Date(assignment.createdAt),
            updatedAt: new Date(assignment.updatedAt),
          },
          update: {
            classId: assignment.classId,
            title: assignment.title,
            description: assignment.description,
            deadline: assignment.deadline ? new Date(assignment.deadline) : null,
            submissionCount: assignment.submissionCount || 0,
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
      const localRecord = await this.db.quiz.findUnique({
        where: { id: quiz.id },
      });

      // Last-Write-Wins
      if (!localRecord || new Date(quiz.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.db.quiz.upsert({
          where: { id: quiz.id },
          create: {
            id: quiz.id,
            classId: quiz.classId,
            title: quiz.title,
            description: quiz.description || null,
            createdAt: new Date(quiz.createdAt),
            updatedAt: new Date(quiz.updatedAt),
          },
          update: {
            classId: quiz.classId,
            title: quiz.title,
            description: quiz.description || null,
            updatedAt: new Date(quiz.updatedAt),
          },
        });
        appliedQuizzesCount++;
      } else {
        skippedQuizzesCount++;
      }
    }

    // 3. Process Attendance
    const attendances = incomingData?.attendance || [];
    for (const attendance of attendances) {
      const localRecord = await this.db.attendance.findUnique({
        where: { id: attendance.id },
      });

      // Last-Write-Wins
      if (!localRecord || new Date(attendance.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.db.attendance.upsert({
          where: { id: attendance.id },
          create: {
            id: attendance.id,
            classId: attendance.classId,
            studentId: attendance.studentId,
            status: attendance.status,
            ipAddress: attendance.ipAddress || null,
            checkInTime: attendance.checkInTime ? new Date(attendance.checkInTime) : new Date(),
            createdAt: new Date(attendance.createdAt),
            updatedAt: new Date(attendance.updatedAt),
          },
          update: {
            classId: attendance.classId,
            studentId: attendance.studentId,
            status: attendance.status,
            ipAddress: attendance.ipAddress || null,
            checkInTime: attendance.checkInTime ? new Date(attendance.checkInTime) : new Date(),
            updatedAt: new Date(attendance.updatedAt),
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
