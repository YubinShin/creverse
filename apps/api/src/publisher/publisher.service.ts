import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Request } from 'express';

import { JobData, ProcessJob, ReevalJob } from './types/publisher.types';

@Injectable()
export class PublisherService {
  private readonly queueName: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue() private readonly q: Queue<JobData>, // 여기선 default 등록된 queue 받음
  ) {
    this.queueName = this.config.get<string>('queue.name') ?? 'jobs';
    this.q.on('error', (e: unknown) => {
      const err = e as Error;
      console.error(`[Publisher queue error][${this.queueName}]`, err.message);
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
      { submissionId, filePath, traceId },
      { removeOnComplete: 50, removeOnFail: 100 },
    );
    return { status: 'queued', submissionId, traceId, queue: this.queueName };
  }

  async publishReevalJob(req: Request, submissionId: number) {
    const traceId = req.traceId;
    await this.q.add(
      'reeval-job',
      { submissionId, traceId },
      {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    return { status: 'queued', submissionId, traceId, queue: this.queueName };
  }

  public async enqueueProcessJob(data: ProcessJob, traceId?: string) {
    await this.q.add('process-job', data, {
      removeOnComplete: 50,
      removeOnFail: 100,
    });
    return { status: 'queued', traceId, submissionId: data.submissionId };
  }
}
