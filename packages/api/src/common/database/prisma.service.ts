import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

import { PrismaClient } from '@crm/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Execute a callback within a transaction that sets the RLS tenant context.
   * MUST be called for every database operation that touches tenant data.
   */
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`,
      );
      return fn(tx as unknown as PrismaClient);
    });
  }

  get client(): PrismaClient {
    return this.prisma;
  }
}
