import { LoggedHttpService } from '@app/common';
import { LoggerModule } from '@app/logger';
import { Module } from '@nestjs/common';

import { AzureStorage } from './azure.util';
import { StorageService } from './storage.service';

@Module({
  imports: [LoggerModule],
  providers: [StorageService, AzureStorage, LoggedHttpService],
  exports: [StorageService, AzureStorage],
})
export class StorageModule {}
