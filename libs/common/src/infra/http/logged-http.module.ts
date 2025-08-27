import { LoggerModule } from '@app/logger';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { LoggedHttpService } from './logged-http.service';

@Module({
  imports: [HttpModule, LoggerModule],
  providers: [LoggedHttpService],
  exports: [LoggedHttpService],
})
export class LoggedHttpModule {}
