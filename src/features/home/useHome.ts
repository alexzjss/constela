import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getSetting, listBills, listTransactions } from '../../db/repo';
import { topAlert, type Alert } from '../../engine/alerts';
import { canSpendToday, expectedMonthlyIncome, type CanSpend } from '../../engine/today';
import { monthSummary, type MonthSummary } from '../../engine/month';
import { provisionalScore, type ProvisionalScore } from '../../engine/score';
import { monthOf, prevMonth, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';

export interface HomeState {
  month: string;
  count: number;
  summary: MonthSummary;
  score: ProvisionalScore;
  canSpend: CanSpend | null;
  alert: Alert | null;
}

export function useHome() {
  const db = useDb();
  const [state, setState] = useState<HomeState | null>(null);

  const reload = useCallback(async () => {
    const today = todayLocal();
    const month = monthOf(today);
    let first = month;
    for (let i = 0; i < 3; i++) first = prevMonth(first);
    const txs = await listTransactions(db, `${first}-01`, `${month}-31`);
    const bills = await listBills(db);
    const setting = Number(await getSetting(db, 'monthlyIncome')) || null;
    const expectedIncome = expectedMonthlyIncome(txs, today, setting);
    setState({
      canSpend: canSpendToday({ today, expectedIncome, bills, txs }),
      alert: topAlert(txs, today),
      month,
      count: txs.length,
      summary: monthSummary(txs, month, today),
      score: provisionalScore(txs, today),
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { state, reload };
}
