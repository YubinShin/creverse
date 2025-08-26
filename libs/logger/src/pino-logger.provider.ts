import { Provider } from '@nestjs/common';
import pino from 'pino';

export const LOGGER = Symbol('LOGGER');

export const PinoLoggerProvider: Provider = {
  provide: LOGGER,
  useFactory: () =>
    pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
      base: undefined, // pid, hostname 제거(선택)
    }),
};
