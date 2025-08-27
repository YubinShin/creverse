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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
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
  @ApiOperation({
    summary: '과제 제출',
    description:
      '학생이 에세이 과제를 제출합니다. 영상 파일(MP4)과 텍스트를 업로드할 수 있으며, 제출 직후 BullMQ Job이 발행되어 워커가 처리합니다.',
  })
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
            `${stamp}-${Math.round(Math.random() * 1e9)}${extname(
              file.originalname,
            )}`,
          );
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request & { traceId?: string },
  ) {
    const saved = await this.svc.create(dto, file?.path, req.traceId);
    return { result: 'ok', message: null, data: { submissionId: saved.id } };
  }

  @Get()
  @ApiOperation({
    summary: '제출 결과 목록 조회',
    description:
      '제출된 과제 목록을 조회합니다. 상태 필터, 페이지네이션, 정렬, 검색(studentId, studentName) 기능을 지원합니다.',
  })
  async list(@Query() q: ListQueryDto) {
    const data = await this.svc.list(q);
    return { result: 'ok', message: null, data };
  }

  @Get(':id')
  @ApiOperation({
    summary: '제출 결과 상세 조회',
    description: '특정 제출물의 상세 평가 결과를 조회합니다.',
  })
  async get(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.get(id);
    return { result: 'ok', message: null, data };
  }
}
