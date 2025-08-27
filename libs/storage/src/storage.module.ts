import { LoggerModule } from '@app/logger';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AzureStorage } from './azure.util';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [StorageService, AzureStorage],
  exports: [StorageService, AzureStorage],
})
export class StorageModule {}
