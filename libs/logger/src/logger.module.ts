import { Global, Module } from '@nestjs/common';

import { PinoLoggerProvider } from './pino-logger.provider';
@Global()
@Module({
  providers: [PinoLoggerProvider],
  exports: [PinoLoggerProvider],
})
export class LoggerModule {}
