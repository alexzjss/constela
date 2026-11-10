import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { listHoldingMoves, listHoldings } from '../../db/ledger';
import type { Holding, HoldingMove } from '../../domain/types';
import { loadIndexes, type Indexes } from '../../invest/history';
import type { MarketSnapshot } from '../../invest/refresh';
import { todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';
import { buildHoldingsView } from './holdingsView';

/** Posições, movimentos e rendimento. As séries do Banco Central chegam depois, sem travar a tela. */
export function useHoldings(snapshot: MarketSnapshot | null) {
  const db = useDb();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [moves, setMoves] = useState<HoldingMove[]>([]);
  const [idx, setIdx] = useState<Indexes | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const hs = await listHoldings(db);
    const ms = await listHoldingMoves(db);
    if (!alive.current) return;
    setHoldings(hs);
    setMoves(ms);
    const first = ms.reduce<string | null>((m, x) => (m === null || x.date < m ? x.date : m), null);
    if (!first) return;
    try {
      const loaded = await loadIndexes(db, fetch, new Date(), first, todayLocal());
      if (alive.current) setIdx(loaded);
    } catch {
      // sem rede e sem cache: segue com a estimativa
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void reload();
      return () => {
        alive.current = false;
      };
    }, [reload]),
  );

  const view = useMemo(
    () => buildHoldingsView(holdings, moves, idx, snapshot ?? {}, todayLocal()),
    [holdings, moves, idx, snapshot],
  );
  return { view, reload };
}
