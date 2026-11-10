import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AssetSection } from '../../../src/features/invest/AssetSection';
import { Disclaimer } from '../../../src/features/invest/Disclaimer';
import { FixedIncomeList } from '../../../src/features/invest/FixedIncomeList';
import { PlanCard } from '../../../src/features/invest/PlanCard';
import { buildInvestView, type AssetRow, type ViewInput } from '../../../src/features/invest/view';
import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';

const settings = { profile: 'moderado' as const, term: 12 as const, amountOverride: null, hyp: DEFAULT_HYPOTHESES };
const input: ViewInput = {
  settings: { ...settings, amountOverride: 300000 }, snapshot: {}, txs: [], bills: [], goals: [],
  reserve: 0, incomeSetting: 500000, today: '2026-11-09',
};
const q = (value: number) => ({ value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false });

test('Disclaimer mostra o texto exato', async () => {
  await render(<Disclaimer />);
  expect(screen.getByText('Simulação educativa com dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante futura.')).toBeTruthy();
});

test('PlanCard avisa reserva baixa', async () => {
  // reserva 0 mas gasto essencial desconhecido => reserva-desconhecida; força meses com histórico
  const view = buildInvestView({
    ...input, reserve: 0,
    txs: [{ id: 'a', date: '2026-10-05', amount: 100000, kind: 'expense', categoryId: 'moradia', description: '', source: 'form', externalId: null, needsReview: false, createdAt: '' }],
  });
  await render(<PlanCard view={view} />);
  expect(screen.getByText('Sua reserva está abaixo de 6 meses. Liquidez diária vem primeiro.')).toBeTruthy();
});

test('PlanCard avisa reserva desconhecida', async () => {
  await render(<PlanCard view={buildInvestView(input)} />);
  expect(screen.getByText('Informe sua reserva em Metas e reserva para personalizar.')).toBeTruthy();
});

test('PlanCard sem sobra', async () => {
  await render(<PlanCard view={buildInvestView({ ...input, settings: { ...settings, amountOverride: null }, incomeSetting: null })} />);
  expect(screen.getByText('Sem sobra este mês')).toBeTruthy();
});

test('PlanCard conservador mostra "não sugerido" no exterior', async () => {
  const view = buildInvestView({ ...input, settings: { ...settings, profile: 'conservador', amountOverride: 300000 } });
  await render(<PlanCard view={view} />);
  expect(screen.getAllByText('não sugerido neste perfil').length).toBeGreaterThan(0);
});

test('FixedIncomeList sem dados', async () => {
  await render(<FixedIncomeList ranking={[]} noData onOpen={() => {}} />);
  expect(screen.getByText('Sem dados de taxas ainda. Conecte-se para atualizar.')).toBeTruthy();
});

test('FixedIncomeList abre a conta ao tocar', async () => {
  const view = buildInvestView({ ...input, snapshot: { 'bcb.cdi': q(0.15), 'bcb.selic': q(0.15), 'bcb.tr': q(0) } });
  const onOpen = jest.fn();
  await render(<FixedIncomeList ranking={view.recommendation.ranking} noData={false} onOpen={onOpen} />);
  fireEvent.press(screen.getByText('CDB'));
  expect(onOpen).toHaveBeenCalledWith('fixed:cdb');
});

const row = (over: Partial<AssetRow>): AssetRow => ({
  symbol: 'KNRI11.SA', name: 'KNRI11 (FII tijolo)', cls: 'fii', priceBrl: 15000,
  change12m: 0.1, dividendYield: null, asOf: '2026-11-09', stale: false, ...over,
});

test('AssetSection mostra — quando falta indicador e selo de desatualizado', async () => {
  await render(<AssetSection assets={[row({ stale: true })]} onOpen={() => {}} />);
  expect(screen.getAllByText(/—/).length).toBeGreaterThan(0);
  expect(screen.getByText(/desatualizado/)).toBeTruthy();
});

test('FixedIncomeList avisa quando é simulação de referência', async () => {
  const view = buildInvestView({ ...input, snapshot: { 'bcb.cdi': q(0.15), 'bcb.selic': q(0.15), 'bcb.tr': q(0) } });
  await render(<FixedIncomeList ranking={view.recommendation.ranking} noData={false} reference onOpen={() => {}} />);
  expect(screen.getByText('Simulação sobre R$ 1.000, sem sobra este mês.')).toBeTruthy();
});
