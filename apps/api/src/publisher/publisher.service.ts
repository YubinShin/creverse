import { buildRedis, getQueueName } from '@app/common/redis/redis.config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Request } from 'express';

import { JobData, ProcessJob, ReevalJob } from './types/publisher.types';

@Injectable()
export class PublisherService implements OnModuleDestroy {
  private readonly q: Queue<JobData>;

  constructor() {
    this.q = new Queue<JobData>(getQueueName(), { connection: buildRedis() });
    this.q.on('error', (e: unknown) => {
      const err = e as Error;
      console.error('[Publisher queue error]', err.message, err.stack);
    });
  }

  async publishProcessJob(
    req: Request,
    submissionId: number,
    filePath: string,
  ) {
    const traceId = req.traceId;
    await this.q.add(
      'process-job',
      { submissionId, filePath, traceId } as ProcessJob,
      {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    return { status: 'queued', submissionId, traceId };
  }

  async publishReevalJob(req: Request, submissionId: number) {
    const traceId = req.traceId;
    await this.q.add('reeval-job', { submissionId, traceId } as ReevalJob, {
      removeOnComplete: 50,
      removeOnFail: 100,
    });
    return { status: 'queued', submissionId, traceId };
  }

  async onModuleDestroy(): Promise<void> {
    await this.q.close();
  }
}
