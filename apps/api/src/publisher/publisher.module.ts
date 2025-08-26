import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PublisherService } from './publisher.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [PublisherService],
  exports: [PublisherService],
})
export class PublisherModule {}
