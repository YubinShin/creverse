import { LoggerService } from '@app/logger';
import { PrismaService } from '@app/prisma';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../apps/api/src/app.module'; // 실제 앱 모듈 경로 맞춰줘

let app: INestApplication;
let prisma: PrismaService;
let logger: LoggerService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  prisma = moduleRef.get(PrismaService);
  logger = moduleRef.get(LoggerService);

  await app.init();

  // DB 초기화 (seed 데이터 넣어도 됨)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Submission" CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Student" CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

export { app, logger, prisma };
