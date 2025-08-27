import type { RedisOptions } from 'ioredis';

export function buildRedis(): RedisOptions {
  const tls = String(process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';

  const base: RedisOptions = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };

  return {
    ...base,
    ...(process.env.REDIS_USERNAME
      ? { username: process.env.REDIS_USERNAME }
      : {}),
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
    ...(tls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

export const getQueueName = (): string => process.env.QUEUE_NAME ?? 'jobs';
