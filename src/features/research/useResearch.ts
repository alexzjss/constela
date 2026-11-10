import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useDb } from '../../lib/db-context';
import { loadContext, type Context } from './loadAnalysis';

/** Séries de preço e referências para correlação. `extra` entra na carga além de carteira e acompanhados. */
export function useResearch(extra: string[] = []) {
  const db = useDb();
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const key = extra.join(',');

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const c = await loadContext(db, fetch, new Date(), key ? key.split(',') : [], force);
      if (alive.current) setCtx(c);
    } catch {
      // sem rede e sem cache: a tela mostra o estado vazio
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [db, key]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void load();
      return () => {
        alive.current = false;
      };
    }, [load]),
  );

  return { ctx, loading, reload: load };
}
