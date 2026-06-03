import type { PlanTier, TenantStatus } from './tenant.types.js';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface JwtPayload {
  sub: string;
  tid: string;
  email: string;
  role: UserRole;
  plan: PlanTier;
  tenantStatus: TenantStatus;
  jti: string;
  iat: number;
  exp: number;
}

export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  plan: PlanTier;
  tenantStatus: TenantStatus;
}

export type Permission =
  | 'contacts:read'
  | 'contacts:write'
  | 'contacts:delete'
  | 'companies:read'
  | 'companies:write'
  | 'companies:delete'
  | 'deals:read'
  | 'deals:write'
  | 'deals:delete'
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:delete'
  | 'notes:read'
  | 'notes:write'
  | 'notes:delete'
  | 'reports:view'
  | 'settings:read'
  | 'settings:manage'
  | 'users:read'
  | 'users:invite'
  | 'users:manage'
  | 'billing:read'
  | 'billing:manage'
  | 'api_keys:read'
  | 'api_keys:manage'
  | 'webhooks:read'
  | 'webhooks:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'contacts:read', 'contacts:write', 'contacts:delete',
    'companies:read', 'companies:write', 'companies:delete',
    'deals:read', 'deals:write', 'deals:delete',
    'tasks:read', 'tasks:write', 'tasks:delete',
    'notes:read', 'notes:write', 'notes:delete',
    'reports:view',
    'settings:read', 'settings:manage',
    'users:read', 'users:invite', 'users:manage',
    'billing:read', 'billing:manage',
    'api_keys:read', 'api_keys:manage',
    'webhooks:read', 'webhooks:manage',
  ],
  admin: [
    'contacts:read', 'contacts:write', 'contacts:delete',
    'companies:read', 'companies:write', 'companies:delete',
    'deals:read', 'deals:write', 'deals:delete',
    'tasks:read', 'tasks:write', 'tasks:delete',
    'notes:read', 'notes:write', 'notes:delete',
    'reports:view',
    'settings:read', 'settings:manage',
    'users:read', 'users:invite', 'users:manage',
    'billing:read',
    'api_keys:read', 'api_keys:manage',
    'webhooks:read', 'webhooks:manage',
  ],
  member: [
    'contacts:read', 'contacts:write',
    'companies:read', 'companies:write',
    'deals:read', 'deals:write',
    'tasks:read', 'tasks:write',
    'notes:read', 'notes:write',
    'reports:view',
    'settings:read',
    'users:read',
  ],
  viewer: [
    'contacts:read',
    'companies:read',
    'deals:read',
    'tasks:read',
    'notes:read',
    'reports:view',
    'settings:read',
    'users:read',
  ],
};
