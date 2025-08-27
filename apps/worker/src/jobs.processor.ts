import { AiService } from '@app/ai';
import { detectWhiteBoundaryX } from '@app/common/media/boundary-detector';
import { sanitizeCropRectForVideo } from '@app/common/media/crop-utils';
import { cropVideo } from '@app/common/media/cropper';
import { extractMp3 } from '@app/common/media/mp3-extractor';
import { getVideoSizeFast } from '@app/common/media/video-meta';
import { LoggerService } from '@app/logger';
import { PrismaService } from '@app/prisma';
import { AzureStorage } from '@app/storage';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

type ProcessJob = { submissionId: number; traceId?: string; filePath?: string };

@Processor('jobs', { concurrency: 4 })
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AzureStorage,
    private readonly ai: AiService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<ProcessJob>) {
    const { submissionId, traceId, filePath } = job.data;
    const started = Date.now();
    const jobId = job.id ?? 'unknown';

    this.logger.setTraceId(traceId ?? String(jobId));
    const log = this.logger.child({
      jobId,
      submissionId,
      phase: 'worker',
    });

    log.log({ event: 'job.start', filePath });

    try {
      const sub = await this.markProcessing(submissionId);

      const { mp4Url, mp3Url, outMp3 } = await this.handleMediaProcessing(
        submissionId,
        traceId ?? '',
        filePath,
        log,
      );
      await this.verifySasUrls(mp4Url, mp3Url, log);

      const ai = await this.runAiEvaluation(
        sub.submitText ?? '',
        sub.componentType,
        traceId ?? '',
        log,
      );

      await this.updateSubmissionResult(submissionId, {
        mp4Url,
        mp3Url,
        outMp3,
        ai,
        submitText: sub.submitText ?? '',
        started,
        log,
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
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'FAILED', lastError: err.message },
      });

      log.error({ event: 'job.failed', msg: err.message, stack: err.stack });
      throw err;
    } finally {
      await this.prisma.submissionLog.create({
        data: {
          submissionId,
          phase: 'worker',
          uri: 'worker:jobs#process',
          status: 'ok',
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

    return { mp4Url, mp3Url, outMp3 };
  }

  private async verifySasUrls(
    mp4Url: string,
    mp3Url: string,
    log: LoggerService,
  ) {
    log.log({ event: 'phase.sas-verify.start' });
    const [v1, v2] = await Promise.all([fetchHead(mp4Url), fetchHead(mp3Url)]);
    log.log({ event: 'phase.sas-verify.ok', v1, v2 });
  }

  private async runAiEvaluation(
    text: string,
    componentType: string,
    traceId: string,
    log: LoggerService,
  ) {
    log.log({ event: 'phase.ai-evaluate.start' });
    const result = await this.ai.evaluate({
      submitText: text,
      componentType,
      traceId,
    });
    log.log({ event: 'phase.ai-evaluate.ok' });
    return result;
  }

  private async updateSubmissionResult(
    submissionId: number,
    opts: {
      mp4Url: string;
      mp3Url: string;
      outMp3: string;
      ai: { score: number; feedback: string; highlights: string[] };
      submitText: string;
      started: number;
      log: LoggerService;
    },
  ) {
    const { mp4Url, mp3Url, outMp3, ai, submitText, started, log } = opts;

    log.log({ event: 'phase.db-update.start' });
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'COMPLETED',
        videoUrl: mp4Url,
        audioUrl: mp3Url,
        audioPath: outMp3,
        score: Math.max(0, Math.min(10, Math.floor(ai.score))),
        feedback: ai.feedback?.slice(0, 2000) ?? null,
        highlights: ai.highlights as Prisma.InputJsonValue,
        highlightSubmitText: highlightHtmlByStrings(submitText, ai.highlights),
        apiLatency: Date.now() - started,
        lastError: null,
      },
    });
    log.log({ event: 'phase.db-update.ok' });
  }
}

async function fetchHead(url: string) {
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) throw new Error(`HEAD ${res.status} ${res.statusText}`);
  return { status: res.status, len: res.headers.get('content-length') };
}

// 문자열 목록으로 하이라이트 (겹침 최소화, 간단 매칭)
function highlightHtmlByStrings(text: string, items: string[]) {
  if (!text || !items?.length) return escapeHtml(text);

  const needles = [
    ...new Set(items.map((s) => s?.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  let out = escapeHtml(text);
  for (const n of needles) {
    const esc = escapeRegExp(n);
    out = out.replace(new RegExp(esc, 'g'), (m) => `<b>${escapeHtml(m)}</b>`);
  }
  return out;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
