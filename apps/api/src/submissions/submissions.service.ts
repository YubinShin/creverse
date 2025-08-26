import {
  normalizeRelative,
  safeDateEnd,
  safeDateStart,
} from '@app/common/utils';
import { PrismaService } from '@app/prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
// import { Prisma } from '@prisma/client';
import * as fs from 'fs-extra';
import { join } from 'path';

import { PublisherService } from '../publisher/publisher.service';
import { CreateSubmissionDto, ListQueryDto } from './dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: PublisherService,
  ) {}

  async create(
    dto: CreateSubmissionDto,
    filePath: string | undefined,
    traceId?: string,
  ) {
    // 학생 존재 확인
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new BadRequestException('invalid studentId');

    // 파일 경로 정규화
    const relPath = filePath ? normalizeRelative(filePath) : undefined;

    // 1) DB 생성 (PENDING + 로그)
    const submission = await this.prisma.submission.create({
      data: {
        studentId: dto.studentId,
        componentType: dto.componentType,
        submitText: dto.submitText,
        status: 'PENDING',
        ...(relPath ? { videoPath: relPath } : {}),
        logs: {
          create: [
            {
              phase: 'api',
              uri: '/api/v1/submissions',
              status: 'ok',
              traceId,
              message: 'created',
            },
          ],
        },
      },
    });

    // 2) 큐 발행 시도
    try {
      await this.publisher.enqueueProcess({
        submissionId: submission.id,
        traceId,
        filePath,
      });
      // 큐 발행 로그 추가
      await this.prisma.submissionLog.create({
        data: {
          submissionId: submission.id,
          phase: 'api',
          uri: '/api/v1/submissions',
          status: 'ok',
          traceId,
          message: 'enqueued',
        },
      });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);

      // 실패 시 로그 + 상태/에러 업데이트
      await this.prisma.$transaction([
        this.prisma.submissionLog.create({
          data: {
            submissionId: submission.id,
            phase: 'api',
            uri: '/api/v1/submissions',
            status: 'failed',
            traceId,
            message,
          },
        }),
        this.prisma.submission.update({
          where: { id: submission.id },
          data: { status: 'FAILED', lastError: 'enqueue failed' },
        }),
      ]);
      // 필요시 throw 대신 ok 래핑 맞추려면 컨트롤러에서 표준 응답으로 변환
      throw err;
    }

    return submission;
  }

  async list(q: ListQueryDto) {
    const page = q.page ?? 1;
    const size = q.size ?? 10;
    const skip = (page - 1) * size;

    const where: Prisma.SubmissionWhereInput = {
      status: q.status ?? undefined,
      createdAt: {
        gte: q.from ? safeDateStart(q.from) : undefined,
        lte: q.to ? safeDateEnd(q.to) : undefined,
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        orderBy: { [q.sort ?? 'createdAt']: q.order ?? 'desc' },
        skip,
        take: size,
        include: { student: true },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, size };
  }

  async get(id: number) {
    const data = await this.prisma.submission.findUnique({
      where: { id },
      include: { logs: true, revisions: true, student: true },
    });
    if (!data) throw new NotFoundException('submission not found');
    return data;
  }

  /** 업로드 경로 보장 (비동기) */
  async ensureUploadDir() {
    const dir = join(process.cwd(), 'uploads', 'tmp');
    await fs.ensureDir(dir);
    return dir;
  }
}
