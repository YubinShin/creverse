import { PrismaService } from '@app/prisma';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { PublisherService } from '../publisher/publisher.service';
import {
  mockStudent,
  mockSubmission,
  mockSubmissionList,
} from './__mocks__/mock';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: DeepMockProxy<PrismaService>;
  let publisher: DeepMockProxy<PublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: PublisherService, useValue: mockDeep<PublisherService>() },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    prisma = module.get(PrismaService);
    publisher = module.get(PublisherService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('학생이 없으면 BadRequestException', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { studentId: 1, componentType: 'ESSAY', submitText: 'hi' },
          'video.mp4',
          'trace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('정상 생성 + 큐 발행', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.submission.create.mockResolvedValue(mockSubmission);
      publisher.enqueueProcessJob.mockResolvedValue({
        status: 'queued',
        submissionId: 123,
        traceId: 'trace-2',
      });

      const result: typeof mockSubmission = await service.create(
        { studentId: 1, componentType: 'ESSAY', submitText: 'hello' },
        'video.mp4',
        'trace-2',
      );

      expect(result.id).toBe(123);
      expect(publisher.enqueueProcessJob).toHaveBeenCalledWith({
        submissionId: 123,
        traceId: 'trace-2',
        filePath: 'video.mp4',
      });

      expect(prisma.submissionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: 123,
            phase: 'create',
            status: 'ok',
            message: 'submission created',
            uri: '/v1/submissions',
          }),
        }),
      );

      expect(prisma.submissionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: 123,
            phase: 'enqueue',
            status: 'ok',
            message: 'enqueued',
            uri: '/v1/submissions',
          }),
        }),
      );
    });

    it('큐 발행 실패 시 submission FAILED 처리', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.submission.create.mockResolvedValue(mockSubmission);
      publisher.enqueueProcessJob.mockRejectedValue(new Error('queue down'));

      await expect(
        service.create(
          { studentId: 1, componentType: 'ESSAY', submitText: 'oops' },
          'video.mp4',
        ),
      ).rejects.toThrow('queue down');

      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: {
          status: 'FAILED',
          lastError: 'queue down',
        },
      });

      expect(prisma.submissionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: 999,
            phase: 'enqueue',
            status: 'failed',
            message: 'queue down',
            uri: '/v1/submissions',
          }),
        }),
      );
    });
  });

  describe('get', () => {
    it('존재하지 않는 제출이면 NotFoundException', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.get(1)).rejects.toThrow(NotFoundException);
    });

    it('제출 찾기 성공', async () => {
      prisma.submission.findUnique.mockResolvedValue(mockSubmission);
      const result: typeof mockSubmission = await service.get(1);
      expect(result).toEqual({ id: 1, studentId: 1 });
    });
  });

  describe('list', () => {
    it('페이지네이션 적용', async () => {
      prisma.submission.findMany.mockResolvedValue(mockSubmissionList);
      prisma.submission.count.mockResolvedValue(1);

      const result: { total: number; items: typeof mockSubmissionList } =
        await service.list({ page: 1, size: 10 });

      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual({ id: 1 });
    });
  });
});
