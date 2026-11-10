import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { listHoldings } from '../../db/holdings';
import { loadSnapshot, refreshMarket } from '../../invest/refresh';
import type { Cents } from '../../lib/money';
import { useDb } from '../../lib/db-context';
import { loadInvestSettings, saveInvestSettings, type InvestSettings } from './settings';
import { buildInvestView, type InvestView } from './view';

/** forceAmount: valor a investir só para esta tela (ex.: um ganho recém-recebido), sem mexer nos ajustes salvos. */
export function useInvest(forceAmount?: Cents) {
  const db = useDb();
  const [settings, setSettings] = useState<InvestSettings | null>(null);
  const [view, setView] = useState<InvestView | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const rebuild = useCallback(async () => {
    const loaded = await loadInvestSettings(db);
    const s = forceAmount === undefined ? loaded : { ...loaded, amountOverride: forceAmount };
    const next = buildInvestView({
      settings: s,
      snapshot: await loadSnapshot(db, new Date()),
      holdings: await listHoldings(db),
    });
    if (alive.current) {
      setSettings(s);
      setView(next);
    }
  }, [db, forceAmount]);

  const refresh = useCallback(
    async (force = false) => {
      setRefreshing(true);
      try {
        await refreshMarket(db, fetch, new Date(), force);
      } catch {
        // Sem rede: segue com o cache.
      }
      if (alive.current) setRefreshing(false);
      await rebuild();
    },
    [db, rebuild],
  );

  const update = useCallback(
    async (patch: Partial<InvestSettings>) => {
      await saveInvestSettings(db, patch);
      await rebuild();
    },
    [db, rebuild],
  );

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void rebuild().then(() => refresh(false));
      return () => {
        alive.current = false;
      };
    }, [rebuild, refresh]),
  );

  return { settings, view, refreshing, refresh, update };
}
