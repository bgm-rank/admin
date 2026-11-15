import { useSyncExternalStore } from 'react';
import type { EnvMode, ThemeMode } from './types';

const STORAGE_KEY = 'bgm_rank_admin_env_v1';

export interface EnvConfig {
  mode: EnvMode;
  localUrl: string;
  prodUrl: string;
  localToken: string;
  prodToken: string;
  theme: ThemeMode;
}

const DEFAULT_CONFIG: EnvConfig = {
  mode: 'local',
  localUrl: 'http://localhost:3000',
  prodUrl: 'https://api.rinshankaiho.fun',
  localToken: '',
  prodToken: '',
  theme: 'dark',
};

function readInitialConfig(): EnvConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<EnvConfig>;
    return {
      mode: parsed.mode === 'prod' ? 'prod' : 'local',
      localUrl: (parsed.localUrl || DEFAULT_CONFIG.localUrl).replace(/\/+$/, ''),
      prodUrl: (parsed.prodUrl || DEFAULT_CONFIG.prodUrl).replace(/\/+$/, ''),
      localToken: parsed.localToken ?? '',
      prodToken: parsed.prodToken ?? '',
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

let state: EnvConfig = typeof window !== 'undefined' ? readInitialConfig() : DEFAULT_CONFIG;
const listeners = new Set<() => void>();

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

applyThemeClass(state.theme);

function emit() {
  for (const l of listeners) {
    l();
  }
}

export function getEnvConfig(): EnvConfig {
  return state;
}

export function getActiveEndpoint(): { mode: EnvMode; baseUrl: string; token: string; host: string } {
  const baseUrl = (state.mode === 'prod' ? state.prodUrl : state.localUrl).replace(/\/+$/, '');
  const token = state.mode === 'prod' ? state.prodToken : state.localToken;
  let host = baseUrl;
  try {
    host = new URL(baseUrl).host;
  } catch {
    // keep raw string
  }
  return { mode: state.mode, baseUrl, token, host };
}

export function updateEnvConfig(patch: Partial<EnvConfig>) {
  const next: EnvConfig = {
    ...state,
    ...patch,
  };
  next.localUrl = (next.localUrl || DEFAULT_CONFIG.localUrl).trim().replace(/\/+$/, '');
  next.prodUrl = (next.prodUrl || DEFAULT_CONFIG.prodUrl).trim().replace(/\/+$/, '');
  state = next;
  applyThemeClass(state.theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  emit();
}

export function toggleEnvMode() {
  updateEnvConfig({ mode: state.mode === 'local' ? 'prod' : 'local' });
}

export function toggleThemeMode() {
  updateEnvConfig({ theme: state.theme === 'dark' ? 'light' : 'dark' });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEnvConfig(): EnvConfig {
  return useSyncExternalStore(subscribe, getEnvConfig, getEnvConfig);
}
