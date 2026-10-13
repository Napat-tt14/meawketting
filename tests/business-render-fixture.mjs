// Explicit test-only rendering of the frozen, populated Business UI.
// Production HTML is verified separately and must never render these fixtures.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "vite";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export async function businessFixtureHtml(pathname, { empty = false, dormantInbox = false } = {}) {
  const url = new URL(pathname, "http://localhost");
  const cache = await mkdtemp(join(tmpdir(), "meawketting-ui-fixture-"));
  const server = await createServer({ configFile: false, cacheDir: cache, server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "silent",
    define: { "process.env.MEAWKETTING_FIXTURE_MODE": JSON.stringify(empty ? "off" : "test") },
    resolve: { alias: { "next/image": resolve("node_modules/vinext/dist/shims/image.js"), "next/link": resolve("node_modules/vinext/dist/shims/link.js") } },
    plugins: [{ name: "business-fixture-navigation", resolveId(id) { if (id === "next/navigation") return "\0fixture-navigation"; },
      load(id) { if (id === "\0fixture-navigation") return `export const usePathname = () => ${JSON.stringify(url.pathname)}; const router = { prefetch() {} }; export const useRouter = () => router; export function redirect(path) { throw new Error("Redirect: " + path); }`; } }],
  });
  try {
    const segments = url.pathname.split("/");
    let route = url.pathname;
    const params = {};
    if (segments[2] === "customers" && segments[3]) { route = "/business/customers/[customerId]"; params.customerId = segments[3]; }
    if (segments[2] === "intake" && segments[3]) { route = "/business/intake/[intakeId]"; params.intakeId = segments[3]; }
    const { BusinessHeader } = await server.ssrLoadModule("/app/business/_components/BusinessHeader.tsx");
    const { BusinessPortalFrame } = await server.ssrLoadModule("/app/business/_components/BusinessPortalFrame.tsx");
    let page;
    if (dormantInbox && route === "/business/inbox") {
      // Exercise the preserved component directly; the public route redirects.
      const { BusinessInbox } = await server.ssrLoadModule("/app/business/inbox/BusinessInbox.tsx");
      const conversationId = url.searchParams.get("conversation");
      const customerId = url.searchParams.get("customerId");
      const petId = url.searchParams.get("petId");
      const bookingId = url.searchParams.get("bookingId");
      const launchRequest = conversationId || customerId ? { key: `${conversationId ?? "customer"}:${customerId ?? ""}:${petId ?? ""}:${bookingId ?? ""}`, conversationId, customerId, petId, bookingId } : null;
      page = createElement("main", { id: "main-content", className: "page business-page business-inbox-page" }, createElement(BusinessInbox, { launchRequest }));
    } else {
      const { default: Page } = await server.ssrLoadModule(`/app${route}/page.tsx`);
      page = await Page({ params: Promise.resolve(params), searchParams: Promise.resolve(Object.fromEntries(url.searchParams)) });
    }
    // Empty component states are isolated from the separately tested session
    // loading frame. Populated fixtures retain the complete Business frame.
    return renderToStaticMarkup(createElement(Fragment, null, createElement(BusinessHeader, { variant: "app" }), empty ? page : createElement(BusinessPortalFrame, null, page)));
  } finally { await server.close(); await rm(cache, { recursive: true, force: true }); }
}
