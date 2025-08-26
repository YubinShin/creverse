import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class ListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number = 10;

  @ApiPropertyOptional({ enum: ['createdAt', 'id'], example: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'id'])
  sort?: 'createdAt' | 'id' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: '2025-08-01' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2025-08-31' })
  @IsOptional()
  to?: string;
}
