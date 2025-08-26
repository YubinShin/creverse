import { HttpResponseTransformFilter } from '@app/common/filters/http-response-transform.filter';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import { join } from 'path';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['x-trace-id'],
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // traceId 주입
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.traceId = req.traceId ?? uuidv4();
    res.setHeader('x-trace-id', req.traceId);
    next();
  });

  // pino-http
  const rootLogger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
    base: undefined,
  });
  app.use(
    pinoHttp({
      logger: rootLogger,
      genReqId: (req) => (req as Request).traceId ?? uuidv4(),
      customProps: (req) => ({ traceId: (req as Request).traceId }),
      customLogLevel: (_req, res, err) =>
        res.statusCode >= 500 || err
          ? 'error'
          : res.statusCode >= 400
            ? 'warn'
            : 'info',
      autoLogging: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpResponseTransformFilter());

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI });

  app.use('/public', express.static(join(process.cwd(), 'public')));

  const config = new DocumentBuilder()
    .setTitle('Creverse Work')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: false,
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap();
