import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authz = req.headers.authorization ?? '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';

    if (!token) {
      throw new UnauthorizedException('missing bearer token');
    }

    try {
      const payload = this.auth.verifyToken(token);
      // @ts-ignore - 필요시 Request 타입에 사용자 필드 추가
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}
