import type { IncomingMessage, ServerResponse } from 'node:http';

// Minimalne typy helperów, które Vercel dokłada do req/res w funkcjach Node
export interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  body?: unknown;
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  send(body: string): void;
}

export function queryParam(req: ApiRequest, name: string): string | undefined {
  const v = req.query[name];
  return Array.isArray(v) ? v[0] : v;
}

/** Publiczny adres strony salonu, np. https://twojsalon.pl */
export function siteUrl(req: ApiRequest): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  return `https://${host}`;
}
