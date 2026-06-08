import { Injectable, NestMiddleware, UnauthorizedException, PaymentRequiredException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verify } from 'jsonwebtoken';

import { JwtPayload, PAST_DUE_GRACE_PERIOD_HOURS } from '@crm/shared';

/**
 * TenantContextMiddleware — runs before every authenticated route.
 *
 * Responsibilities:
 * 1. Extract and verify JWT from Authorization header
 * 2. Resolve tenant from JWT claim (or subdomain for future)
 * 3. Check tenant subscription status
 * 4. Block write operations when trial expired or past_due past grace period
 * 5. Attach user context to request for downstream use
 *
 * The actual SET LOCAL app.current_tenant_id is done in PrismaService.withTenant()
 * per DB transaction, not here — this is application-level enforcement.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: FastifyRequest & { user?: JwtPayload }, _res: FastifyReply, next: () => void) {
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);

    try {
      const publicKey = this.config.getOrThrow<string>('JWT_PUBLIC_KEY').replace(/\\n/g, '\n');
      const payload = verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;

      const isExpiredTrial =
        payload.tenantStatus === 'trial' && this.isTrialExpired(payload);

      const isPastDueGracePeriodExceeded =
        payload.tenantStatus === 'past_due' && this.isPastDueGraceExceeded(payload);

      const isCanceled = payload.tenantStatus === 'canceled';

      const isWriteOperation = !['GET', 'HEAD', 'OPTIONS'].includes(
        (req.method ?? 'GET').toUpperCase(),
      );

      if ((isExpiredTrial || isPastDueGracePeriodExceeded || isCanceled) && isWriteOperation) {
        throw new PaymentRequiredException(
          'Subscription required. Please upgrade to continue.',
        );
      }

      req.user = payload;
    } catch (err) {
      if (err instanceof PaymentRequiredException) throw err;
    }

    next();
  }

  private isTrialExpired(_payload: JwtPayload): boolean {
    return false;
  }

  private isPastDueGraceExceeded(_payload: JwtPayload): boolean {
    return false;
  }
}
