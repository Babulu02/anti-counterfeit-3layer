/**
 * src/lib/api.ts
 * ==============
 * Typed API client for the FastAPI backend.
 *
 * Base URL comes from the VITE_API_BASE_URL environment variable set in
 * .env.local (never committed).  Falls back to http://127.0.0.1:8000.
 *
 * No secrets live in this file — the frontend only uses public endpoints.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? "/api";

// ── Types matching backend schemas.py ────────────────────────────────────────

export interface ProductOut {
  product_id:           string;
  name:                 string;
  brand:                string;
  serial:               string;
  status:               "registered" | "sold";
  manufacturer_address: string;
  created_at:           string;
  image_sha256:         string | null;
  record_hash:          string;
}

export interface NfcPayload {
  uid:     string;
  counter: number;
  cmac:    string;
}

export interface ProductRegisterResponse {
  product:      ProductOut;
  qr_payload:   string;
  nfc_payload:  NfcPayload;
  tx_hash:      string;
}

export interface ScanResponse {
  verdict:         string;
  reason:          string;
  risk_score:      number | null;
  chain_result:    string;
  identity_result: string;
  on_chain:        boolean;
  sold:            boolean;
  chain_tx:        string | null;
  product_id:      string;
}

export interface ScanOut {
  id:              number;
  product_id:      string;
  channel:         "qr" | "nfc";
  ts:              string;
  lat:             number | null;
  lon:             number | null;
  chain_result:    string;
  identity_result: string;
  risk_score:      number | null;
  verdict:         string;
  reason:          string;
}

// ── Helper ───────────────────────────────────────────────────────────────────

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false
): Promise<T> {
  const opts: RequestInit = { method };
  if (body) {
    if (isForm) {
      opts.body = body as FormData;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body    = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** POST /products — multipart form */
export async function registerProduct(form: FormData): Promise<ProductRegisterResponse> {
  return req<ProductRegisterResponse>("POST", "/products", form, true);
}

/** GET /products */
export async function listProducts(): Promise<ProductOut[]> {
  return req<ProductOut[]>("GET", "/products");
}

/** GET /products/{id} */
export async function getProduct(id: string): Promise<ProductOut> {
  return req<ProductOut>("GET", `/products/${encodeURIComponent(id)}`);
}

/** POST /products/{id}/sell */
export async function sellProduct(id: string): Promise<{ status: string; tx_hash: string }> {
  return req("POST", `/products/${encodeURIComponent(id)}/sell`);
}

/** POST /scan */
export async function postScan(body: {
  product_id:  string;
  channel:     "qr" | "nfc";
  qr_payload?: string;
  nfc_uid?:    string;
  nfc_counter?: number;
  nfc_cmac?:   string;
  lat?:        number;
  lon?:        number;
  device_id?:  string;
  timestamp?:  string;
}): Promise<ScanResponse> {
  return req<ScanResponse>("POST", "/scan", body);
}

/** GET /products/{id}/scans */
export async function getScans(id: string): Promise<ScanOut[]> {
  return req<ScanOut[]>("GET", `/products/${encodeURIComponent(id)}/scans`);
}

/** GET /health */
export async function getHealth(): Promise<{ status: string; db: string; chain: string; contract: string }> {
  return req("GET", "/health");
}

export interface ChainInfo {
  contract_address: string;
  rpc_url:          string;
  chain_id:         number;
  owner:            string | null;
  operator:         string | null;
}

/** GET /chain/info */
export async function getChainInfo(): Promise<ChainInfo> {
  return req<ChainInfo>("GET", "/chain/info");
}

/** GET /scans/recent */
export async function getRecentScans(limit: number = 100): Promise<ScanOut[]> {
  return req<ScanOut[]>("GET", `/scans/recent?limit=${limit}`);
}


