import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { type JwtPayload, type RequestUser } from '@crm/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_PUBLIC_KEY').replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub || !payload.tid) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tid,
      email: payload.email,
      role: payload.role,
      plan: payload.plan,
      tenantStatus: payload.tenantStatus,
    };
  }
}
