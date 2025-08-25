import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  issueToken(accessCode: string) {
    if (accessCode !== process.env.ACCESS_CODE) {
      throw new UnauthorizedException('invalid access code');
    }
    const payload = {
      sub: 'demo-user',
      role: 'demo',
      iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });
    return token;
  }

  verifyToken(token: string) {
    return jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;
  }
}
