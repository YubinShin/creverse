import { AiModule } from '@app/ai';
import { AppConfigModule } from '@app/common/infra';
import { LoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { StorageModule } from '@app/storage';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JobsProcessor } from './jobs.processor';
import { AlertModule } from 'libs/alert';

@Module({
  imports: [
    AppConfigModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueueAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: config.get<string>('queue.name'),
      }),
    }),
    PrismaModule,
    LoggerModule,
    StorageModule,
    AiModule,
    AlertModule,
  ],
  providers: [JobsProcessor],
})
export class WorkerModule {}
