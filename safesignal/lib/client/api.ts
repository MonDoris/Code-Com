"use client";
import { useCallback } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

/** fetch() with a fresh access token. Sensitive values never go in URLs or query strings. */
export function useApi() {
  const { getToken } = useTideCloak();
  return useCallback(
    async <T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> => {
      const token = await getToken();
      const res = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { ...(init.headers || {}), Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      return { ok: res.ok, status: res.status, data };
    },
    [getToken],
  );
}

/** Tide network refusals arrive as a generic threshold error; the contract's reason is in `cause`. */
export function describeTideError(err: unknown): string {
  const e = err as { message?: string; cause?: unknown };
  const parts = [e?.message ?? String(err)];
  let c: unknown = e?.cause;
  for (let i = 0; c && i < 3; i++) {
    const cc = c as { message?: string; cause?: unknown };
    parts.push(typeof c === "string" ? c : cc.message ?? JSON.stringify(c));
    c = typeof c === "object" ? cc.cause : undefined;
  }
  return parts.filter(Boolean).join(" | caused by: ");
}
