/// <reference types="@cloudflare/workers-types/latest" />

declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    IMAGES: {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
        };
      };
    };
    /** Local-only gate for the explicit BE1 development identity adapter. */
    MEAWKETTING_AUTH_MODE?: string;
    MEAWKETTING_ENV?: "local" | "test" | "staging" | "production";
    MEAWKETTING_FIXTURE_MODE?: string;
    MEAWKETTING_PUBLIC_ORIGIN?: string;
    MEAWKETTING_GOOGLE_OWNER_EMAIL?: string;
    MEAWKETTING_GOOGLE_OWNER_PERSON_ID?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
    /** Secret binding keyed by opaque channel secret reference; never exposed to clients. */
    MEAWKETTING_LINE_CREDENTIALS?: string;
  }
}
