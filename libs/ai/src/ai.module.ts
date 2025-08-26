import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { LoggedHttpService } from '@app/common';

@Module({
  imports: [HttpModule],
  providers: [AiService, LoggedHttpService],
  exports: [AiService],
})
export class AiModule {}
