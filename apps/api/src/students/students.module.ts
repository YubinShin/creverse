import { Module } from '@nestjs/common';

import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
