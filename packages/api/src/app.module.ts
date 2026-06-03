import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './common/database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { DealsModule } from './modules/deals/deals.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    LoggerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            config.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
        },
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),

    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
        defaultJobOptions: {
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      }),
      inject: [ConfigService],
    }),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),

    DatabaseModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    ContactsModule,
    CompaniesModule,
    DealsModule,
    TasksModule,
    BillingModule,
  ],
})
export class AppModule {}
