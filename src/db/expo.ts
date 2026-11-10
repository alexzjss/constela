import * as SQLite from 'expo-sqlite';
import type { Db } from './db';

export async function openExpoDb(name = 'paralelo.db'): Promise<Db> {
  const d = await SQLite.openDatabaseAsync(name);
  return {
    async run(sql, params = []) {
      await d.runAsync(sql, params as SQLite.SQLiteBindValue[]);
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return d.getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
    },
  };
}
