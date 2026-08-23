import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppError } from '../../core/errors/app-error';
import type { AuthUser } from '../decorators/current-user.decorator';
import { TokenService } from '../services/token.service';
import { UserRepositoryService } from '../services/user-repository.service';

export interface JwtPayload {
  sub: string;
  isGuest: boolean;
  jti: string;
  exp: number; // seconds since epoch, set by JWT library
  iat: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly users: UserRepositoryService,
    private readonly tokens: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Reject if this specific token was revoked on logout
    const isRevoked = await this.tokens.isAccessTokenRevoked(payload.jti);
    if (isRevoked) {
      throw new AppError('TOKEN_INVALID', 'Access token has been revoked');
    }

    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new AppError(
        'TOKEN_INVALID',
        'Token subject does not match any user',
      );
    }

    return {
      id: user.id,
      kind: user.kind,
      jti: payload.jti,
      tokenExpiresAt: new Date(payload.exp * 1000),
    };
  }
}
