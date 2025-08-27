import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('token')
  @ApiOperation({
    summary: '테스트용 JWT 토큰 발급',
    description:
      '과제 실행 및 테스트를 위해 임시 토큰을 발급합니다. 실제 인증 로직은 포함되지 않습니다.',
  })
  issue(@Body() body: TokenRequestDto) {
    const token = this.auth.issueToken(body.accessCode);
    return { result: 'ok', message: null, data: { token } };
  }
}
