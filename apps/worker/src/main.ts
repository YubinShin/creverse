import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const shutdown = () => {
    // 비동기 종료를 명시적으로 처리해서 Promise를 리스너에 넘기지 않음
    app
      .close()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Shutdown error:', err);
        process.exit(1);
      });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void bootstrap();
