import { AiService } from '@app/ai';
import {
  cropVideo,
  detectWhiteBoundaryX,
  extractMp3,
  getVideoSizeFast,
  highlightHtmlByStrings,
  LoggedHttpService,
  sanitizeCropRectForVideo,
} from '@app/common';
import { LoggerService } from '@app/logger';
import { PrismaService } from '@app/prisma';
import { AzureStorageService } from '@app/storage';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { AlertService } from 'libs/alert';

type ProcessJob = { submissionId: number; traceId?: string; filePath?: string };

@Processor('jobs', { concurrency: 4 })
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AzureStorageService,
    private readonly ai: AiService,
    private readonly logger: LoggerService,
    private readonly alert: AlertService,
    private readonly http: LoggedHttpService,
  ) {
    super();
  }

  async process(job: Job<ProcessJob>) {
    const { submissionId, traceId, filePath } = job.data;
    const started = Date.now();
    const jobId = job.id ?? 'unknown';

    this.logger.setTraceId(traceId ?? String(jobId));
    const log = this.logger.child({ jobId, submissionId, phase: 'worker' });
    log.log({ event: 'job.start', filePath });

    try {
      const sub = await this.markProcessing(submissionId);

      const { mp4Url, mp3Url, outMp3, outMp4, width, height } =
        await this.handleMediaProcessing(
          submissionId,
          traceId ?? '',
          filePath,
          log,
        );
      await this.verifySasUrls(traceId ?? '', mp4Url, mp3Url, log);

      const ai = await this.runAiEvaluation(
        sub.submitText ?? '',
        sub.componentType,
        traceId ?? '',
        log,
        submissionId,
      );

      await this.updateSubmissionResult(submissionId, {
        mp4Url,
        mp3Url,
        outMp3,
        outMp4,
        ai,
        submitText: sub.submitText ?? '',
        started,
        log,
        width,
        height,
      });

      log.log({ event: 'job.completed', score: ai.score });
      return {
        status: 'COMPLETED',
        submissionId,
        score: ai.score,
        feedback: ai.feedback,
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      await this.prisma.$transaction([
        this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: 'FAILED',
            lastError: err.message,
          },
        }),
        this.prisma.submissionLog.create({
          data: {
            submissionId,
            phase: 'worker',
            status: 'failed',
            traceId,
            uri: 'worker:jobs#process',
            message: err.message,
          },
        }),
      ]);

      log.error({ event: 'job.failed', msg: err.message, stack: err.stack });
      await this.alert.notifyOnFailure(`job.failed: ${err.message}`, {
        traceId: job.id,
        extras: { submissionId },
      });
      throw err;
    } finally {
      await this.prisma.submissionLog.create({
        data: {
          submissionId,
          phase: 'worker',
          status: 'ok',
          uri: 'worker:jobs#process',
          traceId,
          latencyMs: Date.now() - started,
          message: 'done',
        },
      });
      log.debug({ event: 'job.finally', latencyMs: Date.now() - started });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error({
      event: 'worker.event.failed',
      jobId: job.id ?? 'unknown',
      error: err.stack,
    });
  }

  private async markProcessing(
    submissionId: number,
  ): Promise<{ id: number; componentType: string; submitText: string | null }> {
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'PROCESSING' },
      select: { id: true, componentType: true, submitText: true },
    });
  }

  private async handleMediaProcessing(
    submissionId: number,
    traceId: string,
    filePath: string | undefined,
    log: LoggerService,
  ) {
    if (!filePath) throw new Error('missing input video path');

    const outMp4 = `${filePath}.cropped.mp4`;
    const outMp3 = `${filePath}.audio.mp3`;

    const { width, height } = await getVideoSizeFast(filePath);
    const detectedX = await detectWhiteBoundaryX(filePath, width, height, {
      whiteThresh: 220,
      minRun: 6,
    }).catch(() => null);
    const fallbackX = Math.floor(width * 0.17);
    const x = Math.min(detectedX ?? fallbackX, Math.floor(width * 0.7));

    const rawRect = {
      x: x + 10,
      y: 0,
      w: Math.max(1, width - x - 10),
      h: height,
    };
    const rect = sanitizeCropRectForVideo(rawRect, width, height);
    log.log({ event: 'crop.rect', width, height, rect });

    await cropVideo(filePath, outMp4, rect);
    await extractMp3(filePath, outMp3);

    log.log({ event: 'phase.azure-upload.start' });
    const mp4Url = await this.storage.uploadFileAndGetSas(
      `submissions/${submissionId}/video.mp4`,
      outMp4,
      'video/mp4',
      60,
      traceId,
    );
    const mp3Url = await this.storage.uploadFileAndGetSas(
      `submissions/${submissionId}/audio.mp3`,
      outMp3,
      'audio/mpeg',
      60,
      traceId,
    );
    log.log({ event: 'phase.azure-upload.ok', mp4Url, mp3Url });

    return { mp4Url, mp3Url, outMp4, outMp3, width, height };
  }

  private async verifySasUrls(
    traceId: string,
    mp4Url: string,
    mp3Url: string,
    log: LoggerService,
  ) {
    log.log({ event: 'phase.sas-verify.start' });
    const [v1, v2] = await Promise.all([
      this.http.headWithLog(mp4Url, {}, traceId, 'sas-verify'),
      this.http.headWithLog(mp3Url, {}, traceId, 'sas-verify'),
    ]);
    log.log({ event: 'phase.sas-verify.ok', v1, v2 });
  }

  private async runAiEvaluation(
    text: string,
    componentType: string,
    traceId: string,
    log: LoggerService,
    submissionId: number,
  ) {
    const started = Date.now();
    log.log({ event: 'phase.ai-evaluate.start' });

    const result = await this.ai.evaluate({
      submitText: text,
      componentType,
      traceId,
    });

    const latency = Date.now() - started;
    await this.prisma.submissionLog.create({
      data: {
        submissionId,
        phase: 'ai',
        status: 'ok',
        traceId,
        latencyMs: latency,
        message: 'ai evaluation completed',
        uri: 'worker:jobs#process',
      },
    });

    log.log({ event: 'phase.ai-evaluate.ok', latencyMs: latency });
    return result;
  }

  private async updateSubmissionResult(
    submissionId: number,
    opts: {
      mp4Url: string;
      mp3Url: string;
      outMp3: string;
      outMp4: string;
      ai: { score: number; feedback: string; highlights: string[] };
      submitText: string;
      started: number;
      log: LoggerService;
      width: number;
      height: number;
    },
  ) {
    const { mp4Url, mp3Url, outMp3, outMp4, ai, log, width, height } = opts;

    log.log({ event: 'phase.db-update.start' });

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'COMPLETED',
          score: Math.max(0, Math.min(10, Math.floor(ai.score))),
          feedback: ai.feedback?.slice(0, 2000) ?? null,
          resultJson: {
            score: ai.score,
            highlights: ai.highlights,
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      }),

      this.prisma.submissionMedia.upsert({
        where: {
          submissionId_mediaType: {
            submissionId,
            mediaType: 'VIDEO',
          },
        },
        update: {
          blobUrl: mp4Url,
          localPath: outMp4,
          metadata: { width, height },
        },
        create: {
          submissionId,
          mediaType: 'VIDEO',
          blobUrl: mp4Url,
          localPath: outMp4,
          metadata: { width, height },
        },
      }),

      this.prisma.submissionMedia.upsert({
        where: {
          submissionId_mediaType: {
            submissionId,
            mediaType: 'AUDIO',
          },
        },
        update: { blobUrl: mp3Url, localPath: outMp3 },
        create: {
          submissionId,
          mediaType: 'AUDIO',
          blobUrl: mp3Url,
          localPath: outMp3,
        },
      }),
    ]);

    log.log({ event: 'phase.db-update.ok' });
  }
}
