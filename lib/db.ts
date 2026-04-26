import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';

type OmenDb = PostgresJsDatabase<typeof schema>;

// Singleton pattern to survive Next.js HMR in development
declare global {
  var __omenDb: OmenDb | undefined;
}

function createDb(): OmenDb {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  // prepare: false required for Supabase connection pooler (PgBouncer transaction mode)
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export const db: OmenDb = globalThis.__omenDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__omenDb = db;
}
