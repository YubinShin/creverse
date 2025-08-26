import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TokenRequestDto {
  @ApiProperty({ example: 'letmein' })
  @IsString()
  accessCode!: string;
}
