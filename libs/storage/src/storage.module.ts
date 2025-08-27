import { LoggerModule } from '@app/logger';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AzureStorageService } from './azure-storage.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [AzureStorageService],
  exports: [AzureStorageService],
})
export class StorageModule {}
