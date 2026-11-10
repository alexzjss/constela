import { classRange, planAllocation, splitByMix, type PlanInput } from '../../../src/engine/invest/allocation';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const base: PlanInput = {
  amount: 300000, profile: 'moderado', reserve: 700000, essentialMonthly: 100000, goals: [], today: '2026-11-09',
};
const total = (p: ReturnType<typeof planAllocation>) => p.steps.reduce((a, s) => a + s.amount, 0);

test('splitByMix soma o total e a sobra vai à maior classe', () => {
  const s = splitByMix(100001, 'moderado');
  expect(sum(s)).toBe(100001);
  expect(s.rendaFixa).toBe(60001);
  expect(splitByMix(1000, 'conservador').cripto).toBe(0);
});

test('classRange', () => {
  expect(classRange(0)).toBeNull();
  expect(classRange(60)).toEqual({ min: 55, max: 65 });
  expect(classRange(2)).toEqual({ min: 0, max: 7 });
});

test('reserva zerada: tudo vai para a reserva e avisa', () => {
  const p = planAllocation({ ...base, reserve: 0 });
  expect(p.steps).toEqual([{ kind: 'reserva', amount: 300000 }]);
  expect(p.warnings).toContain('reserva-baixa');
  expect(total(p)).toBe(300000);
});

test('reserva entre 3 e 6 meses: metade para a reserva', () => {
  const p = planAllocation({ ...base, reserve: 400000 });
  expect(p.steps[0]).toEqual({ kind: 'reserva', amount: 150000 });
  expect(p.steps[1]).toMatchObject({ kind: 'mix', amount: 150000 });
  expect(total(p)).toBe(300000);
});

test('meta atrasada com prazo curto recebe a parcela mensal', () => {
  const goals = [{ id: 'g1', name: 'Viagem', target: 120000, saved: 0, startDate: '2026-01-01', deadline: '2027-01-01' }];
  const p = planAllocation({ ...base, goals });
  expect(p.steps.map((s) => s.kind)).toEqual(['meta', 'mix']);
  expect(p.steps[0]).toMatchObject({ kind: 'meta', amount: 60000, goalId: 'g1' });
  expect(p.warnings).toEqual([]);
  expect(total(p)).toBe(300000);
});

test('reserva desconhecida avisa e não cria passo de reserva', () => {
  const p = planAllocation({ ...base, reserve: null });
  expect(p.warnings).toContain('reserva-desconhecida');
  expect(p.reserveMonths).toBeNull();
  expect(p.steps.map((s) => s.kind)).toEqual(['mix']);
  expect(total(p)).toBe(300000);
});

test('sem valor: sem passos', () => {
  for (const amount of [0, -500]) {
    const p = planAllocation({ ...base, amount });
    expect(p.steps).toEqual([]);
    expect(p.warnings).toEqual(['sem-valor']);
  }
});
