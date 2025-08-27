import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_USERNAME: Joi.string().optional(),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_TLS: Joi.boolean().default(false),

  // Auth
  JWT_SECRET: Joi.string().min(10).required(),
  ACCESS_CODE: Joi.string().required(),
  MAX_RETRY: Joi.number().default(3),

  // Alert / tracing
  ALERT_WEBHOOK_URL: Joi.string().uri().optional(),
  TRACE_ID: Joi.string().optional(),

  // Azure / OpenAI
  AZURE_ENDPOINT_URL: Joi.string().allow('-').required(),
  AZURE_ENDPOINT_KEY: Joi.string().allow('-').required(),
  AZURE_OPENAI_DEPLOYMENT_NAME: Joi.string().allow('-').required(),
  OPENAPI_API_VERSION: Joi.string().allow('-').required(),

  AZURE_CONNECTION_STRING: Joi.string().allow('-').required(),
  AZURE_CONTAINER: Joi.string().default('processed'),

  // Queue
  QUEUE_NAME: Joi.string().default('jobs'),
});
