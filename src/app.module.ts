import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { PublisherModule } from './publisher/publisher.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    SubmissionsModule,
    PublisherModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
