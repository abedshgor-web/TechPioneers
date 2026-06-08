export type TenantStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';
export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanFeatures {
  maxSeats: number;
  maxContacts: number;
  maxDeals: number;
  maxPipelines: number;
  maxCustomFields: number;
  maxWorkflows: number;
  apiAccess: boolean;
  apiRateLimitPerMinute: number;
  aiFeatures: boolean;
  advancedReporting: boolean;
  customRoles: boolean;
  ssoSaml: boolean;
  auditLogs: boolean;
  dataExport: boolean;
  storageGb: number;
  webhooks: boolean;
  emailSequences: boolean;
  revenueForecasting: boolean;
  dedicatedCsm: boolean;
  uptimeSla: number | null;
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  starter: {
    maxSeats: 5,
    maxContacts: 5_000,
    maxDeals: 1_000,
    maxPipelines: 3,
    maxCustomFields: 10,
    maxWorkflows: 0,
    apiAccess: false,
    apiRateLimitPerMinute: 0,
    aiFeatures: false,
    advancedReporting: false,
    customRoles: false,
    ssoSaml: false,
    auditLogs: false,
    dataExport: true,
    storageGb: 5,
    webhooks: false,
    emailSequences: false,
    revenueForecasting: false,
    dedicatedCsm: false,
    uptimeSla: null,
  },
  professional: {
    maxSeats: 25,
    maxContacts: 50_000,
    maxDeals: Infinity,
    maxPipelines: Infinity,
    maxCustomFields: Infinity,
    maxWorkflows: 25,
    apiAccess: false,
    apiRateLimitPerMinute: 0,
    aiFeatures: true,
    advancedReporting: true,
    customRoles: true,
    ssoSaml: false,
    auditLogs: true,
    dataExport: true,
    storageGb: 50,
    webhooks: true,
    emailSequences: true,
    revenueForecasting: true,
    dedicatedCsm: false,
    uptimeSla: null,
  },
  enterprise: {
    maxSeats: Infinity,
    maxContacts: Infinity,
    maxDeals: Infinity,
    maxPipelines: Infinity,
    maxCustomFields: Infinity,
    maxWorkflows: Infinity,
    apiAccess: true,
    apiRateLimitPerMinute: 10_000,
    aiFeatures: true,
    advancedReporting: true,
    customRoles: true,
    ssoSaml: true,
    auditLogs: true,
    dataExport: true,
    storageGb: Infinity,
    webhooks: true,
    emailSequences: true,
    revenueForecasting: true,
    dedicatedCsm: true,
    uptimeSla: 99.9,
  },
};

export const PLAN_PRICING: Record<PlanTier, { monthly: number; annual: number }> = {
  starter: { monthly: 18, annual: 15 },
  professional: { monthly: 42, annual: 35 },
  enterprise: { monthly: 89, annual: 74 },
};

export const TRIAL_PERIOD_DAYS = 14;
export const PAST_DUE_GRACE_PERIOD_HOURS = 24;
