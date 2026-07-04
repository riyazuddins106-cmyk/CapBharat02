import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import * as schema from '../database/schema/index.js';

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  ssl: 'require',
});

export const db = drizzle(client, { schema });
