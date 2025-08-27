import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlertService } from './alert.service';

@Module({
  imports: [ConfigModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
