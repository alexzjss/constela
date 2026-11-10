import * as SecureStore from 'expo-secure-store';
import type { Db } from '../db/db';
import { getSetting, setSetting } from '../db/repo';
import { PROVIDERS, type AiConfig, type Provider } from './provider';

const KEY_PREFIX = 'ai-key-';

export interface AiSettings {
  provider: Provider;
  model: string;
  hasKey: boolean;
}

const isProvider = (x: string | null): x is Provider => x === 'claude' || x === 'gemini';
const defaultModel = (p: Provider) => PROVIDERS.find((x) => x.id === p)!.defaultModel;

/** A chave fica no cofre do Android (expo-secure-store), nunca no SQLite nem no backup. */
export async function loadAiSettings(db: Db): Promise<AiSettings> {
  const raw = await getSetting(db, 'ai.provider');
  const provider: Provider = isProvider(raw) ? raw : 'claude';
  const model = (await getSetting(db, `ai.model.${provider}`)) || defaultModel(provider);
  let hasKey = false;
  try {
    hasKey = !!(await SecureStore.getItemAsync(KEY_PREFIX + provider));
  } catch {
    hasKey = false;
  }
  return { provider, model, hasKey };
}

export async function loadAiConfig(db: Db): Promise<AiConfig | null> {
  const s = await loadAiSettings(db);
  try {
    const apiKey = await SecureStore.getItemAsync(KEY_PREFIX + s.provider);
    return apiKey ? { provider: s.provider, model: s.model, apiKey } : null;
  } catch {
    return null;
  }
}

export async function saveProvider(db: Db, provider: Provider): Promise<void> {
  await setSetting(db, 'ai.provider', provider);
}

export async function saveModel(db: Db, provider: Provider, model: string): Promise<void> {
  await setSetting(db, `ai.model.${provider}`, model.trim() || defaultModel(provider));
}

export async function saveKey(provider: Provider, key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PREFIX + provider, key.trim());
}

export async function removeKey(provider: Provider): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PREFIX + provider);
}
