import { Module } from '@nestjs/common';

import { PublisherModule } from '../publisher/publisher.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [PublisherModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
