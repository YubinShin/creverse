import { LoggedHttpService } from '@app/common/http/logged-http.service';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
export type AiEvalResult = {
  score: number;
  feedback: string;
  highlights: string[];
};

const AiEvalSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string(),
  highlights: z.array(z.string()).default([]),
});

function safeParseJson<T>(s: string): { ok: true; data: T } | { ok: false } {
  try {
    return { ok: true as const, data: JSON.parse(s) as T };
  } catch {
    return { ok: false as const };
  }
}
@Injectable()
export class AiService {
  constructor(private readonly loggedHttp: LoggedHttpService) {}

  private readonly apiVersion = process.env.OPENAPI_API_VERSION ?? '2023-05-15';
  private readonly endpoint = process.env.AZURE_ENDPOINT_URL!.replace(
    /\/+$/,
    '',
  );
  private readonly deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;
  private readonly key = process.env.AZURE_ENDPOINT_KEY!;
  private readonly logger = new Logger(AiService.name);

  async evaluate(params: {
    submitText: string;
    componentType: string;
    traceId: string;
  }): Promise<AiEvalResult> {
    const systemPrompt = `
You are a strict grader. Output must be valid JSON only, without any extra explanation.
Do not use markdown code blocks or comments.

Output format:
{"score": number(0-10, integer), "feedback": string, "highlights": string[]}

"highlights" must be non-empty if score < 10.
Language: Korean only.
    `.trim();

    const userPrompt = [
      `componentType: ${params.componentType}`,
      `Student essay: """${params.submitText}"""`,
      'Requirements:',
      '- score: integer from 0 to 10',
      '- feedback: Short paragraph-level comments',
      '- highlights: Penalized sentences or words (array of English strings). Must not be empty if score < 10.',
      'Output ONLY valid JSON that matches this schema: {"score": number, "feedback": string, "highlights": string[]}',
    ].join('\n');
    if (!this.apiVersion.startsWith('2023')) {
      throw new Error(`Unsupported api-version: ${this.apiVersion}`);
    }

    const url = `${this.endpoint}/openai/deployments/${encodeURIComponent(
      this.deployment,
    )}/chat/completions?api-version=${encodeURIComponent(this.apiVersion)}`;

    const body = {
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    const json = await this.loggedHttp.postWithLog<ChatCompletionResponse>(
      url,
      body,
      {
        headers: {
          'api-key': this.key,
          'Content-Type': 'application/json',
        },
      },
      params.traceId,
      'call_openai',
    );
    const rawContent =
      json.choices?.[0]?.message?.content ?? 'fallback response';

    const parsed = this.parseResult(rawContent);

    // 실패 로그 기록
    if (parsed.feedback.includes('기본 평가') || parsed.score === 5) {
      this.logger.warn(`[AI 응답 문제 발생]\n${rawContent}`);
    }

    return parsed;
  }

  private parseResult(raw: string): AiEvalResult {
    const cleaned = this.extractJson(raw);
    const p = safeParseJson(cleaned);

    if (!p.ok) {
      return {
        score: 5,
        feedback: '형식 오류: 기본 평가를 반환합니다.',
        highlights: [],
      };
    }

    const zres = AiEvalSchema.safeParse(p.data);
    if (!zres.success) {
      return {
        score: 5,
        feedback: '스키마 불일치: 기본 평가를 반환합니다.',
        highlights: [],
      };
    }

    const { score, feedback, highlights } = zres.data;

    const finalHighlights =
      score < 10 && highlights.length === 0
        ? this.fillHighlightsFrom(feedback)
        : highlights;

    return {
      score,
      feedback: String(feedback).slice(0, 2000),
      highlights: finalHighlights.slice(0, 10),
    };
  }

  // 코드블럭 제거 + JSON 추출
  private extractJson(raw: string): string {
    const trimmed = raw.trim();

    // ```json ... ``` 제거
    if (trimmed.startsWith('```json')) {
      return trimmed.replace(/```json|```/g, '').trim();
    }

    // {...} 블록만 추출
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }

    return trimmed;
  }

  // fallback highlight 추출기
  private fillHighlightsFrom(text: string): string[] {
    return String(text)
      .split(/(?<=[.!?。！？\n])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
  }
}
