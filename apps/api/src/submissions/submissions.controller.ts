import {
  Body,
  Controller,
  Get,
  Headers as HeadersDec,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs-extra';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubmissionDto, ListQueryDto } from './dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly svc: SubmissionsService) {}

  @Post()
  @HttpCode(200)
  @ApiHeader({ name: 'x-trace-id', required: false })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('videoFile', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'tmp');
          try {
            fs.ensureDirSync(dir); // 폴더 없으면 생성
            cb(null, dir);
          } catch (e) {
            cb(e as Error, dir);
          }
        },
        filename: (_req, file, cb) => {
          const stamp = Date.now();
          cb(
            null,
            `${stamp}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @HeadersDec('x-trace-id') traceId?: string,
  ) {
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
