import { SetMetadata } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { type Permission, type RequestUser } from '@crm/shared';

import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard.js';
import { PERMISSIONS_KEY } from '../guards/permissions.guard.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user.tenantId;
  },
);
