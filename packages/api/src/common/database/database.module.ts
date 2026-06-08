import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaClient } from '@crm/database';

import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: (config: ConfigService) => {
        return new PrismaClient({
          datasources: { db: { url: config.getOrThrow<string>('DATABASE_URL') } },
          log:
            config.get('NODE_ENV') === 'development'
              ? ['query', 'warn', 'error']
              : ['warn', 'error'],
        });
      },
      inject: [ConfigService],
    },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
