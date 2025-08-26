import { Module } from '@nestjs/common';

import { AzureStorage } from './azure.util';
import { StorageService } from './storage.service';
@Module({
  providers: [StorageService, AzureStorage],
  exports: [StorageService, AzureStorage],
})
export class StorageModule {}
