import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Transaction } from '../../domain/types';
import { loadHandled, pendingIncomes } from '../invest/entrada';
import { incomeSetting, materializeIncome } from '../ledger/actions';
import { getSetting, listBills, listGoals, listTransactions } from '../../db/repo';
import { topAlert, type Alert } from '../../engine/alerts';
import { canSpendToday, expectedMonthlyIncome, type CanSpend } from '../../engine/today';
import { monthSummary, type MonthSummary } from '../../engine/month';
import { compositeScore, essentialMonthlyAverage, type Score } from '../../engine/composite';
import { monthOf, prevMonth, todayLocal } from '../../lib/dates';
import { useDb } from '../../lib/db-context';

export interface HomeState {
  month: string;
  count: number;
  summary: MonthSummary;
  score: Score;
  canSpend: CanSpend | null;
  alert: Alert | null;
  newIncome: Transaction | null; // ganho recente ainda sem "onde investir" resolvido
}

export function useHome() {
  const db = useDb();
  const [state, setState] = useState<HomeState | null>(null);

  const reload = useCallback(async () => {
    const today = todayLocal();
    const month = monthOf(today);
    await materializeIncome(db, today);
    let first = month;
    for (let i = 0; i < 3; i++) first = prevMonth(first);
    const txs = await listTransactions(db, `${first}-01`, `${month}-31`);
    const bills = await listBills(db);
    const setting = await incomeSetting(db, month);
    const expectedIncome = expectedMonthlyIncome(txs, today, setting);
    const reserveSetting = await getSetting(db, 'reserveBalance');
    setState({
      canSpend: canSpendToday({ today, expectedIncome, bills, txs }),
      alert: topAlert(txs, today),
      newIncome: pendingIncomes(txs, await loadHandled(db), today)[0] ?? null,
      month,
      count: txs.length,
      summary: monthSummary(txs, month, today),
      score: compositeScore({
        txs, today, expectedIncome,
        reserve: reserveSetting === null ? null : Number(reserveSetting),
        essentialMonthly: essentialMonthlyAverage(txs, today),
        goals: await listGoals(db),
      }),
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { state, reload };
}
