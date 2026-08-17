import { Controller, Post, Body, Dependencies } from '@nestjs/common';
import { SyncService } from './sync.service.js';

@Controller('sync')
@Dependencies(SyncService)
export class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }

    @Post('push-pull')
    async triggerSync(@Body() body) {
        const lastSyncTimestamp = body?.lastSyncTimestamp;
        const cloudChanges = body?.cloudChanges || {};

        // 1. Resolve and apply changes coming from cloud to local
        const syncStatus = await this.syncService.applyCloudChanges(cloudChanges);

        // 2. Collect local changes that need to be uploaded to cloud
        const localChanges = await this.syncService.getLocalChanges(lastSyncTimestamp);

        return {
            status: 'success',
            timestamp: new Date().toISOString(),
            appliedToLocal: syncStatus,
            payloadForCloud: localChanges,
        };
    }
}