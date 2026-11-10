import type { Db } from '../../db/db';
import { getSetting, setSetting } from '../../db/repo';
import { DEFAULT_HYPOTHESES, TERMS, type Hypotheses, type Profile, type Term } from '../../engine/invest/types';
import type { Cents } from '../../lib/money';

export interface InvestSettings {
  profile: Profile;
  term: Term;
  amountOverride: Cents | null;
  hyp: Hypotheses;
}

const PROFILES: Profile[] = ['conservador', 'moderado', 'arrojado'];

const num = (raw: string | null, fallback: number): number => {
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function loadInvestSettings(db: Db): Promise<InvestSettings> {
  const profile = (await getSetting(db, 'invest.profile')) as Profile | null;
  const term = Number(await getSetting(db, 'invest.term')) as Term;
  const amount = await getSetting(db, 'invest.amount');
  const amountN = amount === null || amount === '' ? NaN : Number(amount);
  return {
    profile: profile && PROFILES.includes(profile) ? profile : 'moderado',
    term: TERMS.includes(term) ? term : 12,
    amountOverride: Number.isFinite(amountN) && amountN > 0 ? Math.round(amountN) : null,
    hyp: {
      cdbPctCdi: num(await getSetting(db, 'invest.cdbPctCdi'), DEFAULT_HYPOTHESES.cdbPctCdi),
      lciPctCdi: num(await getSetting(db, 'invest.lciPctCdi'), DEFAULT_HYPOTHESES.lciPctCdi),
      custodyPct: num(await getSetting(db, 'invest.custodyPct'), DEFAULT_HYPOTHESES.custodyPct),
    },
  };
}

export async function saveInvestSettings(db: Db, patch: Partial<InvestSettings>): Promise<void> {
  if (patch.profile) await setSetting(db, 'invest.profile', patch.profile);
  if (patch.term) await setSetting(db, 'invest.term', String(patch.term));
  if ('amountOverride' in patch) {
    await setSetting(db, 'invest.amount', patch.amountOverride ? String(patch.amountOverride) : '');
  }
  if (patch.hyp) {
    await setSetting(db, 'invest.cdbPctCdi', String(patch.hyp.cdbPctCdi));
    await setSetting(db, 'invest.lciPctCdi', String(patch.hyp.lciPctCdi));
    await setSetting(db, 'invest.custodyPct', String(patch.hyp.custodyPct));
  }
}
