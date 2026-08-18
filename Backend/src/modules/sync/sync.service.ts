import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export enum SyncAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Injectable()
export class SyncService {
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
        action: action.toString(),
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
}
