import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Finds records modified locally after the last sync date
   */
  async getLocalChanges(lastSyncTimestamp: any) {
    const lastSyncDate = new Date(lastSyncTimestamp || 0);

    return {
      assignments: await (this.db as any).assignment?.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }) || [],
      quizzes: await (this.db as any).quiz?.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }) || [],
      attendance: await this.db.attendance.findMany({
        where: { updatedAt: { gt: lastSyncDate } },
      }),
    };
  }

  /**
   * Applies cloud records locally using Last-Write-Wins conflict resolution
   */
  async applyCloudChanges(incomingData: any) {
    let appliedCount = 0;
    let skippedCount = 0;

    const assignments = incomingData?.assignments || [];

    for (const assignment of assignments) {
      const assignmentModel = (this.db as any).assignment;
      if (!assignmentModel) continue;

      const localRecord = await assignmentModel.findUnique({
        where: { id: assignment.id },
      });

      // Last-Write-Wins: Update only if cloud data is newer
      if (!localRecord || new Date(assignment.updatedAt) > new Date(localRecord.updatedAt)) {
        await assignmentModel.upsert({
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
