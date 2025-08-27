import { ConfigModule } from '@nestjs/config';

import { envValidationSchema } from './validation';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
  load: [
    () => ({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true',
      },
      queue: {
        name: process.env.QUEUE_NAME ?? 'jobs',
        driver: process.env.QUEUE_DRIVER ?? 'bullmq',
        maxRetry: Number(process.env.MAX_RETRY ?? 3),
      },
      storage: {
        connectionString: process.env.AZURE_CONNECTION_STRING,
        container: process.env.AZURE_CONTAINER,
      },
      db: {
        url: process.env.DATABASE_URL,
      },
      jwt: {
        secret: process.env.JWT_SECRET,
      },
      misc: {
        accessCode: process.env.ACCESS_CODE,
        alertWebhook: process.env.ALERT_WEBHOOK_URL,
        traceId: process.env.TRACE_ID,
      },
    }),
  ],
});
