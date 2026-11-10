import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { brDate, Button, Chips, Field, Label, Screen, toField } from '../src/components/form';
import { DEFAULT_CATEGORIES } from '../src/domain/categories';
import type { Kind } from '../src/domain/types';
import { deleteTransaction, getTransaction, insertTransaction, updateTransaction } from '../src/db/repo';
import { fromBR, isRealDate, monthOf, todayLocal } from '../src/lib/dates';
import { useDb } from '../src/lib/db-context';
import { parseBRL } from '../src/lib/money';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ganho' },
  { id: 'internal', label: 'Investimento' },
];
const BR_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const firstCategory = (k: Kind) => DEFAULT_CATEGORIES.find((c) => c.kind === k && c.id !== 'cartao')!.id;
const defaultCategory = (k: Kind) => (k === 'income' ? 'salario' : k === 'internal' ? 'investimento' : 'outros');

/** Cria ou edita um lançamento. ?id= edita; ?month= cria dentro daquele mês; ?kind= escolhe o tipo inicial. */
export default function Lancamento() {
  const db = useDb();
  const router = useRouter();
  const { id, month, kind: kindParam } = useLocalSearchParams<{ id?: string; month?: string; kind?: Kind }>();
  const today = todayLocal();
  const initialDate = month && month !== monthOf(today) ? `${month}-01` : today;

  const [kind, setKind] = useState<Kind>(kindParam && KINDS.some((k) => k.id === kindParam) ? kindParam : 'expense');
  const [categoryId, setCategoryId] = useState(defaultCategory(kind));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(brDate(initialDate));
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getTransaction(db, id).then((t) => {
      if (t) {
        setKind(t.kind); setCategoryId(t.categoryId); setAmount(toField(t.amount));
        setDescription(t.description); setDate(brDate(t.date));
      }
      setLoaded(true);
    });
  }, [db, id]);

  const changeKind = (k: Kind) => {
    setKind(k);
    setCategoryId(defaultCategory(k));
  };

  const cents = parseBRL(amount);
  const iso = BR_DATE.test(date) ? fromBR(date) : null;
  const validDate = iso !== null && isRealDate(iso);
  const canSave = loaded && cents !== null && cents > 0 && validDate;
  const options = DEFAULT_CATEGORIES.filter((c) => c.kind === kind && (c.id !== 'cartao' || c.id === categoryId))
    .map((c) => ({ id: c.id, label: c.name, color: c.color }));

  const save = async () => {
    setError(null);
    const draft = {
      kind, amount: cents as number, date: iso as string,
      categoryId: options.some((o) => o.id === categoryId) ? categoryId : firstCategory(kind),
      description: description.trim(),
    };
    try {
      if (id) await updateTransaction(db, id, draft);
      else {
        const saved = await insertTransaction(db, { ...draft, source: 'form' });
        if (saved.kind === 'income') return router.replace({ pathname: '/entrada', params: { id: saved.id } });
      }
      router.back();
    } catch {
      setError('Não consegui salvar. Tente de novo.');
    }
  };

  return (
    <Screen title={id ? 'Editar lançamento' : 'Novo lançamento'}>
      <Chips options={KINDS} value={kind} onChange={changeKind} />
      <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      <Field label="Descrição" value={description} onChangeText={setDescription} placeholder={kind === 'income' ? 'Salário de novembro' : 'Almoço'} />
      <Field label="Data" value={date} onChangeText={setDate} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/aaaa" />
      <Label>Categoria</Label>
      <Chips options={options} value={categoryId} onChange={setCategoryId} />
      {error ? <Label>{error}</Label> : null}
      <View style={styles.actions}>
        <Button label="Salvar" disabled={!canSave} onPress={save} />
        {id ? (
          <Button
            label="Apagar lançamento"
            kind="danger"
            onPress={async () => { await deleteTransaction(db, id); router.back(); }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { gap: 12, marginTop: 8 } });
