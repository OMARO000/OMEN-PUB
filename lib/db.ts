import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';

type OmenDb = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

// Singleton pattern to survive Next.js HMR in development
declare global {
  var __omenDb: OmenDb | undefined;
}

function createDb(): OmenDb {
  const sqlite = new Database(process.env.DATABASE_URL ?? './omen.db');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema }) as OmenDb;
}

export const db: OmenDb = globalThis.__omenDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__omenDb = db;
}
