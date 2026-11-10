import { useCallback, useEffect, useRef, useState } from 'react';
import { categoryById } from '../../domain/categories';
import type { Draft, Kind, Transaction } from '../../domain/types';
import type { Db } from '../../db/db';
import { getTransaction, getUserRules, insertTransaction, setUserRule, updateTransaction } from '../../db/repo';
import { parsePhrase } from '../../parser/phrase';
import { normalizeKey } from '../../parser/merchants';

export interface AddCore {
  readonly draft: Draft | null;
  readonly canSave: boolean;
  readonly text: string;
  readonly description: string;
  setText(t: string): void;
  setKind(k: Kind): void;
  setCategory(id: string): void;
  setAmount(cents: number): void;
  setDate(iso: string): void;
  setDescription(d: string): void;
  /** Modo edição: carrega o lançamento nos campos. */
  load(): Promise<void>;
  loadRules(): Promise<void>;
  save(): Promise<Transaction | null>;
}

/** Lógica pura da folha "Adicionar" (sem React). O nome segue o plano. */
export function useAddCore(db: Db, today: string, editId?: string): AddCore {
  let text = '';
  let rules: Record<string, string> = {};
  let kindOverride: Kind | null = null;
  let categoryOverride: string | null = null;
  let amountOverride: number | null = null;
  let dateOverride: string | null = null;
  let descriptionOverride: string | null = null;

  const parsed = () => parsePhrase(text, today, rules);

  const compute = (): Draft | null => {
    const p = parsed();
    const amount = amountOverride ?? p?.amount ?? 0;
    if (amount <= 0) return null;
    const kind = kindOverride ?? p?.kind ?? 'expense';
    let categoryId = categoryOverride ?? (p && p.kind === kind ? p.categoryId : kind === 'income' ? 'renda' : 'outros');
    if (categoryById(categoryId).kind !== kind) categoryId = kind === 'income' ? 'renda' : 'outros';
    return {
      kind, amount, date: dateOverride ?? p?.date ?? today, categoryId,
      description: descriptionOverride ?? p?.description ?? text.trim(),
    };
  };

  return {
    get draft() { return compute(); },
    get canSave() { return compute() !== null; },
    get text() { return text; },
    get description() { return descriptionOverride ?? text; },
    setText(t) { text = t; descriptionOverride = null; },
    setKind(k) { kindOverride = k; categoryOverride = null; },
    setCategory(id) { categoryOverride = id; },
    setAmount(c) { amountOverride = c; },
    setDate(iso) { dateOverride = iso; },
    setDescription(d) { descriptionOverride = d; },
    async load() {
      const t = editId ? await getTransaction(db, editId) : null;
      if (!t) return;
      kindOverride = t.kind; categoryOverride = t.categoryId; amountOverride = t.amount;
      dateOverride = t.date; descriptionOverride = t.description;
    },
    async loadRules() { rules = await getUserRules(db); },
    async save() {
      const d = compute();
      if (!d) return null;
      if (editId) {
        await updateTransaction(db, editId, d);
        return getTransaction(db, editId);
      }
      const saved = await insertTransaction(db, { ...d, source: text.trim() ? 'text' : 'form' });
      const suggested = parsed()?.categoryId;
      if (categoryOverride && categoryOverride !== suggested && d.description) {
        await setUserRule(db, normalizeKey(d.description), categoryOverride);
      }
      return saved;
    },
  };
}

/** Envoltório React: re-renderiza a cada mudança no núcleo. */
export function useAdd(db: Db, today: string, editId?: string) {
  const core = useRef<AddCore>(null as unknown as AddCore);
  if (!core.current) core.current = useAddCore(db, today, editId);
  const [, bump] = useState(0);
  const touch = useCallback(() => bump((n) => n + 1), []);

  useEffect(() => {
    void Promise.all([core.current.loadRules(), core.current.load()]).then(touch);
  }, [touch]);

  const c = core.current;
  return {
    draft: c.draft,
    canSave: c.canSave,
    text: c.text,
    description: c.description,
    setText: (t: string) => { c.setText(t); touch(); },
    setKind: (k: Kind) => { c.setKind(k); touch(); },
    setCategory: (id: string) => { c.setCategory(id); touch(); },
    setAmount: (n: number) => { c.setAmount(n); touch(); },
    setDate: (iso: string) => { c.setDate(iso); touch(); },
    save: () => c.save(),
  };
}
