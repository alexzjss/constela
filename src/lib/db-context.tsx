import React, { createContext, useContext } from 'react';
import type { Db } from '../db/db';

const DbContext = createContext<Db | null>(null);

export function DbProvider({ db, children }: { db: Db; children: React.ReactNode }) {
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb fora do DbProvider');
  return db;
}
