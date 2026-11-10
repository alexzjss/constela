import Database from 'better-sqlite3';
import type { Db } from '../../src/db/db';

export async function memoryDb(): Promise<Db> {
  const d = new Database(':memory:');
  return {
    async run(sql, params = []) {
      d.prepare(sql).run(...(params as never[]));
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return d.prepare(sql).all(...(params as never[])) as T[];
    },
  };
}
