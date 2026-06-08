import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { SignOptions } from 'jsonwebtoken';

import { PlanTier, TRIAL_PERIOD_DAYS, type JwtPayload } from '@crm/shared';

import { PrismaService } from '../../common/database/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { EmailService } from '../../common/email/email.service.js';
import { TenantsService } from '../tenants/tenants.service.js';

import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const BCRYPT_ROUNDS = 12;
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const EMAIL_VERIFY_TOKEN_EXPIRY = 24 * 60 * 60;
const PASSWORD_RESET_TOKEN_EXPIRY = 60 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly tenants: TenantsService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { user, tenant, membership } = await this.tenants.provisionNewTenant({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      companyName: dto.companyName,
    });

    const verifyToken = this.generateSecureToken();
    await this.prisma.client.emailVerification.create({
      data: {
        userId: user.id,
        token: await bcrypt.hash(verifyToken, 10),
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TOKEN_EXPIRY * 1000),
      },
    });

    await this.email.sendVerificationEmail(user.email, verifyToken, user.firstName ?? 'there');

    const tokens = await this.generateTokenPair(user.id, tenant.id, 'owner', tenant.plan as PlanTier, tenant.status as string);

    this.logger.log(`New tenant registered: ${tenant.slug} (${user.email})`);

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, plan: tenant.plan },
      ...tokens,
    };
  }

  async login(dto: LoginDto, ip: string) {
    const rateLimitKey = `auth:login:${ip}`;
    const attempts = await this.redis.incrWithExpiry(rateLimitKey, LOGIN_RATE_LIMIT_WINDOW);

    if (attempts > LOGIN_MAX_ATTEMPTS) {
      throw new UnauthorizedException(
        `Too many login attempts. Try again in ${LOGIN_RATE_LIMIT_WINDOW / 60} minutes.`,
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
        memberships: {
          select: {
            tenantId: true,
            role: true,
            tenant: { select: { id: true, slug: true, name: true, plan: true, status: true } },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.redis.del(rateLimitKey);

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No workspace found for this account');
    }

    const tokens = await this.generateTokenPair(
      user.id,
      membership.tenantId,
      membership.role,
      membership.tenant.plan as PlanTier,
      membership.tenant.status,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: !!user.emailVerifiedAt,
      },
      tenant: membership.tenant,
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const stored = await this.prisma.client.refreshToken.findFirst({
      where: {
        tokenHash: { not: undefined },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true, tenantId: true, familyId: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const membership = await this.prisma.client.tenantMembership.findFirst({
      where: { userId: stored.userId, tenantId: stored.tenantId },
      select: { role: true, tenant: { select: { plan: true, status: true } } },
    });

    if (!membership) throw new UnauthorizedException('Membership not found');

    return this.generateTokenPair(
      stored.userId,
      stored.tenantId,
      membership.role,
      membership.tenant.plan as PlanTier,
      membership.tenant.status,
    );
  }

  async logout(userId: string, tenantId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const verifications = await this.prisma.client.emailVerification.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, token: true, userId: true },
    });

    let matched: (typeof verifications)[0] | undefined;
    for (const v of verifications) {
      if (await bcrypt.compare(token, v.token)) {
        matched = v;
        break;
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.prisma.client.$transaction([
      this.prisma.client.emailVerification.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.client.user.update({
        where: { id: matched.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      select: { id: true, firstName: true },
    });

    if (!user) return;

    await this.prisma.client.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = this.generateSecureToken();
    await this.prisma.client.passwordReset.create({
      data: {
        userId: user.id,
        token: await bcrypt.hash(token, 10),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY * 1000),
      },
    });

    await this.email.sendPasswordResetEmail(email, token, user.firstName ?? 'there');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resets = await this.prisma.client.passwordReset.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, token: true, userId: true },
    });

    let matched: (typeof resets)[0] | undefined;
    for (const r of resets) {
      if (await bcrypt.compare(token, r.token)) {
        matched = r;
        break;
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.client.$transaction([
      this.prisma.client.passwordReset.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.client.user.update({
        where: { id: matched.userId },
        data: { passwordHash },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId: matched.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async generateTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    plan: PlanTier,
    tenantStatus: string,
  ) {
    const jti = this.generateSecureToken(16);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      tid: tenantId,
      email: '',
      role: role as JwtPayload['role'],
      plan,
      tenantStatus: tenantStatus as JwtPayload['tenantStatus'],
      jti,
    };

    const privateKey = this.config.getOrThrow<string>('JWT_PRIVATE_KEY').replace(/\\n/g, '\n');
    const accessTokenExpiry = this.config.get('JWT_ACCESS_TOKEN_EXPIRY', '15m');

    const accessToken = this.jwt.sign(payload as object, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: accessTokenExpiry,
    } as SignOptions);

    const refreshToken = this.generateSecureToken(48);
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const familyId = this.generateSecureToken(16);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tenantId,
        tokenHash: refreshHash,
        familyId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private generateSecureToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }
}
