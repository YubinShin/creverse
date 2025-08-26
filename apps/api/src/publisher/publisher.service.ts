import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export type ProcessJob = {
  submissionId: number;
  traceId?: string;
  filePath?: string;
};
export type ReevalJob = { submissionId: number; traceId?: string };

type JobData = ProcessJob | ReevalJob;

const QUEUE_NAME = 'jobs';

function buildRedis(): RedisOptions {
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

@Injectable()
export class PublisherService implements OnModuleDestroy {
  private readonly q: Queue<JobData>;

  constructor() {
    this.q = new Queue<JobData>(QUEUE_NAME, { connection: buildRedis() }); // ✅ OK
    this.q.on('error', (e) => {
      console.error('[Publisher queue error]', e);
    });
  }

  async enqueueProcess(payload: ProcessJob): Promise<void> {
    await this.q.add('process', payload, {
      // ✅ 제네릭 인수 삭제
      removeOnComplete: 50,
      removeOnFail: 100,
    });
  }

  async enqueueReevaluation(payload: ReevalJob): Promise<void> {
    await this.q.add('reevaluate', payload, {
      // ✅ 제네릭 인수/any 캐스트 삭제
      removeOnComplete: 50,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.q.close();
  }
}
