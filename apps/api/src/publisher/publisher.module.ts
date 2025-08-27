import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PublisherService } from './publisher.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: config.get<string>('queue.name') ?? 'jobs',
      }),
    }),
  ],
  providers: [PublisherService],
  exports: [PublisherService],
})
export class PublisherModule {}
