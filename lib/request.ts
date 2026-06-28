import "server-only";

import { NextRequest, NextResponse } from "next/server";

export type RequestContext = {
  requestId: string;
  correlationId: string;
  scope: string;
  method: string;
  path: string;
};

export function createRequestContext(request: NextRequest, scope: string): RequestContext {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") || request.headers.get("x-vercel-id") || requestId;

  return {
    requestId,
    correlationId,
    scope,
    method: request.method,
    path: request.nextUrl.pathname
  };
}

export function logServerEvent(level: "info" | "warn" | "error", context: RequestContext, message: string, details?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    requestId: context.requestId,
    correlationId: context.correlationId,
    scope: context.scope,
    method: context.method,
    path: context.path,
    ...details
  };

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(JSON.stringify(payload));
}

export function jsonWithRequestContext(body: unknown, context: RequestContext, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", context.requestId);
  headers.set("x-correlation-id", context.correlationId);

  if (!headers.has("Cache-Control") && context.method !== "GET") {
    headers.set("Cache-Control", "no-store");
  }

  return NextResponse.json(body, { ...init, headers });
}

export function ensureAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowed = [request.nextUrl.origin];
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) allowed.push(configured.replace(/\/+$/, ""));

  return allowed.includes(origin.replace(/\/+$/, ""));
}

