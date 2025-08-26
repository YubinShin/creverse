import { AiService } from '@app/ai';
import {
  cropVideo,
  detectLeftBoundaryX,
  extractMp3,
  getVideoSize,
  safeCropRect,
} from '@app/common/media/video.util';
import { notifyOnFailure } from '@app/common/utils/notify.util';
import { PrismaService } from '@app/prisma';
import { AzureStorage } from '@app/storage'; // 예: libs/storage/src/azure.util.ts에서 export
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
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
      const sub = await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'PROCESSING' },
        select: { id: true, componentType: true, submitText: true },
      });

      // 1) 영상 크롭 + 오디오 추출
      if (!filePath) throw new Error('missing input video path');

      const outMp4 = `${filePath}.cropped.mp4`;
      const outMp3 = `${filePath}.audio.mp3`;

      const { width, height } = await getVideoSize(filePath);
      const detectedX = await detectLeftBoundaryX(filePath, {
        blurSigma: 2.0,
      }).catch(() => null);
      const fallbackX = Math.floor(width * 0.17);
      const maxX = Math.floor(width * 0.7);
      const x = Math.min(detectedX ?? fallbackX, maxX);

      const rawRect = { x, y: 0, w: Math.max(1, width - x), h: height };
      const rect = safeCropRect(rawRect, width, height);

      console.log('[worker] input=', width, 'x', height, 'rect=', rect);

      await cropVideo(filePath, outMp4, rect);
      await extractMp3(filePath, outMp3);

      // // 2) Azure Blob 업로드(Private) + SAS URL 발급
      // let mp4Url: string, mp3Url: string;
      // try {
      //   console.log('[phase] azure-upload start');
      //   mp4Url = await this.storage.uploadFileAndGetSas(
      //     `submissions/${submissionId}/video.mp4`,
      //     outMp4,
      //     'video/mp4',
      //     60,
      //   );
      //   mp3Url = await this.storage.uploadFileAndGetSas(
      //     `submissions/${submissionId}/audio.mp3`,
      //     outMp3,
      //     'audio/mpeg',
      //     60,
      //   );
      //   console.log('[phase] azure-upload ok', { mp4Url, mp3Url });
      // } catch (e) {
      //   const msg = e instanceof Error ? e.message : String(e);
      //   console.error('[phase] azure-upload failed:', msg);
      //   await log('failed', `azure-upload: ${msg}`);
      //   throw e;
      // }
      //
      // // 2.1) SAS URL 가볍게 HEAD/GET으로 점검 (네트워크 404 확인)
      // try {
      //   console.log('[phase] sas-verify start');
      //   const [v1, v2] = await Promise.all([
      //     fetchHead(mp4Url),
      //     fetchHead(mp3Url),
      //   ]);
      //   console.log('[phase] sas-verify ok', v1, v2);
      // } catch (e) {
      //   const msg = e instanceof Error ? e.message : String(e);
      //   console.error('[phase] sas-verify failed:', msg);
      //   await log('failed', `sas-verify: ${msg}`);
      //   throw e;
      // }
      //
      // // 3) AI 평가 호출
      // let ai: { score: number; feedback: string; highlights: any[] };
      // try {
      //   console.log('[phase] ai-evaluate start');
      //   ai = await this.ai.evaluate({
      //     submitText: sub.submitText ?? '',
      //     componentType: sub.componentType,
      //     // videoUrl: mp4Url, // ← 추가
      //     // audioUrl: mp3Url, // ← 추가
      //   });
      //   console.log('[phase] ai-evaluate ok');
      // } catch (e) {
      //   const err = e as any;
      //   // axios 류 에러면 응답 본문까지 찍어 문제를 바로 확인
      //   console.error(
      //     '[phase] ai-evaluate failed:',
      //     err?.response?.status,
      //     err?.response?.statusText,
      //     err?.response?.data ?? err?.message ?? err,
      //   );
      //   await log(
      //     'failed',
      //     `ai-evaluate: ${err?.response?.status} ${err?.response?.statusText}`,
      //   );
      //   throw e;
      // }
      //
      // // const highlighted = highlightHtml(sub.submitText ?? '', ai.highlights);
      //
      // // 4) DB 저장
      // try {
      //   console.log('[phase] db-update start');
      //   await this.prisma.submission.update({
      //     where: { id: submissionId },
      //     data: {
      //       status: 'COMPLETED',
      //       videoUrl: mp4Url,
      //       audioUrl: mp3Url,
      //       audioPath: outMp3,
      //       score: Math.max(0, Math.min(10, Math.floor(ai.score))), // 0~10 정수 보정
      //       feedback: ai.feedback?.slice(0, 2000) ?? null,
      //       highlights: ai.highlights as unknown as Prisma.InputJsonValue, // string[]
      //       highlightSubmitText: highlightHtmlByStrings(
      //         sub.submitText ?? '',
      //         ai.highlights,
      //       ), // ← 여기만 교체
      //       apiLatency: Date.now() - started,
      //       lastError: null,
      //     },
      //   });
      //
      //   console.log('[phase] db-update ok');
      // } catch (e) {
      //   const msg = e instanceof Error ? e.message : String(e);
      //   console.error('[phase] db-update failed:', msg);
      //   await log('failed', `db-update: ${msg}`);
      //   throw e;
      // }
      //
      // await log('ok', `completed in ${Date.now() - started}ms`);
      // console.log('[worker] done', job.id);
      // return { ok: true, jobId: job.id };
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
