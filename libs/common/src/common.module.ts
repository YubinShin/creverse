import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { LoggedHttpService } from './http/logged-http.service';

@Module({
  providers: [LoggedHttpService],
  imports: [HttpModule.register({ timeout: 5000 })],
  exports: [LoggedHttpService],
})
export class CommonModule {}
