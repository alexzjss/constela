import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { getSetting, listBills, listGoals, listTransactions } from '../../db/repo';
import { loadSnapshot, refreshMarket } from '../../invest/refresh';
import { monthOf, prevMonth, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';
import { loadInvestSettings, saveInvestSettings, type InvestSettings } from './settings';
import { buildInvestView, type InvestView } from './view';

export function useInvest() {
  const db = useDb();
  const [settings, setSettings] = useState<InvestSettings | null>(null);
  const [view, setView] = useState<InvestView | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const rebuild = useCallback(async () => {
    const today = todayLocal();
    const month = monthOf(today);
    let first = month;
    for (let i = 0; i < 3; i++) first = prevMonth(first);
    const s = await loadInvestSettings(db);
    const reserveRaw = await getSetting(db, 'reserveBalance');
    const incomeRaw = Number(await getSetting(db, 'monthlyIncome')) || null;
    const next = buildInvestView({
      settings: s,
      snapshot: await loadSnapshot(db, new Date()),
      txs: await listTransactions(db, `${first}-01`, `${month}-31`),
      bills: await listBills(db),
      goals: await listGoals(db),
      reserve: reserveRaw === null ? null : Number(reserveRaw),
      incomeSetting: incomeRaw,
      today,
    });
    if (alive.current) {
      setSettings(s);
      setView(next);
    }
  }, [db]);

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
