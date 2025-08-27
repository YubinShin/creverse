import { normalizeRelative, safeDateEnd, safeDateStart } from '@app/common';
import { PrismaService } from '@app/prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /** 제출 생성 */
  async create(dto: CreateSubmissionDto, filePath?: string, traceId?: string) {
    // 1. 학생 존재 확인
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new BadRequestException('invalid studentId');

    // 2. 제출 생성 + 최초 로그
    const mediaCreates: Prisma.SubmissionMediaCreateWithoutSubmissionInput[] =
      [];

    if (filePath) {
      mediaCreates.push(
        {
          mediaType: 'VIDEO',
          localPath: normalizeRelative(filePath),
          blobUrl: null,
        },
        {
          mediaType: 'AUDIO',
          localPath: null, // 워커에서 추출 후 업데이트 예정
          blobUrl: null,
        },
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        studentId: dto.studentId,
        componentType: dto.componentType,
        submitText: dto.submitText,
        status: 'PENDING',
        ...(mediaCreates.length > 0 && {
          media: {
            create: mediaCreates,
          },
        }),
        logs: {
          create: {
            phase: 'create',
            status: 'ok',
            traceId,
            message: 'submission created',
            uri: '/v1/submissions',
          },
        },
      },
      include: {
        media: true,
        logs: true,
      },
    });

    // 3. 큐 발행 시도
    try {
      await this.publisher.enqueueProcessJob({
        submissionId: submission.id,
        traceId,
        filePath,
      });

      await this.prisma.submissionLog.create({
        data: {
          submissionId: submission.id,
          phase: 'enqueue',
          status: 'ok',
          traceId,
          message: 'enqueued',
          uri: '/v1/submissions',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await this.prisma.$transaction([
        this.prisma.submissionLog.create({
          data: {
            submissionId: submission.id,
            phase: 'enqueue',
            status: 'failed',
            traceId,
            message,
          },
        }),
        this.prisma.submission.update({
          where: { id: submission.id },
          data: { status: 'FAILED', lastError: message }, // lastError는 스키마에서 제거했으므로 삭제
        }),
      ]);

      throw err;
    }

    return submission;
  }

  /** 제출 목록 */
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
        include: {
          student: true,
          media: true,
          logs: true,
          revisions: true,
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, size };
  }

  /** 제출 단건 조회 */
  async get(id: number) {
    const data = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        student: true,
        media: true,
        logs: true,
        revisions: true,
      },
    });
    if (!data) throw new NotFoundException('submission not found');
    return data;
  }

  /** 업로드 디렉토리 보장 */
  async ensureUploadDir() {
    const dir = join(process.cwd(), 'uploads', 'tmp');
    await fs.ensureDir(dir);
    return dir;
  }
}
