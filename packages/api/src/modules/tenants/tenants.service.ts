import { Injectable, Logger } from '@nestjs/common';

import { TRIAL_PERIOD_DAYS } from '@crm/shared';

import { PrismaService } from '../../common/database/prisma.service.js';
import { EmailService } from '../../common/email/email.service.js';

interface ProvisionTenantInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  companyName: string;
}

const DEFAULT_PIPELINE_STAGES = [
  { name: 'Lead', position: '1', probability: 10, color: '#94a3b8' },
  { name: 'Qualified', position: '2', probability: 25, color: '#60a5fa' },
  { name: 'Proposal', position: '3', probability: 50, color: '#a78bfa' },
  { name: 'Negotiation', position: '4', probability: 75, color: '#fb923c' },
  { name: 'Closed Won', position: '5', probability: 100, color: '#4ade80', isWon: true },
  { name: 'Closed Lost', position: '6', probability: 0, color: '#f87171', isLost: true },
];

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Atomically provisions a new tenant with a user and default workspace data.
   * Everything inside the transaction is rolled back on any failure.
   */
  async provisionNewTenant(input: ProvisionTenantInput) {
    const slug = await this.generateUniqueSlug(input.companyName);
    const trialEndsAt = new Date(Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.prisma.client.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: input.companyName,
          plan: 'starter',
          status: 'trial',
          trialEndsAt,
        },
      });

      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
          acceptedAt: new Date(),
        },
      });

      const pipeline = await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: 'Sales Pipeline',
          isDefault: true,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((s) => ({
          pipelineId: pipeline.id,
          tenantId: tenant.id,
          name: s.name,
          position: s.position,
          probability: s.probability,
          color: s.color,
          isWon: s.isWon ?? false,
          isLost: s.isLost ?? false,
        })),
      });

      return { user, tenant, membership };
    });

    this.email
      .sendWelcomeEmail(result.user.email, result.user.firstName ?? 'there', slug)
      .catch((err) => this.logger.warn('Welcome email failed', err));

    this.logger.log(`Provisioned tenant: ${slug} for ${input.email}`);

    return result;
  }

  async getTenantBySlug(slug: string) {
    return this.prisma.client.tenant.findUnique({ where: { slug } });
  }

  async getTenantById(id: string) {
    return this.prisma.client.tenant.findUnique({ where: { id } });
  }

  private async generateUniqueSlug(companyName: string): Promise<string> {
    const base = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);

    const existing = await this.prisma.client.tenant.findUnique({ where: { slug: base } });
    if (!existing) return base;

    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }
}
