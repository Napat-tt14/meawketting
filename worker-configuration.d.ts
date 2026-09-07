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
  }
}
