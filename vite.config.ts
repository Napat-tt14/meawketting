import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: { "process.env.MEAWKETTING_FIXTURE_MODE": JSON.stringify("off") },
    server: { watch: { ignored: ["**/work/**", "**/tmp/**"],
      ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
    } },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          ...localBindingConfig,
          name: "meawketting",
          compatibility_date: "2026-05-15",
          // Secrets stay in Cloudflare/.dev.vars. Keep production bindings in
          // the build so GitHub deployments retain the real login configuration.
          vars: command === "serve"
            ? { MEAWKETTING_AUTH_MODE: process.env.MEAWKETTING_AUTH_MODE ?? "supabase" }
            : {
              MEAWKETTING_AUTH_MODE: "supabase",
              MEAWKETTING_ENV: "production",
              MEAWKETTING_FIXTURE_MODE: "off",
              MEAWKETTING_PUBLIC_ORIGIN: "https://meawketting.com",
            },
          ...(command === "build" ? {
            ratelimits: [{ name: "API_RATE_LIMITER", namespace_id: "1002", simple: { limit: 300, period: 60 as const } }],
          } : {}),
        },
      }),
    ],
  };
});
