import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  studentId!: number;

  @ApiProperty({ example: 'Essay' })
  @IsString()
  @MinLength(1)
  componentType!: string;

  @ApiProperty({ example: 'My answer...' })
  @IsString()
  @MinLength(1)
  submitText!: string;

  @ApiPropertyOptional({
    description: '업로드 파일 필드명: videoFile',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  videoFile?: any;
}
