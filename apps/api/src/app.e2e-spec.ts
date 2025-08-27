import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'http';
import request from 'supertest';

import { prisma } from '../../../test/setup';
import { AppModule } from './app.module';

describe('App E2E', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer() as unknown as Server; // ✅ 타입 단언 한 번만

    // 학생 테이블 클린업
    await prisma.student.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  // it(`/GET health`, async () => {
  //   const res = await request(server).get('/health').expect(200);

  //   expect(res.body).toEqual(
  //     expect.objectContaining({
  //       status: 'ok',
  //     }),
  //   );
  // });

  it('학생 생성 후 조회', async () => {
    const student = await prisma.student.create({
      data: { name: '홍길동' },
    });

    const res = await request(server)
      .get(`/api/v1/students/${student.id}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', student.id);
    expect(res.body).toHaveProperty('name', '홍길동');
  });

  it('잘못된 ID 조회 시 404 반환', async () => {
    await request(server).get('/api/v1/students/999999').expect(404);
  });
});
