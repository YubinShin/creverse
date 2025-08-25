import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSubmissionDto, ListQueryDto } from './dto/index';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly svc: SubmissionsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('videoFile', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, join(process.cwd(), 'uploads', 'tmp')),
        filename: (_req, file, cb) => {
          const stamp = Date.now();
          cb(
            null,
            `${stamp}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async create(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // @ts-ignore – traceId는 types/express.d.ts로 확장됨
    const traceId: string | undefined = arguments[2]?.req?.traceId ?? undefined;
    const saved = await this.svc.create(dto, file?.path, traceId);
    return { result: 'ok', message: null, data: { submissionId: saved.id } };
  }

  @Get()
  async list(@Query() q: ListQueryDto) {
    const data = await this.svc.list(q);
    return { result: 'ok', message: null, data };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.get(id);
    return { result: 'ok', message: null, data };
  }
}
