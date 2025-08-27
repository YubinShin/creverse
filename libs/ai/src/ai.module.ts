import { LoggedHttpService } from '@app/common/infra/http';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AiService } from './ai.service';

@Module({
  imports: [HttpModule],
  providers: [AiService, LoggedHttpService],
  exports: [AiService],
})
export class AiModule {}
