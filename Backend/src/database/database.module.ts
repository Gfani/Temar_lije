import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global DatabaseModule exporting DatabaseService for application-wide DB access.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
