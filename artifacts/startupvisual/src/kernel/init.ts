// @ts-expect-error - opencascade.js has no proper TS types in v1.1.1
import initOpenCascade from "opencascade.js/dist/opencascade.wasm.js";

export type OC = any;

let _oc: OC | null = null;
let _loading: Promise<OC> | null = null;
const listeners: Set<(p: number, msg: string) => void> = new Set();

export function onKernelProgress(fn: (p: number, msg: string) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(p: number, msg: string) {
  listeners.forEach((l) => l(p, msg));
}

export function getOC(): OC | null {
  return _oc;
}

// Decode an OCCT WASM exception (which is thrown as a numeric pointer) into a readable error.
export function decodeOCCTError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "number" && _oc) {
    const oc = _oc as any;
    const tries: Array<() => string | null> = [
      () => oc.getExceptionMessage ? (Array.isArray(oc.getExceptionMessage(e)) ? oc.getExceptionMessage(e).join(" — ") : oc.getExceptionMessage(e)) : null,
      () => oc.OCJS?.getStandard_Failure?.(e)?.GetMessageString?.() ?? null,
      () => oc.UTF8ToString?.(e) ?? null,
    ];
    for (const t of tries) {
      try { const m = t(); if (m && typeof m === "string" && m.length) return new Error(`OCCT: ${m}`); } catch { /* keep trying */ }
    }
    return new Error(`OCCT exception (ptr ${e})`);
  }
  if (e && typeof e === "object") {
    const obj = e as { message?: string; toString?: () => string };
    if (obj.message) return new Error(obj.message);
    return new Error(obj.toString?.() ?? "Unknown error");
  }
  return new Error(String(e));
}

// jsDelivr & unpkg both ship the same opencascade.js@1.1.1 package — same
// kernel hash. We try local first (fast, cached), then fall back to CDNs.
const CDN_URLS = [
  "https://cdn.jsdelivr.net/npm/opencascade.js@1.1.1/dist/opencascade.wasm.wasm",
  "https://unpkg.com/opencascade.js@1.1.1/dist/opencascade.wasm.wasm",
];

// The wasm is ~63 MiB. On a typical broadband connection that is well under
// 30 s, but on slow / shared networks it can take longer; we give each source
// 90 s before falling through to the next.
const LOAD_TIMEOUT_MS = 90_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// Pre-fetch the wasm bytes ourselves so we (a) get a real error early instead
// of Emscripten's opaque "abort(both async and sync fetching...)" message,
// and (b) can race a timeout against a stalled CDN/static host.
async function fetchWasmBytes(url: string, onProgress?: (frac: number) => void): Promise<ArrayBuffer> {
  // We do NOT pass `cache: "force-cache"` — Vite's dev server sends
  // `Cache-Control: no-cache`, which makes force-cache abort the request in
  // some browsers. The default cache mode + the browser's HTTP cache + our
  // service-worker-less fallback works fine.
  const res = await withTimeout(fetch(url), LOAD_TIMEOUT_MS, `fetch ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);

  // Stream the response so we can show real progress for the 63 MiB download.
  const total = Number(res.headers.get("content-length") || 0);
  if (!res.body || !total) {
    // Fallback — no streaming progress, just one shot.
    return await withTimeout(res.arrayBuffer(), LOAD_TIMEOUT_MS, `download ${url}`);
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (onProgress) onProgress(received / total);
    }
  }
  const out = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out.buffer;
}

async function tryInitFrom(url: string, label: string): Promise<OC> {
  emit(0.10, `Downloading kernel from ${label}…`);
  const bytes = await fetchWasmBytes(url, (frac) => {
    // Map download progress to 0.10 → 0.55
    emit(0.10 + frac * 0.45, `Downloading kernel from ${label} — ${Math.round(frac * 100)}%`);
  });
  emit(0.6, "Compiling WebAssembly…");
  // Hand the already-downloaded bytes to Emscripten via instantiateWasm so it
  // never tries to fetch the file itself (which is what was failing).
  const oc = await initOpenCascade({
    locateFile: (path: string) => path,
    instantiateWasm: (
      imports: WebAssembly.Imports,
      successCb: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
    ) => {
      WebAssembly.instantiate(bytes, imports)
        .then(({ instance, module }) => successCb(instance, module))
        .catch((e) => { throw e; });
      return {};
    },
  });
  return oc;
}

export function loadKernel(): Promise<OC> {
  if (_oc) return Promise.resolve(_oc);
  if (_loading) return _loading;

  emit(0.05, "Starting OpenCascade kernel…");

  // Use BASE_URL as-is (Vite always provides a trailing slash). Stripping the
  // trailing slash and re-adding one was producing "//opencascade.wasm.wasm"
  // when BASE_URL was just "/", which the proxy then served as the SPA shell
  // (text/html), not the wasm.
  const base = import.meta.env.BASE_URL || "/";
  const local = `${base}opencascade.wasm.wasm`.replace(/\/{2,}/g, "/");
  const sources: Array<{ url: string; label: string }> = [
    { url: local, label: "local" },
    ...CDN_URLS.map((u, i) => ({ url: u, label: i === 0 ? "jsDelivr" : "unpkg" })),
  ];

  _loading = (async () => {
    const errors: string[] = [];
    for (const s of sources) {
      try {
        const oc = await tryInitFrom(s.url, s.label);
        _oc = oc;
        emit(1.0, "Kernel ready");
        return oc;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        errors.push(`${s.label}: ${err.message}`);
        // eslint-disable-next-line no-console
        console.warn(`[kernel] ${s.label} source failed:`, err.message);
        emit(0.08, `${s.label} unavailable, trying next source…`);
      }
    }
    const msg = `All kernel sources failed.\n  • ${errors.join("\n  • ")}`;
    emit(0, "Failed: " + msg);
    _loading = null;
    throw new Error(msg);
  })();

  return _loading;
}
