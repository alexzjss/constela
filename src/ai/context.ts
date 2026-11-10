import { CLASS_LABEL } from '../features/invest/PlanCard';
import type { Analysis, PortfolioRisk } from '../features/research/analysis';
import type { HoldingsView } from '../features/invest/holdingsView';
import type { InvestView } from '../features/invest/view';
import { holdingTypeLabel } from '../engine/holdings';
import { num2, pctText, signedPct } from '../lib/format';
import { formatBRL } from '../lib/money';

/** Texto com os números que o app já calculou. A IA só explica isto; nada aqui é inventado por ela. */
export function portfolioContext(h: HoldingsView, risk: PortfolioRisk | null, nameOf: (s: string) => string): string {
  const lines = [`Carteira: ${formatBRL(h.summary.value)} investidos (aportado ${formatBRL(h.summary.invested)}).`];
  for (const r of h.rows) {
    const g = r.perf.gainPct;
    lines.push(`- ${r.holding.name} (${holdingTypeLabel(r.holding.type)}): ${formatBRL(r.holding.value)}; rendimento ${g === null ? 'n/d' : signedPct(g)}; ${r.headline}`);
  }
  if (risk && risk.coverage > 0) {
    lines.push(`Risco: volatilidade de ${pctText(risk.volatility, 1)} ao ano sobre ${pctText(risk.coverage)} da carteira (${risk.weeks} semanas).`);
    for (const p of risk.pairs) lines.push(`- ${nameOf(p.a)} e ${nameOf(p.b)}: correlação ${num2(p.correlation)}`);
  }
  return lines.join('\n');
}

export function planContext(v: InvestView, profile: string, termMonths: number): string {
  const lines = [`Perfil: ${profile}. Prazo da renda fixa: ${termMonths} meses. Valor a investir: ${v.amount > 0 ? formatBRL(v.amount) : 'não informado'}.`];
  for (const c of v.recommendation.classes) {
    lines.push(`- ${CLASS_LABEL[c.cls]}: faixa ${c.range ? `${c.range.min}-${c.range.max}%` : 'não sugerida'}${c.amount > 0 ? `, ${formatBRL(c.amount)}` : ''}`);
  }
  if (v.recommendation.ranking.length) {
    lines.push('Renda fixa por retorno líquido estimado (já descontados IR e IOF):');
    for (const r of v.recommendation.ranking.slice(0, 4)) {
      lines.push(`- ${r.name}: ${pctText(r.netAnnual, 2)} a.a. líquido, lucro de ${formatBRL(r.netProfit, { cents: true })} em ${r.days} dias`);
    }
  }
  return lines.join('\n');
}

export function assetContext(a: Analysis): string {
  const lines = [
    `Ativo: ${a.name} (${a.symbol}, moeda ${a.currency}). Janela: ${a.weeks} semanas, retornos semanais em reais.`,
    `Variação em 12 meses: ${signedPct(a.change12m)}. Volatilidade: ${pctText(a.volatility, 1)} ao ano. Maior queda: ${pctText(a.maxDrawdown, 1)}.`,
  ];
  if (a.vsCdi12m !== null) lines.push(`Contra o CDI em 12 meses: ${signedPct(a.vsCdi12m)}.`);
  for (const i of a.indicators) lines.push(`- ${i.label}: correlação ${num2(i.correlation)}, beta ${num2(i.beta)}`);
  if (a.impact && a.impact.correlation !== null) {
    lines.push(`Com ${pctText(a.impact.addWeight)} da carteira nele: correlação com a carteira ${num2(a.impact.correlation)}, volatilidade ${pctText(a.impact.volBefore, 1)} → ${pctText(a.impact.volAfter, 1)}.`);
  }
  if (a.similar.length) lines.push(`Mais parecidos: ${a.similar.map((s) => `${s.name} (${num2(s.correlation)})`).join('; ')}.`);
  if (a.diversifiers.length) lines.push(`Mais diversificadores: ${a.diversifiers.map((s) => `${s.name} (${num2(s.correlation)})`).join('; ')}.`);
  return lines.join('\n');
}
