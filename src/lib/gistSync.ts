import { useCallback, useEffect, useRef, useState } from 'react';
import { type Vehicle } from '../types';

export const GIST_DESCRIPTION = 'Taxi Car Wash Auto Backup';
export const GIST_FILENAME = 'taxi-car-wash-data.json';

const PAT_KEY = 'taxi_wash_pat';
const ENABLED_KEY = 'taxi_wash_sync_enabled';
const GIST_ID_KEY = 'taxi_wash_gist_id';
const LAST_SYNC_KEY = 'taxi_wash_last_sync';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface GistFile {
  filename: string;
  content?: string;
  raw_url?: string;
}

interface GistSummary {
  id: string;
  description: string | null;
  files: Record<string, GistFile>;
  public: boolean;
  updated_at: string;
}

async function ghFetch(
  path: string,
  pat: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function findExistingGist(pat: string): Promise<GistSummary | null> {
  for (let page = 1; page <= 5; page += 1) {
    const res = await ghFetch(`/gists?per_page=100&page=${page}`, pat);
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const list = (await res.json()) as GistSummary[];
    const hit = list.find(
      (g) => !g.public && (g.description ?? '') === GIST_DESCRIPTION
    );
    if (hit) return hit;
    if (list.length < 100) break;
  }
  return null;
}

async function fetchGist(id: string, pat: string): Promise<GistSummary> {
  const res = await ghFetch(`/gists/${id}`, pat);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return (await res.json()) as GistSummary;
}

async function createGist(
  pat: string,
  vehicles: Vehicle[]
): Promise<GistSummary> {
  const res = await ghFetch('/gists', pat, {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ version: 2, vehicles }, null, 2),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return (await res.json()) as GistSummary;
}

async function updateGist(
  id: string,
  pat: string,
  vehicles: Vehicle[]
): Promise<void> {
  const res = await ghFetch(`/gists/${id}`, pat, {
    method: 'PATCH',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ version: 2, vehicles }, null, 2),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
}

function gistContent(g: GistSummary): string | null {
  const f = g.files[GIST_FILENAME] ?? Object.values(g.files)[0];
  return f?.content ?? null;
}

export interface UseGistSyncResult {
  pat: string;
  setPat: (v: string) => void;
  enabled: boolean;
  status: SyncStatus;
  lastSync: string;
  error: string;
  gistId: string;
  /** Validate PAT, find or create gist; if found, restore data via importBackup. */
  enable: () => Promise<{ restored: boolean }>;
  /** Stop syncing and clear stored credentials. */
  disable: () => void;
  /** Pull latest gist content and restore. */
  pullNow: () => Promise<void>;
  /** Force push current data to gist. */
  pushNow: () => Promise<void>;
}

export function useGistSync(
  vehicles: Vehicle[],
  importBackup: (json: string) => boolean
): UseGistSyncResult {
  const [pat, setPatState] = useState<string>(
    () => localStorage.getItem(PAT_KEY) ?? ''
  );
  const [enabled, setEnabled] = useState<boolean>(
    () => localStorage.getItem(ENABLED_KEY) === '1'
  );
  const [gistId, setGistId] = useState<string>(
    () => localStorage.getItem(GIST_ID_KEY) ?? ''
  );
  const [lastSync, setLastSync] = useState<string>(
    () => localStorage.getItem(LAST_SYNC_KEY) ?? ''
  );
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string>('');

  const setPat = useCallback((v: string) => {
    setPatState(v.trim());
  }, []);

  const debounceRef = useRef<number | null>(null);
  const skipNextPushRef = useRef<boolean>(true); // skip initial mount push

  const persistEnabled = (v: boolean) => {
    setEnabled(v);
    if (v) localStorage.setItem(ENABLED_KEY, '1');
    else localStorage.removeItem(ENABLED_KEY);
  };

  const persistGistId = (id: string) => {
    setGistId(id);
    if (id) localStorage.setItem(GIST_ID_KEY, id);
    else localStorage.removeItem(GIST_ID_KEY);
  };

  const persistLastSync = (iso: string) => {
    setLastSync(iso);
    if (iso) localStorage.setItem(LAST_SYNC_KEY, iso);
    else localStorage.removeItem(LAST_SYNC_KEY);
  };

  const persistPat = useCallback((value: string) => {
    if (value) localStorage.setItem(PAT_KEY, value);
    else localStorage.removeItem(PAT_KEY);
  }, []);

  const enable = useCallback(async (): Promise<{ restored: boolean }> => {
    const trimmed = pat.trim();
    if (!trimmed) throw new Error('PAT を入力してください');
    setStatus('syncing');
    setError('');
    try {
      const existing = await findExistingGist(trimmed);
      if (existing) {
        const full = await fetchGist(existing.id, trimmed);
        const content = gistContent(full);
        if (content) {
          const ok = importBackup(content);
          if (!ok) throw new Error('Gist の内容が読めませんでした');
        }
        persistGistId(existing.id);
        persistPat(trimmed);
        persistEnabled(true);
        persistLastSync(new Date().toISOString());
        skipNextPushRef.current = true;
        setStatus('idle');
        return { restored: !!content };
      }
      const created = await createGist(trimmed, vehicles);
      persistGistId(created.id);
      persistPat(trimmed);
      persistEnabled(true);
      persistLastSync(new Date().toISOString());
      skipNextPushRef.current = true;
      setStatus('idle');
      return { restored: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      throw e;
    }
  }, [pat, vehicles, importBackup, persistPat]);

  const disable = useCallback(() => {
    persistEnabled(false);
    persistGistId('');
    persistLastSync('');
    setStatus('idle');
    setError('');
    localStorage.removeItem(PAT_KEY);
    setPatState('');
  }, []);

  const pullNow = useCallback(async () => {
    if (!pat || !gistId) throw new Error('同期が有効ではありません');
    setStatus('syncing');
    setError('');
    try {
      const full = await fetchGist(gistId, pat);
      const content = gistContent(full);
      if (!content) throw new Error('Gist にデータがありません');
      const ok = importBackup(content);
      if (!ok) throw new Error('Gist の内容が読めませんでした');
      persistLastSync(new Date().toISOString());
      skipNextPushRef.current = true;
      setStatus('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      throw e;
    }
  }, [pat, gistId, importBackup]);

  const pushNow = useCallback(async () => {
    if (!pat || !gistId) throw new Error('同期が有効ではありません');
    setStatus('syncing');
    setError('');
    try {
      await updateGist(gistId, pat, vehicles);
      persistLastSync(new Date().toISOString());
      setStatus('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      throw e;
    }
  }, [pat, gistId, vehicles]);

  // Auto-push (debounced) when vehicles change while sync is enabled.
  useEffect(() => {
    if (!enabled || !pat || !gistId) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        setStatus('syncing');
        setError('');
        try {
          await updateGist(gistId, pat, vehicles);
          persistLastSync(new Date().toISOString());
          setStatus('idle');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setStatus('error');
        }
      })();
    }, 1500);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [vehicles, enabled, pat, gistId]);

  return {
    pat,
    setPat,
    enabled,
    status,
    lastSync,
    error,
    gistId,
    enable,
    disable,
    pullNow,
    pushNow,
  };
}
