import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Disclaimer } from '../../../src/features/invest/Disclaimer';
import { FixedIncomeList } from '../../../src/features/invest/FixedIncomeList';
import { PlanCard } from '../../../src/features/invest/PlanCard';
import { buildInvestView, type ViewInput } from '../../../src/features/invest/view';
import { DEFAULT_HYPOTHESES } from '../../../src/engine/invest/types';

const settings = { profile: 'moderado' as const, term: 12 as const, amountOverride: null, hyp: DEFAULT_HYPOTHESES };
const input: ViewInput = { settings: { ...settings, amountOverride: 300000 }, snapshot: {} };
const q = (value: number) => ({ value, asOf: '2026-11-06', fetchedAt: '2026-11-09T10:00:00.000Z', stale: false });

test('Disclaimer mostra o texto exato', async () => {
  await render(<Disclaimer />);
  expect(screen.getByText('Simulação educativa com dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante futura.')).toBeTruthy();
});

test('PlanCard sem valor pede o valor a investir', async () => {
  await render(<PlanCard view={buildInvestView({ ...input, settings: { ...settings, amountOverride: null } })} />);
  expect(screen.getByText('Informe quanto quer investir para ver a sugestão.')).toBeTruthy();
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

test('FixedIncomeList avisa quando é simulação de referência', async () => {
  const view = buildInvestView({ ...input, snapshot: { 'bcb.cdi': q(0.15), 'bcb.selic': q(0.15), 'bcb.tr': q(0) } });
  await render(<FixedIncomeList ranking={view.recommendation.ranking} noData={false} reference onOpen={() => {}} />);
  expect(screen.getByText('Simulação sobre R$ 1.000. Informe um valor para usar o seu.')).toBeTruthy();
});
