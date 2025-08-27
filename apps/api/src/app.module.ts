import {
  AppConfigModule,
  HttpResponseTransformFilter,
  TraceInterceptor,
} from '@app/common';
import { LoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { PublisherModule } from './publisher/publisher.module';
import { StudentsModule } from './students/students.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    StudentsModule,
    SubmissionsModule,
    PublisherModule,
    LoggerModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpResponseTransformFilter,
    },
    { provide: APP_INTERCEPTOR, useClass: TraceInterceptor },
  ],
})
export class AppModule {}
