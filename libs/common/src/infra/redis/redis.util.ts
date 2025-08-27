import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export function buildRedis(config: ConfigService): RedisOptions {
  const tls =
    String(config.get<boolean>('redis.tls') ?? false).toLowerCase() === 'true';

  const base: RedisOptions = {
    host: config.get<string>('redis.host', 'localhost'),
    port: config.get<number>('redis.port', 6379),
  };

  return {
    ...base,
    ...(config.get<string>('redis.username')
      ? { username: config.get<string>('redis.username') }
      : {}),
    ...(config.get<string>('redis.password')
      ? { password: config.get<string>('redis.password') }
      : {}),
    ...(tls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}
