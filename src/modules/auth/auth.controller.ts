import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('token')
  issue(@Body() body: TokenRequestDto) {
    const token = this.auth.issueToken(body.accessCode);
    return { result: 'ok', message: null, data: { token } };
  }
}
