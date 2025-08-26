// apps/worker/src/worker.module.ts
import { AiModule } from '@app/ai';
import { LoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { StorageModule } from '@app/storage';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { JobsProcessor } from './jobs.processor';

@Module({
  imports: [
    BullModule.forRoot({ connection: { host: '127.0.0.1', port: 6379 } }),
    BullModule.registerQueue({ name: 'jobs' }),
    PrismaModule,
    LoggerModule,
    StorageModule,
    AiModule,
  ],
  providers: [JobsProcessor],
})
export class WorkerModule {}
