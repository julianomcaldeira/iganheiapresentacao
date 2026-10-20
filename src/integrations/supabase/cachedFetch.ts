/**
 * Fetch com cache em memória para consultas de leitura do PostgREST.
 *
 * Objetivo: ao voltar para uma tela já visitada, os dados são servidos
 * instantaneamente do cache (sem skeleton e sem nova espera de rede) e
 * revalidados em segundo plano.
 *
 * - Só faz cache de GET em /rest/v1/
 * - Qualquer escrita (POST/PATCH/PUT/DELETE) limpa o cache
 * - Requisições idênticas simultâneas são deduplicadas (1 request só)
 */

type CacheEntry = {
  at: number;
  body: string;
  status: number;
  headers: [string, string][];
};

const FRESH_MS = 60_000;
const MAX_AGE_MS = 10 * 60_000;
const MAX_ENTRIES = 400;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

const nativeFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export function clearQueryCache() {
  cache.clear();
  inflight.clear();
}

function getHeader(headers: HeadersInit | undefined, name: string): string {
  if (!headers) return '';
  try {
    return new Headers(headers).get(name) || '';
  } catch {
    return '';
  }
}

function toResponse(entry: CacheEntry): Response {
  return new Response(entry.body, {
    status: entry.status,
    headers: entry.headers,
  });
}

async function fetchEntry(url: string, init: RequestInit | undefined, key: string): Promise<CacheEntry> {
  const res = await nativeFetch(url, init);
  const body = await res.clone().text();
  const headers = [...res.headers.entries()].filter(
    ([name]) => name !== 'content-encoding' && name !== 'content-length'
  );
  const entry: CacheEntry = { at: Date.now(), body, status: res.status, headers };

  if (res.ok) {
    if (cache.size >= MAX_ENTRIES) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    cache.set(key, entry);
  }

  return entry;
}

function revalidate(url: string, init: RequestInit | undefined, key: string) {
  if (inflight.has(key)) return;
  const promise = fetchEntry(url, init, key).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  promise.catch(() => {});
}

export async function cachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  const method = (
    init?.method || (input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  if (!url.includes('/rest/v1/')) {
    return nativeFetch(input as RequestInfo, init);
  }

  if (method !== 'GET') {
    clearQueryCache();
    return nativeFetch(input as RequestInfo, init);
  }

  const key = [
    getHeader(init?.headers, 'authorization'),
    getHeader(init?.headers, 'range'),
    getHeader(init?.headers, 'prefer'),
    getHeader(init?.headers, 'accept-profile'),
    getHeader(init?.headers, 'content-profile'),
    url,
  ].join('|');

  const hit = cache.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;

  if (hit && age < MAX_AGE_MS) {
    if (age > FRESH_MS) revalidate(url, init, key);
    return toResponse(hit);
  }

  let promise = inflight.get(key);
  if (!promise) {
    promise = fetchEntry(url, init, key).finally(() => inflight.delete(key));
    inflight.set(key, promise);
  }
  return toResponse(await promise);
}
