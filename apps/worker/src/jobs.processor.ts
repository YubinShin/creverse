import { AiService } from '@app/ai';
import { detectWhiteBoundaryX } from '@app/common/media/boundary-detector';
import { sanitizeCropRectForVideo } from '@app/common/media/crop-utils';
import { cropVideo } from '@app/common/media/cropper';
import { extractMp3 } from '@app/common/media/mp3-extractor';
import { getVideoSizeFast } from '@app/common/media/video-meta';
import { PrismaService } from '@app/prisma';
import { AzureStorage } from '@app/storage'; // 예: libs/storage/src/azure.util.ts에서 export
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
  ) {
    super();
  }

  async process(job: Job<ProcessJob>) {
    const { submissionId, traceId, filePath } = job.data;
    const started = Date.now();
    const phaseUri = 'worker:jobs#process';

    const log = (status: 'ok' | 'failed', message: string) =>
      this.prisma.submissionLog.create({
        data: {
          submissionId,
          phase: 'worker',
          uri: phaseUri,
          status,
          traceId,
          message,
        },
      });

    console.log('[worker] start', job.id, job.data);

    try {
      const sub = await this.markProcessing(submissionId);

      const { mp4Url, mp3Url, outMp3 } = await this.handleMediaProcessing(
        submissionId,
        traceId!,
        filePath,
      );
      await this.verifySasUrls(mp4Url, mp3Url);

      const ai = await this.runAiEvaluation(
        sub.submitText,
        sub.componentType,
        traceId!,
      );

      await this.updateSubmissionResult(submissionId, {
        mp4Url,
        mp3Url,
        outMp3,
        ai,
        submitText: sub.submitText,
        started,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.prisma.submission.update({
        where: { id: job.data.submissionId },
        data: { status: 'FAILED', lastError: msg },
      });
      await log('failed', msg);
      // void notifyOnFailure(
      //   `[worker] submission ${job.data.submissionId} failed: ${msg}`,
      //   { traceId, channel: 'slack' },
      // );
      console.error('[worker] failed', job.id, msg);
      throw e;
    } finally {
      await this.prisma.submissionLog.create({
        data: {
          submissionId,
          phase: 'worker',
          uri: phaseUri,
          status: 'ok',
          traceId,
          latencyMs: Date.now() - started,
          message: 'done',
        },
      });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error('[worker:event] failed', job.id, err.message);
  }

  private async markProcessing(submissionId: number) {
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'PROCESSING' },
      select: { id: true, componentType: true, submitText: true },
    });
  }

  private async handleMediaProcessing(
    submissionId: number,
    traceId: string,
    filePath?: string,
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
    console.log('[worker] input=', width, 'x', height, 'rect=', rect);

    await cropVideo(filePath, outMp4, rect);
    await extractMp3(filePath, outMp3);

    console.log('[phase] azure-upload start');
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
    console.log('[phase] azure-upload ok', { mp4Url, mp3Url });

    return { mp4Url, mp3Url, outMp3 };
  }

  private async verifySasUrls(mp4Url: string, mp3Url: string) {
    console.log('[phase] sas-verify start');
    const [v1, v2] = await Promise.all([fetchHead(mp4Url), fetchHead(mp3Url)]);
    console.log('[phase] sas-verify ok', v1, v2);
  }

  private async runAiEvaluation(
    text: string,
    componentType: string,
    traceId: string,
  ) {
    console.log('[phase] ai-evaluate start');
    const result = await this.ai.evaluate({
      submitText: text ?? '',
      componentType,
      traceId,
    });
    console.log('[phase] ai-evaluate ok');
    return result;
  }

  private async updateSubmissionResult(
    submissionId: number,
    opts: {
      mp4Url: string;
      mp3Url: string;
      outMp3: string;
      ai: { score: number; feedback: string; highlights: any[] };
      submitText: string;
      started: number;
    },
  ) {
    const { mp4Url, mp3Url, outMp3, ai, submitText, started } = opts;

    console.log('[phase] db-update start');
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
        highlightSubmitText: highlightHtmlByStrings(
          submitText ?? '',
          ai.highlights,
        ),
        apiLatency: Date.now() - started,
        lastError: null,
      },
    });
    console.log('[phase] db-update ok');
  }
}

async function fetchHead(url: string) {
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) throw new Error(`HEAD ${res.status} ${res.statusText}`);
  return { status: res.status, len: res.headers.get('content-length') };
}

// 간단 하이라이트(겹침/범위오류 방지)
function highlightHtml(
  text: string,
  spans: Array<{ start: number; end: number }>,
) {
  if (!spans?.length || !text) return text;
  const n = text.length;
  const sorted = [...spans]
    .map(({ start, end }) => ({
      s: Math.max(0, Math.min(n, start | 0)),
      e: Math.max(0, Math.min(n, end | 0)),
    }))
    .filter(({ s, e }) => e > s)
    .sort((a, b) => a.s - b.s);

  const merged: Array<{ s: number; e: number }> = [];
  for (const r of sorted) {
    if (!merged.length || r.s > merged[merged.length - 1].e)
      merged.push({ ...r });
    else
      merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, r.e);
  }

  let out = '',
    cur = 0;
  for (const { s, e } of merged) {
    out +=
      escapeHtml(text.slice(cur, s)) +
      '<b>' +
      escapeHtml(text.slice(s, e)) +
      '</b>';
    cur = e;
  }
  out += escapeHtml(text.slice(cur));
  return out;
}

// 문자열 목록으로 하이라이트 (겹침 최소화, 간단 매칭)
function highlightHtmlByStrings(text: string, items: string[]) {
  if (!text || !items?.length) return escapeHtml(text);

  // 중복 제거 + 공백 정리 + 긴 문자열 우선
  const needles = [
    ...new Set(items.map((s) => s?.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  let out = escapeHtml(text);
  for (const n of needles) {
    const esc = escapeRegExp(n);
    // 전역(g) 치환 — 이미 <b>로 감싼 내부까지 다시 감싸지 않도록 escapeHtml 이후에 처리
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
