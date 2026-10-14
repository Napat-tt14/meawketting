/// <reference types="@cloudflare/workers-types/latest" />

declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    IMAGES: {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
        };
      };
    };
    /** Local-only gate for the explicit BE1 development identity adapter. */
    MEAWKETTING_AUTH_MODE?: string;
    MEAWKETTING_FIXTURE_MODE?: string;
    API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
    /** Secret binding keyed by opaque channel secret reference; never exposed to clients. */
    MEAWKETTING_LINE_CREDENTIALS?: string;
  }
}
