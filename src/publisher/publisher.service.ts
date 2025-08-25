import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export type ProcessJob = {
  submissionId: number;
  traceId?: string;
  filePath?: string;
};
export type ReevalJob = { submissionId: number; traceId?: string };

const QUEUE_NAME = 'submission';

@Injectable()
export class PublisherService {
  private readonly submissionQ: Queue<ProcessJob>;

  constructor() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };
    this.submissionQ = new Queue<ProcessJob>(QUEUE_NAME, { connection });
  }

  enqueueProcess(payload: ProcessJob) {
    return this.submissionQ.add('process', payload, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  enqueueReevaluation(payload: ReevalJob) {
    return this.submissionQ.add('reevaluate', payload as any, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}
