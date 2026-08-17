import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class SyncService {
  constructor(db) {
    this.db = db;
    this.logger = new Logger(SyncService.name);
  }

  /**
   * Finds records modified locally after the last sync date
   */
  async getLocalChanges(lastSyncTimestamp) {
    const lastSyncDate = new Date(lastSyncTimestamp || 0);

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
  async applyCloudChanges(incomingData) {
    let appliedCount = 0;
    let skippedCount = 0;

    const assignments = incomingData?.assignments || [];

    for (const assignment of assignments) {
      const localRecord = await this.db.assignment.findUnique({
        where: { id: assignment.id },
      });

      // Last-Write-Wins: Update only if cloud data is newer
      if (!localRecord || new Date(assignment.updatedAt) > new Date(localRecord.updatedAt)) {
        await this.db.assignment.upsert({
          where: { id: assignment.id },
          create: assignment,
          update: assignment,
        });
        appliedCount++;
      } else {
        skippedCount++;
      }
    }

    return { applied: appliedCount, skipped: skippedCount };
  }
}