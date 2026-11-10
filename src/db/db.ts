/** Interface mínima do banco: expo-sqlite no aparelho, better-sqlite3 nos testes. */
export interface Db {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
}
