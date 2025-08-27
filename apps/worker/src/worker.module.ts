// apps/worker/src/worker.module.ts
import { AiModule } from '@app/ai';
import { buildRedis, getQueueName } from '@app/common/redis';
import { LoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { StorageModule } from '@app/storage';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { JobsProcessor } from './jobs.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: buildRedis(),
    }),
    BullModule.registerQueue({ name: getQueueName() }),
    PrismaModule,
    LoggerModule,
    StorageModule,
    AiModule,
  ],
  providers: [JobsProcessor],
})
export class WorkerModule {}
