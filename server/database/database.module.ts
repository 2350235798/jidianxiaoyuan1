import { Provider, Global, Module } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// eslint-disable-next-line import/no-extraneous-dependencies
import postgres from 'postgres';
import * as schema from './schema-standalone';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      useFactory: (): PostgresJsDatabase<typeof schema> => {
        const databaseUrl = process.env.DATABASE_URL
          || process.env.FORCE_DB_CONNECT_URL;
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is required');
        }
        const queryClient = postgres(databaseUrl, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        });
        return drizzle(queryClient, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}

export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
