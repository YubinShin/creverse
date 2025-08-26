/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  // 1) 학생 2명 upsert
  const alice = await prisma.student.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Alice' },
  });

  const bob = await prisma.student.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Bob' },
  });

  // 2) 제출 2건 (PENDING) 생성
  const s1 = await prisma.submission.create({
    data: {
      studentId: alice.id,
      componentType: 'Essay',
      submitText: 'Hello, this is Alice submission.',
      status: 'PENDING',
      logs: {
        create: [
          {
            phase: 'api',
            uri: '/v1/submissions',
            status: 'ok',
            message: 'seeded',
          },
        ],
      },
    },
    include: { logs: true },
  });

  const s2 = await prisma.submission.create({
    data: {
      studentId: bob.id,
      componentType: 'Video',
      submitText: 'Bob submitted a video assignment.',
      status: 'PENDING',
      logs: {
        create: [
          {
            phase: 'api',
            uri: '/v1/submissions',
            status: 'ok',
            message: 'seeded',
          },
        ],
      },
    },
    include: { logs: true },
  });

  // 3) Demo JWT 생성 (과제 테스트용)
  const secret = process.env.JWT_SECRET ?? 'supersecret';
  const token = sign(
    {
      sub: 'demo-user',
      role: 'demo',
      note: 'seed-demo',
    },
    secret,
    { expiresIn: '7d', algorithm: 'HS256' },
  );

  // 4) 콘솔 출력

  console.log('✅ Seed complete.');

  console.log('Students:', { alice: alice.id, bob: bob.id });

  console.log('Submissions:', { s1: s1.id, s2: s2.id });

  console.log('Demo JWT:', token);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
