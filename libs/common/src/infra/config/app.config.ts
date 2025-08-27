import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    // Redis
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_USERNAME: Joi.string().optional(),
    REDIS_PASSWORD: Joi.string().optional(),
    REDIS_TLS: Joi.boolean().default(false),

    // Queue
    QUEUE_NAME: Joi.string().default('jobs'),
    QUEUE_DRIVER: Joi.string().valid('bullmq', 'sqs').default('bullmq'),
    MAX_RETRY: Joi.number().default(3),

    // Azure Storage
    AZURE_CONNECTION_STRING: Joi.string().required(),
    AZURE_CONTAINER: Joi.string().required(),

    // DB
    DATABASE_URL: Joi.string().required(),

    // JWT
    JWT_SECRET: Joi.string().required(),

    // Optional
    ACCESS_CODE: Joi.string().optional(),
    ALERT_WEBHOOK_URL: Joi.string().uri().optional(),
    TRACE_ID: Joi.string().optional(),
  }),
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
