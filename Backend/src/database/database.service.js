import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        // Connects to SQLite or PostgreSQL when the server starts
        await this.$connect();
    }

    async onModuleDestroy() {
        // Closes the connection gracefully when the server stops
        await this.$disconnect();
    }
}