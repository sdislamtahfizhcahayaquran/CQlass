// CQlass Academic PTS Readiness — transport guard for large PostgREST IN filters
// Prevent oversized /rest/v1/students?id=in.(...) requests from failing in the Edge Runtime.

const nativeFetch = globalThis.fetch.bind(globalThis);

function initFrom(input: RequestInfo | URL, init?: RequestInit): RequestInit | undefined {
  if (!(input instanceof Request)) return init;
  return {
    method: input.method,
    headers: input.headers,
    redirect: input.redirect,
    credentials: input.credentials,
    cache: input.cache,
    mode: input.mode,
    referrer: input.referrer,
    referrerPolicy: input.referrerPolicy,
    integrity: input.integrity,
    keepalive: input.keepalive,
    signal: input.signal,
    ...init,
  };
}

function inputUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url: URL;
  try {
    url = new URL(inputUrl(input));
  } catch {
    return nativeFetch(input as any, init);
  }

  const idFilter = url.searchParams.get('id') || '';
  const isStudents = /\/rest\/v1\/students$/.test(url.pathname);
  const isLargeIn = idFilter.startsWith('in.(') && idFilter.endsWith(')') && idFilter.length > 3000;

  if (!isStudents || !isLargeIn) return nativeFetch(input as any, init);

  const ids = idFilter.slice(4, -1).split(',').map(v => v.trim()).filter(Boolean);
  if (ids.length <= 100) return nativeFetch(input as any, init);

  const requestInit = initFrom(input, init);
  const merged: any[] = [];

  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const chunkUrl = new URL(url.toString());
    chunkUrl.searchParams.set('id', `in.(${chunk.join(',')})`);

    const response = await nativeFetch(chunkUrl.toString(), requestInit);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const rows = await response.json().catch(() => []);
    if (Array.isArray(rows)) merged.push(...rows);
  }

  return new Response(JSON.stringify(merged), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};

// Keep the full readiness calculation pinned; this wrapper only changes transport behaviour.
await import('https://raw.githubusercontent.com/sdislamtahfizhcahayaquran/CQlass/3620ee34b2263c3eb121dec55584170eb670be86/supabase/functions/academic-pts-readiness/index.ts');
