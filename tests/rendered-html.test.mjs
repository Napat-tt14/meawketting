import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import { createServer as createViteServer } from "vite";

// Local domain fixtures are opt-in for the isolated compatibility test server.
// The production Worker built by `build` keeps this flag disabled.
function createServer(config) {
  // Immutable SSR fixtures need no watcher; do not crawl native test clusters.
  return createViteServer({ ...config, server: { ...config.server, watch: null }, define: { ...config.define, "process.env.MEAWKETTING_FIXTURE_MODE": JSON.stringify("test") } });
}

const appRoot = new URL("../app/", import.meta.url);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const businessCssUrl = new URL("../app/business-design-system.css", import.meta.url);
const manualUrl = new URL("../docs/.htmlmanual/manual.html", import.meta.url);
const validationUrl = new URL("../docs/VALIDATION.md", import.meta.url);
const architectureUrl = new URL("../docs/ARCHITECTURE.md", import.meta.url);
const decisionsUrl = new URL("../docs/DECISIONS.md", import.meta.url);
const businessImageRoot = new URL("../public/images/business/", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function htmlFor(pathname) {
  const response = await render(pathname);
  assert.equal(response.status, 200, `${pathname} should return 200`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

test("production Business routes never render fixture identity, records or fake zero metrics before server data", async () => {
  for (const route of ["home", "calendar", "customers", "customers/customer-pim", "inbox", "scan", "intake/missing", "grooming", "hotel", "daycare", "billing", "reports", "team", "settings", "settings?section=branches"]) {
    const html = await htmlFor(`/business/${route}`);
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.match(markup, /กำลังโหลดข้อมูลร้าน/);
    assert.doesNotMatch(markup, /Whisker|Paw Partner|คุณพิม|Mochi|Luna|booking-fixture|grooming-job-fixture|hello@whisker|ยอดค้างชำระสะสม|ไม่มีรายการที่ต้องจัดการ/);
    assert.doesNotMatch(markup, /site-footer|business-marketing-footer/);
  }
  const login = await htmlFor("/business/login");
  assert.match(login, /href="\/api\/auth\/google\/start\?returnTo=%2Fbusiness%2Fhome"/);
  assert.match(login, /ใช้บัญชีที่เชื่อมกับร้านของคุณ/);
  assert.match(login, /href="\/api\/auth\/line\/start"/);
  assert.match(login, /href="\/business\/register"/);
  assert.equal((await render("/__debug")).status, 404);
  // The separate built-Worker API test supplies the Workers binding and checks
  // /api/dev/guardian; importing that API without its binding is not an HTTP test.
});

test("Business signup is a public branded route with one heading and no fixture authority", async () => {
  const html = await htmlFor("/business/register");
  assert.match(html, /เริ่มต้นพื้นที่ทำงาน/);
  assert.match(html, /business-header--auth/);
  assert.match(html, /กำลังตรวจสอบการเข้าสู่ระบบ/);
  assert.doesNotMatch(html, /กำลังโหลดข้อมูลร้าน|Whisker|Paw Partner/);
  assert.equal(countRenderedElements(html, "h1"), 1);
});

test("fixture-off selectors ignore poisoned browser records and never invent Business, catalog or customer truth", async () => {
  const previousWindow = globalThis.window;
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-no-fixtures-"));
  const server = await createViteServer({ configFile: false, cacheDir: cacheDirectory, server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "silent", define: { "process.env.MEAWKETTING_FIXTURE_MODE": JSON.stringify("off") } });
  globalThis.window = { sessionStorage: { getItem: () => JSON.stringify({ activeContextKey: "whisker-ari-frontdesk", customers: { bad: { name: "Injected Customer" } }, bookings: { bad: {} }, charges: { bad: {} }, payments: { bad: {} }, intakes: { bad: {} }, serviceJobs: { bad: {} }, teamMembers: { bad: {} } }) } };
  try {
    const state = await server.ssrLoadModule("/app/_prototype/businessState.ts");
    const context = state.DEMO_BUSINESS_CONTEXTS[0];
    for (const selector of ["listPrototypeCustomers", "listPrototypeCustomerFixtures", "listPrototypeBookings", "listPrototypeBookingFixtures", "listPrototypeTeamMembers", "listPrototypeGroomingServiceJobs", "listPrototypeHotelStays", "listPrototypeDaycareAttendances", "listPrototypeCharges", "listPrototypePayments", "listPrototypeServiceRecords", "getBookingServices", "getBookingResources"]) assert.deepEqual(state[selector](context), [], selector);
    assert.equal(state.getPrototypeBusinessProfile(context.businessId), null);
    assert.deepEqual(state.listPrototypeBusinessContexts(), []);
    assert.equal(state.getDemoBusinessContextDetails(context).business, null);
    assert.equal(state.readActiveBusinessContext().businessId, "");
    const inbox = await server.ssrLoadModule("/app/_prototype/inboxState.ts");
    assert.deepEqual(inbox.listPrototypeConversations(context), []);
    const presentation = await server.ssrLoadModule("/app/business/grooming/groomingPresentation.ts");
    const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(Date.now() - 120 * 60000)).replace(" ", "T");
    assert.ok(presentation.groomingJobLateMinutes({ status: "in-service", scheduledEnd: parts }) >= 119);
  } finally { globalThis.window = previousWindow; await server.close(); await rm(cacheDirectory, { recursive: true, force: true }); }
});

test("production build fails closed for development identity and Guardian test adapters", async () => {
  // Node does not implement the Workers binding module. Supply only that binding;
  // execute the actual production bundle, and fail if it tries to use the database.
  const binding = `export const env = { MEAWKETTING_AUTH_MODE: "dev-test", get DATABASE_URL() { throw new Error("Production queried PostgreSQL using development identity"); } };`;
  const bindingUrl = `data:text/javascript,${encodeURIComponent(binding)}`;
  register(`data:text/javascript,${encodeURIComponent(`export async function resolve(specifier, context, next) { return specifier === "cloudflare:workers" ? { url: ${JSON.stringify(bindingUrl)}, shortCircuit: true } : next(specifier, context); }`)}`, import.meta.url);
  const { default: worker } = await import(new URL("../dist/server/index.js?production-auth-check", import.meta.url).href);
  for (const path of ["/api/be1", "/api/be2", "/api/be3", "/api/be4", "/api/be5", "/api/be6", "/api/be7", "/api/be8", "/api/dev/guardian"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-meawketting-dev-person-id": "prs_01k47meawketting000000001" }, body: "{}" }),
      { MEAWKETTING_AUTH_MODE: "dev-test", get DATABASE_URL() { throw new Error("Production must reject dev identity before querying PostgreSQL"); } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, path === "/api/dev/guardian" ? 404 : 501, path);
  }
});

function countRenderedElements(html, tagName) {
  // Vinext beta.8 can stream the existing visually-hidden Business loading
  // heading before the final page. The page-title contract concerns the final
  // visible page heading, not that loading announcement.
  if (tagName === "h1") {
    return [...html.matchAll(/<h1\b[^>]*>/g)]
      .filter(([tag]) => !/\bid="business-loading-title"/.test(tag))
      .length;
  }
  const renderedMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  return (renderedMarkup.match(new RegExp(`<${tagName}\\b`, "g")) ?? []).length;
}

async function withBusinessStateTest(run) {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-bf10-bf12-test-"));
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    },
    dispatchEvent: () => true,
  };
  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type) { this.type = type; }
    };
  }
  let vite;
  try {
    vite = await createServer({
      root: projectRoot,
      configFile: false,
      cacheDir: cacheDirectory,
      server: { middlewareMode: true },
      appType: "custom",
      logLevel: "silent",
    });
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    await run({ state, vite, storage });
  } finally {
    await vite?.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  }
}

function installExecutionBookingFixture(state, context, draft, bookingId) {
  const service = state.getBookingServices(context).find((candidate) => candidate.id === draft.serviceId);
  assert.ok(service, `missing fixture service ${draft.serviceId}`);
  const occurredAt = "2026-09-07T06:00:00.000Z";
  const booking = {
    bookingId,
    customer: { ...draft.customer },
    pets: draft.pets.map((pet) => ({ ...pet })),
    businessId: context.businessId,
    branchId: context.branchId,
    serviceModule: service.module,
    service: { id: service.id, label: service.label },
    timeModel: service.timeModel,
    start: draft.start,
    end: service.timeModel === "day" ? null : draft.end,
    requiredResources: [...service.requiredResourceKinds],
    assignedResources: [...draft.assignedResourceIds],
    status: draft.status,
    estimate: draft.estimate,
    notes: draft.notes,
    revision: 1,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    cancelledAt: null,
  };
  assert.equal(state.synchronizePrototypeExecutionCompatibilityForBooking(booking), true);
  return booking;
}

async function installBe1ConfigurationFixture(state, vite) {
  const cache = await vite.ssrLoadModule("/app/_backend/be1/configurationCache.ts");
  const businessIds = [...new Set(state.DEMO_BUSINESS_CONTEXTS.map((context) => context.businessId))];
  const timestamp = "2026-09-05T00:00:00.000Z";
  cache.installBusinessSession({
    person: {
      id: "prs_01k47meawketting000000001",
      displayName: "คุณนนท์",
      primaryEmail: "owner@meawketting.example.test",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    workspaces: businessIds.map((businessId, index) => {
      const profile = state.getPrototypeBusinessProfile(businessId, true);
      const branches = state.listPrototypeBusinessBranches(businessId, { includeInactive: true, fixtureOnly: true });
      return {
        membership: {
          id: `mem_01k47meawketting00000000${index + 1}`,
          personId: "prs_01k47meawketting000000001",
          businessId,
          role: "OWNER",
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        business: {
          id: profile.businessId,
          name: profile.name,
          contactName: profile.contactName,
          phone: profile.phone,
          email: profile.email,
          description: profile.description,
          address: profile.address,
          logoUrl: profile.logoDataUrl,
          status: "active",
          createdAt: timestamp,
          updatedAt: profile.updatedAt,
        },
        permittedBranches: branches.map((branch) => ({
          id: branch.branchId,
          businessId: branch.businessId,
          name: branch.name,
          area: branch.area,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          timezone: "Asia/Bangkok",
          status: branch.active ? "active" : "inactive",
          enabledModules: branch.enabledModules,
          operatingHours: branch.operatingHours,
          createdAt: branch.createdAt,
          updatedAt: branch.updatedAt,
        })),
      };
    }),
  });
  return cache;
}

test("renders the committed Business landing with explicit illustrative content", async () => {
  const html = await htmlFor("/");
  const hero = html.match(/<section class="hotel-hero[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.equal(countRenderedElements(html, "h1"), 1);
  for (const label of ["ให้ทุกการเข้าพัก", "น่ารัก", "โรงแรมสัตว์เลี้ยง", "อาบน้ำ", "เดย์แคร์", "Pet Passport", "เจ้าของเลือกข้อมูลที่แชร์", "ภาพประกอบและข้อมูลตัวอย่าง"]) assert.ok(html.includes(label), label);
  for (const href of ["/business/login", "/my-pets", "/create-passport", "#business-core"]) assert.ok(html.includes('href="' + href + '"'), href);
  assert.match(hero, /href="\/business\/login"[\s\S]*เริ่มต้นใช้งานสำหรับธุรกิจ/);
  assert.match(hero, /href="#business-core"[\s\S]*มาดูกันว่าช่วยอะไรได้บ้าง/);
  assert.match(hero, /pet-hotel-transparent\.png/);
  assert.doesNotMatch(hero, /href="\/create-passport"|สร้าง Pet Passport/);
  assert.match(html, /logo\.svg/);
});

test("keeps the Business-first homepage honest, linked, responsive, and Pastel-Yellow-primary", async () => {
  const [html, css, businessCss, pageSource, headerSource, heroSource, coreSource, workflowSource, closingSource, scrollSource, homepageStyles] = await Promise.all([
    htmlFor("/"),
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessCoreSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessWorkflowSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessClosingSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/ScrollToTopButton.tsx", appRoot), "utf8"),
    readFile(new URL("homepage.css", appRoot), "utf8"),
  ]);
  const landingSource = pageSource + heroSource + coreSource + workflowSource + closingSource;
  const homepageCss = css.slice(css.indexOf("Business-first root homepage — 2026-08-20")) + homepageStyles;

  assert.match(pageSource, /<BusinessLandingHero \/>[\s\S]*<BusinessCoreSection \/>[\s\S]*<BusinessClosingSection \/>/);
  assert.match(pageSource, /<ScrollToTopButton \/>/);
  assert.doesNotMatch(pageSource, /const serviceModules|const businessCoreCapabilities|style=\{/);
  assert.match(heroSource, /href="\/business\/login"/);
  assert.match(closingSource, /href="\/my-pets"/);
  assert.match(closingSource, /href="\/create-passport"/);
  assert.match(closingSource, /id="guardian"/);
  assert.match(coreSource, /ภาพรวมสำหรับร้าน/);
  assert.match(workflowSource, /ทีมเห็นจังหวะสำคัญ/);
  assert.doesNotMatch(landingSource, /Visit\s*\/\s*Order|Service Job|Resource|จัดการธุรกิจครบทุกอย่างแล้ว|ทดลองใช้งานวันนี้/i);
  assert.doesNotMatch(landingSource, /ข้อมูลจำลอง|ในเครื่อง|กำลังพัฒนา|ต้นแบบ|ทิศทางผลิตภัณฑ์|repository|Product prototype/i);

  assert.match(headerSource, /href="#business-core"/);
  assert.match(headerSource, /href="#services"/);
  assert.match(headerSource, /href="#guardian"/);
  assert.doesNotMatch(headerSource, /href="\/login"/);
  assert.match(headerSource, /href="\/business\/login"/);
  for (const id of ["business-core", "services", "guardian"]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(css, /--color-meaw-business-primary:\s*#f4c95d/i);
  assert.match(css, /--color-meaw-business-primary-foreground:\s*#3d2b00/i);
  const businessPrimaryButton = businessCss.match(/\.button--business\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(businessPrimaryButton, /background:\s*var\(--primary\)/);
  assert.match(businessPrimaryButton, /color:\s*var\(--primary-foreground\)/);
  assert.doesNotMatch(homepageCss, /teal/i);
  assert.match(homepageCss, /\.business-homepage\s*\{[\s\S]*?overflow-x:\s*clip/);
  assert.match(homepageCss, /grid-template-columns:\s*minmax\(0, \.98fr\) minmax\(0, 1\.02fr\)/);
  assert.match(homepageCss, /@media \(max-width: 1023px\)/);
  assert.match(homepageCss, /@media \(max-width: 767px\)/);
  assert.match(homepageCss, /grid-template-areas:\s*"tag" "title" "showcase" "lead" "actions" "pills" "note" "guardian"/);
  assert.match(homepageCss, /\.business-homepage-hero__copy\s*\{\s*display: contents;/);
  assert.match(homepageCss, /\.business-homepage-hero \.business-product-preview__photo\s*\{[\s\S]*?min-height: 0;[\s\S]*?max-height: none;/);
  assert.match(homepageCss, /@media \(max-width: 430px\)/);
  assert.match(homepageCss, /@media \(max-width: 359px\)/);
  assert.match(homepageCss, /\.home-scroll-top\s*\{/);
  assert.match(homepageCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(scrollSource, /window\.scrollTo\(\{ top: 0, behavior \}/);
  assert.match(scrollSource, /prefers-reduced-motion/);
});

test("keeps committed clay landing assets explicit and independent from legacy photos", async () => {
  const [heroSource, servicesSource, hybridSource, workflowSource, closingSource, css] = await Promise.all([
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessServicesSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/HybridBusinessSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessWorkflowSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessClosingSection.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);
  const assets = (await readdir(businessImageRoot)).sort();
  const landingSources = heroSource + servicesSource + hybridSource + workflowSource + closingSource;

  assert.deepEqual(assets, [
    "business-auth-welcome.png",
    "business-banner-care-lounge.png",
    "business-banner-grooming.png",
    "business-banner-hotel.png",
    "business-register-welcome.png",
    "pet-business-hero-photo.png",
    "pet-business-services-photo.png",
    "pet-business-workflow-photo.png",
  ]);
  assert.match(heroSource, /pet-hotel-transparent\.png/);
  assert.match(heroSource, /width=\{1200\} height=\{800\}/);
  assert.match(heroSource, /priority unoptimized/);
  await access(new URL("../public/images/landing/pet-hotel-transparent.png", import.meta.url));
  assert.match(servicesSource, /pet-hotel-room/);
  assert.match(servicesSource, /pet-grooming-transparent/);
  assert.match(servicesSource, /pet-daycare-transparent/);
  assert.doesNotMatch(landingSources + css, /images\/cats|stickers|business-hero-scene|business-services-scene|cali-laptop-hero/);
  assert.doesNotMatch(landingSources, /ภาพถ่ายประกอบ|ภาพประกอบแนวคิด/);
  assert.match(css, /\.business-homepage \.shell,[\s\S]*?width: min\(1200px, calc\(100% - 64px\)\)/);
  assert.match(css, /@keyframes business-landing-gradient/);
  assert.match(css, /\.business-product-preview__photo/);
});

test("keeps the public landing independent from the removed cat sticker library", async () => {
  const catRoot = new URL("../public/images/cats/", import.meta.url);
  await assert.rejects(access(catRoot));
});

test("keeps one semantic app canvas while separating Consumer and Business chrome", async () => {
  const [css, layoutSource, routeFooterSource, siteHeaderSource, appHeaderSource, appNavSource, menuSource, consumerShellSource, bottomNavigationSource, businessHeaderSource, businessMenuSource] = await Promise.all([
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("layout.tsx", appRoot), "utf8"),
    readFile(new URL("_components/RouteFooter.tsx", appRoot), "utf8"),
    readFile(new URL("_components/SiteHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/AppHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/AppNav.tsx", appRoot), "utf8"),
    readFile(new URL("_components/UserMenu.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/ConsumerShell.tsx", appRoot), "utf8"),
    readFile(new URL("_components/BottomNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessHeader.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessUserMenu.tsx", appRoot), "utf8"),
  ]);

  assert.match(css, /--color-meaw-app-background:\s*var\(--color-meaw-cream-100\)/);
  assert.match(css, /--app-background:\s*var\(--color-meaw-app-background\)/);
  assert.match(css, /html\s*\{[\s\S]*?background:\s*var\(--app-background\)/);
  assert.match(css, /body\s*\{[\s\S]*?background:\s*var\(--app-background\)/);
  assert.match(css, /\.page--create-passport\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(css, /\.temporary-gateway-page\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(css, /@keyframes meaw-button-ripple/);
  assert.match(css, /\.nav-link::after[\s\S]*?transform: scaleX\(0\)/);
  assert.match(css, /\.app-nav__link::after[\s\S]*?transform: scaleX\(0\)/);
  assert.match(css, /\.draft-passport-option:active::after/);
  assert.match(layoutSource, /<SiteHeader \/>[\s\S]*<RouteFooter \/>/);
  assert.doesNotMatch(layoutSource, /<SiteFooter \/>/);
  assert.match(routeFooterSource, /new Set\(\["\/"\]\)/);
  assert.match(routeFooterSource, /fullFooterRoutes\.has\(pathname\) \? <SiteFooter \/> : null/);
  assert.match(siteHeaderSource, /variant="consumer" displayName="มิว"/);
  assert.match(appHeaderSource, /<AppNav mode=\{mode\} \/>/);
  assert.match(appHeaderSource, /<UserMenu[\s\S]*authenticated=\{consumer\}/);
  assert.doesNotMatch(appHeaderSource + appNavSource + siteHeaderSource + menuSource, /showLogin|<AppHeader variant="auth"|if \(variant === "auth"\)|href="\/login"/);
  assert.match(appNavSource, /appNavItems/);
  assert.match(appNavSource, /consumerNavItems[\s\S]*หน้าหลัก[\s\S]*สัตว์เลี้ยง[\s\S]*กิจกรรม[\s\S]*ข้อความ/);
  assert.match(appNavSource, /aria-disabled="true"/);
  assert.match(menuSource, /aria-haspopup="menu"/);
  assert.match(menuSource, /event\.key !== "Escape"/);
  assert.match(menuSource, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
  assert.match(menuSource, /event\.key === "Tab"/);
  assert.match(menuSource, /pointerdown/);
  assert.match(menuSource, /onLogout/);
  assert.match(menuSource, /user-menu--signed-out/);
  assert.match(menuSource, /user-menu__create-cta/);
  assert.match(menuSource, /user-menu__sheet-header/);
  assert.match(menuSource, /user-menu__backdrop/);
  assert.match(menuSource, /<strong>Account<\/strong>/);
  assert.match(menuSource, /label: "Session"/);
  assert.match(menuSource, /user-menu__account-summary/);
  const authenticatedMenuSource = menuSource.slice(menuSource.indexOf("const groups"));
  assert.doesNotMatch(authenticatedMenuSource, /business|สำหรับธุรกิจ|\/business\//i);
  assert.doesNotMatch(appHeaderSource + appNavSource, /variant === "business"|AppNavMode = [^\n]*business/);
  assert.match(siteHeaderSource, /pathname === "\/business"[\s\S]*BusinessHeader variant="landing"/);
  assert.match(siteHeaderSource, /pathname === "\/business\/login"[\s\S]*BusinessHeader variant="auth"/);
  assert.match(siteHeaderSource, /pathname === "\/activity"[\s\S]*AppHeader variant="consumer"/);
  assert.match(businessHeaderSource, /href="\/business\/scan"[\s\S]*สแกนรับเข้า/);
  assert.match(businessMenuSource, /ร้านและสาขา[\s\S]*หน้าที่ปัจจุบัน/);
  assert.doesNotMatch(businessHeaderSource + businessMenuSource, /My Pets|Create Passport|Activity/);
  assert.doesNotMatch(consumerShellSource, /<header|<UserMenu/);
  assert.match(consumerShellSource, /consumer-bottom-nav[\s\S]*<BottomNavigation context="consumer" \/>/);
  assert.match(bottomNavigationSource, /หน้าหลัก/);
  assert.match(bottomNavigationSource, /สัตว์เลี้ยง/);
  assert.match(bottomNavigationSource, /กิจกรรม/);
  assert.match(bottomNavigationSource, /ข้อความ/);
  assert.doesNotMatch(bottomNavigationSource, /Create Passport|สร้าง Passport|href="\/create-passport"/);
  assert.match(bottomNavigationSource, /aria-disabled="true"/);
  assert.match(bottomNavigationSource, /consumerItems/);
  assert.doesNotMatch(siteHeaderSource + appHeaderSource + consumerShellSource, /<details className="user-menu/);
});

test("renders the combined anonymous create flow", async () => {
  const [html, source] = await Promise.all([
    htmlFor("/create-passport"),
    readFile(new URL("create-passport/PhotoUploadStep.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /สร้าง Passport ของน้อง/);
  assert.doesNotMatch(html, /Photo\s*Info\s*Preview/);
  assert.doesNotMatch(html, /ขั้นที่ 1 จาก 2/);
  assert.doesNotMatch(html + source, /เลือก Passport ให้น้อง|กรอบรูปสี่เหลี่ยม|รู้จักน้องอีกนิด|รูปพร้อมแล้ว/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html, /JPG, PNG หรือ WebP · สูงสุด 10 MB/);
  assert.match(html, /ข้อมูลอื่น ๆ เติมเพิ่มทีหลังได้เสมอ/);
  assert.match(html, /ดู Passport/);
  assert.doesNotMatch(html, /Crop รูปของน้อง|Crop ได้ก่อนทำ Passport/);
  assert.doesNotMatch(html, /ยังไม่ต้อง Login/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /type="email"|type="password"|type="tel"/);
  assert.match(source, /acceptedFileTypes/);
  assert.match(source, /MAX_FILE_SIZE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(source, /file\.size > MAX_FILE_SIZE_BYTES/);
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /NotAllowedError/);
  assert.match(source, /function removePhoto\(/);
  assert.match(source, /function applyCrop\(/);
  assert.match(html, /photo-dropzone__frame/);
  assert.match(source, /guideTo\(/);
  assert.match(source, /disabled=\{!hydrated \|\| isContinuing \|\| isProcessing/);
  assert.doesNotMatch(source, /รูปยังอยู่แค่ในแท็บนี้/);
});

test("combines PUB-002 and PUB-003 into one create step", async () => {
  const [html, source, legacyResponse] = await Promise.all([
    htmlFor("/create-passport"),
    readFile(new URL("create-passport/PhotoUploadStep.tsx", appRoot), "utf8"),
    render("/create-passport/minimum-info"),
  ]);

  assert.doesNotMatch(html, /เติมข้อมูลสั้น ๆ/);
  assert.match(html, /น้องชื่ออะไร \?/);
  assert.match(html, /ชนิดสัตว์/);
  assert.match(source, /<form\b/);
  assert.match(source, /name="pet-name"/);
  assert.match(source, /type="radio"[\s\S]*?value="cat"/);
  assert.match(source, /type="radio"[\s\S]*?value="dog"/);
  assert.match(source, /router\.push\("\/create-passport\/preview"\)/);
  assert.doesNotMatch(source, /type="email"|type="password"|type="tel"/);
  assert.equal(legacyResponse.status, 307);
  assert.equal(legacyResponse.headers.get("location"), "/create-passport");
});

test("keeps crop editable and preserves a reusable Passport status contract", async () => {
  const [photoSource, contextSource, cardSource, css] = await Promise.all([
    readFile(new URL("create-passport/PhotoUploadStep.tsx", appRoot), "utf8"),
    readFile(new URL("create-passport/DraftPassportContext.tsx", appRoot), "utf8"),
    readFile(new URL("_components/PassportCard.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(photoSource, /originalDataUrl/);
  assert.match(photoSource, /จัดการรูป/);
  assert.match(photoSource, /setCropSource\(null\)/);
  assert.match(contextSource, /originalDataUrl\?/);
  assert.match(cardSource, /status\?: "draft" \| "claimed"/);
  assert.match(cardSource, /CLAIMED/);
  assert.match(cardSource, /canvas\.width = 1080/);
  assert.match(cardSource, /canvas\.height = 1350/);
  assert.match(photoSource, /handleCropPointerDown/);
  assert.match(photoSource, /handleCropKeyDown/);
  assert.match(photoSource, /onWheel=/);
  assert.match(photoSource, /pinchRef/);
  assert.match(photoSource, /type="range"/);
  assert.match(photoSource, /photo-actions-menu__backdrop/);
  assert.doesNotMatch(photoSource, /photo-file-name/);
  assert.equal((photoSource.match(/className="button button--paper photo-actions-menu__trigger"/g) ?? []).length, 1);
  assert.match(css, /\.crop-viewport img\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.doesNotMatch(css, /\.crop-viewport img\s*\{[^}]*object-fit:\s*fill/);
});

test("keeps PUB-004 exportable while Consumer account connection moves to LINE", async () => {
  const [previewHtml, successResponse, claimResponse, authResponse, previewSource, contextSource, passportSource] = await Promise.all([
    htmlFor("/create-passport/preview"),
    render("/create-passport/success"),
    render("/create-passport/claim"),
    render("/create-passport/auth/google"),
    readFile(new URL("create-passport/preview/PassportPreviewStep.tsx", appRoot), "utf8"),
    readFile(new URL("create-passport/DraftPassportContext.tsx", appRoot), "utf8"),
    readFile(new URL("_components/PassportCard.tsx", appRoot), "utf8"),
  ]);

  assert.match(previewHtml, /เลือก Passport ให้น้อง/);
  assert.doesNotMatch(previewHtml, /create-progress|Photo\s*Info\s*Preview/);
  assert.doesNotMatch(previewHtml, />DRAFT<|แก้ไขรูป|แก้ไขชื่อหรือชนิดสัตว์|บันทึกเป็นภาพ 4:5/);
  assert.equal(successResponse.status, 307);
  assert.equal(successResponse.headers.get("location"), "/my-pets/claimed-local");
  assert.equal(claimResponse.status, 404);
  assert.equal(authResponse.status, 404);

  assert.match(previewSource, /passportStyles\.map/);
  assert.equal((previewSource.match(/<PassportCard\b/g) ?? []).length, 1);
  assert.match(previewSource, /passport-style-selector__grid/);
  assert.match(previewSource, /บันทึกภาพ/);
  assert.match(previewSource, /passport-save-planned/);
  assert.match(previewSource, /LINE/);
  assert.doesNotMatch(previewSource, /GoogleAuthButton|preview-google-action|router\.push\("\/login/);
  assert.match(passportSource, /canvas\.width = 1080/);
  assert.match(passportSource, /canvas\.height = 1350/);

  assert.match(contextSource, /window\.sessionStorage/);
  assert.match(contextSource, /PROTOTYPE ONLY/);
  assert.match(contextSource, /not a production retention, expiry, upload, or persistence policy/);
});

test("renders CON-001 and CON-002 as distinct Consumer surfaces", async () => {
  const [myPetsHtml, detailHtml, myPetsSource, cardSource, detailSource, actionRowSource, bridgeSource, appNavSource, appHeaderSource] = await Promise.all([
    htmlFor("/my-pets"),
    htmlFor("/my-pets/unknown-prototype-pet"),
    readFile(new URL("my-pets/MyPetsScreen.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/PetCard.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/PetDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/PetActionRow.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/consumerPets.ts", appRoot), "utf8"),
    readFile(new URL("_components/AppNav.tsx", appRoot), "utf8"),
    readFile(new URL("_components/AppHeader.tsx", appRoot), "utf8"),
  ]);

  assert.match(myPetsHtml, /My Pets/);
  assert.match(myPetsHtml, /กำลังโหลดสัตว์เลี้ยง/);
  assert.match(detailHtml, /กำลังเปิดข้อมูลสัตว์เลี้ยง/);
  assert.match(myPetsSource, /สร้าง Pet Passport/);
  assert.match(myPetsSource, /href="\/create-passport"/);
  assert.match(myPetsSource, /QA fixture/);
  assert.doesNotMatch(myPetsSource, /sessionStorage ของแท็บนี้/);
  assert.match(myPetsSource, /"permission-denied"/);
  assert.match(cardSource, /photoSrc/);
  assert.match(cardSource, /speciesLabel/);
  assert.match(cardSource, /PetStatus/);
  assert.match(cardSource, /guardianRoleLabel/);
  assert.doesNotMatch(cardSource, /medication|allergy|health|private note|business/i);
  assert.match(detailSource, /"not-found"/);
  assert.match(detailSource, /"permission-denied"/);
  assert.match(detailSource, /ไม่ได้แสดงข้อมูลของสัตว์เลี้ยงตัวอื่นแทน/);
  assert.match(detailSource, /ยังไม่ได้เพิ่มข้อมูลสุขภาพและการดูแล/);
  assert.match(detailSource, /ยังไม่มีประวัติบริการ/);
  assert.doesNotMatch(detailSource, /href="\/qr-preview"|href="\/passports"/);
  assert.match(detailSource, /pet-detail-sections/);
  assert.match(detailSource, /pet-management-section/);
  assert.match(detailSource, /<PetActionRow/);
  assert.doesNotMatch(detailSource, /pet-category-nav|Pet Detail · Overview/);
  assert.match(actionRowSource, /icon: Icon/);
  assert.match(actionRowSource, /title/);
  assert.match(actionRowSource, /status/);
  assert.match(actionRowSource, /description/);
  assert.match(actionRowSource, /ChevronRight/);
  assert.match(bridgeSource, /PROTOTYPE ONLY/);
  assert.match(bridgeSource, /not production persistence, authorization, or ownership/);
  assert.match(bridgeSource, /window\.sessionStorage/);
  assert.match(appNavSource, /href: "\/"/);
  assert.match(appNavSource, /href: "\/qr-preview"/);
  assert.match(appNavSource, /href: "\/activity"/);
  assert.match(appHeaderSource, /authenticated=\{consumer\}/);
});

test("renders Consumer Activity as an honest frequent destination", async () => {
  const [html, source] = await Promise.all([
    htmlFor("/activity"),
    readFile(new URL("activity/ActivityScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /กิจกรรมของน้อง ๆ/);
  assert.match(html, /เมนูหลักสำหรับผู้ดูแลสัตว์เลี้ยง/);
  for (const category of ["ประวัติการใช้บริการ", "การเข้าถึงจากธุรกิจ", "เหตุการณ์ตามหา", "การแจ้งเตือน"]) {
    assert.match(html, new RegExp(category));
    assert.match(source, new RegExp(category));
  }
  assert.match(source, /จะแสดงที่นี่/);
  assert.doesNotMatch(source, /fixture|mock event|fake record/i);
});

test("keeps Consumer recovery usable when claimed draft is unavailable", async () => {
  const [detailSource, myPetsSource] = await Promise.all([
    readFile(new URL("my-pets/[petId]/PetDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/MyPetsScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(detailSource, /ไม่พบสัตว์เลี้ยงรายการนี้/);
  assert.match(detailSource, /href="\/create-passport"/);
  assert.match(detailSource, /href="\/my-pets\/demo-luna"/);
  assert.match(myPetsSource, /href="\/my-pets\/demo-luna"/);
  assert.match(detailSource, /getPrototypePetBySlug\(petId\)/);
  assert.match(detailSource, /ยังไม่พบ Passport นี้ ลองกลับไปสร้าง Passport ใหม่แล้วเปิดอีกครั้ง/);
});

test("keeps claimed-local focused on a five-minute Quick Passport QR", async () => {
  const [detailSource, quickSource, passportSource, css] = await Promise.all([
    readFile(new URL("my-pets/[petId]/PetDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/QuickPassportCard.tsx", appRoot), "utf8"),
    readFile(new URL("_components/PassportCard.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(detailSource, /<QuickPassportCard pet=\{pet\} \/>/);
  assert.ok(detailSource.indexOf("<QuickPassportCard") < detailSource.indexOf("<div className=\"pet-detail-sections\">"));
  assert.match(detailSource, /canShareWithBusiness[\s\S]*?Temporary Business Access/);
  assert.match(detailSource, /<PetSafetyQuickPanel pet=\{pet\} \/>/);
  assert.match(detailSource, /pet-management-section/);
  assert.doesNotMatch(detailSource, /<dt>Passport<\/dt>/);
  assert.doesNotMatch(detailSource, /pet-category-nav|จัดการ Passport/);
  assert.doesNotMatch(detailSource, /โปรไฟล์นี้มีเฉพาะข้อมูลขั้นต่ำ/);
  assert.match(quickSource, /5 \* 60 \* 1000/);
  assert.match(quickSource, /scope=passport-safe/);
  assert.match(quickSource, /Expired/);
  assert.match(quickSource, /Regenerate QR/);
  assert.match(quickSource, /Barcode/);
  assert.doesNotMatch(quickSource, /QUICK PASSPORT QR/);
  assert.match(quickSource, /aria-label="แตะ QR เพื่อพลิกกลับ"/);
  assert.match(quickSource, /แชร์ Passport/);
  assert.doesNotMatch(quickSource, /ไม่ใช่ Public Safety QR และไม่ใช่ Temporary Business Access/);
  assert.match(quickSource, /savePassportAsImage/);
  assert.match(passportSource, /aspect-ratio|canvas\.height = 1350|canvas\.width = 1080/);
  assert.match(css, /\.quick-passport[\s\S]*?aspect-ratio:\s*4 \/ 5/);
  assert.doesNotMatch(css, /\.share-passport--sticker\s*\{[^}]*transform:/);
  assert.match(css, /\.quick-passport__inner\s*\{\s*transition-duration:\s*0\.01ms/);
});

test("keeps Consumer fixtures explicit and status cues non-color-only", async () => {
  const [bridgeSource, statusSource, css] = await Promise.all([
    readFile(new URL("_prototype/consumerPets.ts", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/PetStatus.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  for (const state of ["multiple", "empty", "lost", "archived", "memorial", "transferred"]) {
    assert.match(bridgeSource, new RegExp(`"${state}"`));
  }
  for (const label of ["กำลังดูแล", "กำลังตามหา", "ในความทรงจำ", "เก็บถาวร", "โอนการดูแลแล้ว"]) {
    assert.match(statusSource, new RegExp(label));
  }
  assert.match(statusSource, /Icon/);
  assert.match(css, /\.pet-status--lost/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(max-width:\s*470px\)/);
});

test("renders all six Passport choices and the Minimal Japan query state", async () => {
  const [html, source, css] = await Promise.all([
    htmlFor("/passports?style=6"),
    readFile(new URL("passports/PassportStudio.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  for (const style of [
    "Classic",
    "Booklet",
    "Sticker Book",
    "Polaroid",
    "Retro Ticket",
    "Minimal Japan",
  ]) {
    assert.match(html, new RegExp(style));
  }

  assert.match(html, /Quiet precision/);
  assert.match(html, /share-passport--japan/);
  assert.match(html, /แมว/);
  assert.match(html, /สุนัข/);
  assert.match(html, /แตะ Passport เพื่อพลิกดู QR/);
  assert.match(source, /passport-flip__trigger/);
  assert.match(source, /aria-pressed=\{flipped\}/);
  assert.match(source, /setFlipped\(false\)/);
  assert.match(source, /passport-flip__back/);
  assert.match(source, /PassportCard/);
  assert.match(css, /\.passport-flip__inner/);
  assert.match(css, /aspect-ratio:\s*4 \/ 5/);
  assert.match(css, /rotateY\(180deg\)/);
  assert.match(css, /\.style-choice\.is-active/);
});

test("renders owner and business sides of the QR behavior", async () => {
  const html = await htmlFor("/qr-preview");

  assert.match(html, /สร้าง Temporary Business QR/);
  assert.match(html, /หน้ารับข้อมูลหลังสแกน/);
  assert.match(html, /จำลองสแกน QR/);
  assert.match(html, /ร้านเห็น/);
  assert.match(html, /ร้านไม่เห็น/);
  assert.match(html, /Public Safety QR/);
});

test("connects CON-002 to the owner Public Safety flow", async () => {
  const [detailSource, safetyHtml, claimedSafetyResponse, safetySource, panelSource, stateSource] = await Promise.all([
    readFile(new URL("my-pets/[petId]/PetDetailScreen.tsx", appRoot), "utf8"),
    htmlFor("/my-pets/demo-luna/safety"),
    render("/my-pets/claimed-local/safety"),
    readFile(new URL("my-pets/[petId]/safety/SafetyOwnerScreen.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/_components/PetSafetyQuickPanel.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/safetyState.ts", appRoot), "utf8"),
  ]);

  assert.match(detailSource, /PetSafetyQuickPanel/);
  assert.match(detailSource, /safetyOpen/);
  assert.match(detailSource, /id="safety-settings"/);
  assert.equal(claimedSafetyResponse.status, 307);
  assert.equal(claimedSafetyResponse.headers.get("location"), "/my-pets/claimed-local");
  assert.match(safetyHtml, /กำลังเปิดการตั้งค่า Public Safety QR/);
  assert.match(safetySource, /SAFE-001/);
  assert.match(safetySource, /Preview Safety Profile/);
  assert.match(safetySource, /Activate Safety Profile/);
  assert.match(safetySource, /SAFE-003/);
  assert.match(safetySource, /Public Safety QR/);
  assert.match(safetySource, /ไม่ใช่ Temporary Business QR/);
  assert.match(panelSource, /เปิด–ปิดได้ทุกเมื่อ/);
  assert.match(panelSource, /lostFields/);
  assert.doesNotMatch(safetySource, /สร้าง Temporary Business QR|One-time scope/);
  assert.match(stateSource, /window\.sessionStorage/);
  assert.match(stateSource, /PROTOTYPE STATE ONLY/);
  assert.match(stateSource, /not production persistence/);
});

test("keeps public fields owner-selected and sensitive data out of the public card", async () => {
  const [stateSource, ownerSource, publicCardSource] = await Promise.all([
    readFile(new URL("_prototype/safetyState.ts", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/safety/SafetyOwnerScreen.tsx", appRoot), "utf8"),
    readFile(new URL("safety/_components/SafetyProfileCard.tsx", appRoot), "utf8"),
  ]);

  assert.match(stateSource, /photo: false/);
  assert.match(stateSource, /features: false/);
  assert.match(stateSource, /approach: false/);
  assert.match(stateSource, /emergency: false/);
  assert.match(ownerSource, /HIDDEN BY DEFAULT/);
  assert.match(ownerSource, /เบอร์โทรจริงและที่อยู่บ้าน/);
  assert.match(publicCardSource, /PUBLIC VIEWER PERSPECTIVE/);
  assert.match(publicCardSource, /state\.publicFields\.features/);
  assert.match(publicCardSource, /state\.publicFields\.approach/);
  assert.doesNotMatch(publicCardSource, /\bphone\b|home address|health history|documents|private notes|payment|business history/i);
});

test("renders safe no-login public Safety states without leaking invalid identifiers", async () => {
  const [publicHtml, publicSource, stateSource] = await Promise.all([
    htmlFor("/safety/prototype-safety-demo-luna"),
    readFile(new URL("safety/[publicId]/PublicSafetyScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/safetyState.ts", appRoot), "utf8"),
  ]);

  assert.match(publicHtml, /กำลังตรวจ Public Safety link/);
  assert.match(publicHtml, /No login/);
  assert.match(publicSource, /"invalid"/);
  assert.match(publicSource, /"disabled"/);
  assert.match(publicSource, /"restricted"/);
  assert.match(publicSource, /เราไม่แสดงชื่อ รูป หรือยืนยัน/);
  assert.match(publicSource, /ไม่เปิดเบอร์โทรจริง ที่อยู่บ้าน/);
  assert.match(publicSource, /mediated contact concept/);
  assert.match(stateSource, /PUBLIC_SAFETY_ID_PREFIX = "prototype-safety-"/);
  assert.match(stateSource, /public-token security mechanism/);
});

test("implements the complete owner Lost lifecycle and return to Safety", async () => {
  const [lostHtml, lostSource, stateSource] = await Promise.all([
    htmlFor("/my-pets/demo-luna/safety/lost"),
    readFile(new URL("my-pets/[petId]/safety/lost/LostOwnerScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/safetyState.ts", appRoot), "utf8"),
  ]);

  assert.match(lostHtml, /กำลังเปิด Lost Mode/);
  for (const surface of ["SAFE-004", "SAFE-005", "SAFE-006", "SAFE-007", "SAFE-009", "SAFE-010", "SAFE-011"]) {
    assert.match(lostSource, new RegExp(surface));
  }
  assert.match(lostSource, /Area-level text/);
  assert.match(lostSource, /Activate Lost Mode/);
  assert.match(lostSource, /Lost Case Dashboard/);
  assert.match(lostSource, /Confirm Pet Found/);
  assert.match(lostSource, /Return to Safety Profile/);
  assert.match(lostSource, /"mark-found-error"/);
  assert.match(lostSource, /"no-leads"/);
  assert.match(lostSource, /"suspicious"/);
  assert.match(stateSource, /status: "lost"/);
  assert.match(lostSource, /status: "active"/);
});

test("allows anonymous Finder leads with error recovery and owner-side persistence", async () => {
  const [leadHtml, leadSource] = await Promise.all([
    htmlFor("/safety/prototype-safety-demo-luna/lead"),
    readFile(new URL("safety/[publicId]/lead/FinderLeadScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(leadHtml, /กำลังเปิดแบบส่งเบาะแส/);
  assert.match(leadSource, /SAFE-008/);
  assert.match(leadSource, /NO ACCOUNT REQUIRED/);
  assert.match(leadSource, /"network-fail"/);
  assert.match(leadSource, /ข้อความ บริเวณ และชื่อไฟล์ยังอยู่/);
  assert.match(leadSource, /writeSafetyPrototypeState/);
  assert.match(leadSource, /leads: \[lead, \.\.\.safety\.lostCase\.leads\]/);
  assert.doesNotMatch(leadSource, /type="email"|type="tel"|sign.?in|log.?in/i);
});

test("provides public abuse reporting with preserved input and no admin implementation", async () => {
  const [reportHtml, reportSource] = await Promise.all([
    htmlFor("/safety/prototype-safety-demo-luna/report"),
    readFile(new URL("safety/[publicId]/report/AbuseReportScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(reportHtml, /กำลังเปิดแบบรายงาน/);
  assert.match(reportSource, /PUB-008/);
  for (const category of ["ข้อมูลทำให้เข้าใจผิด", "เนื้อหาไม่ปลอดภัย", "การคุกคามหรือสแปม", "ปัญหา QR", "อื่น ๆ"]) {
    assert.match(reportSource, new RegExp(category));
  }
  assert.match(reportSource, /"failure"/);
  assert.match(reportSource, /รายละเอียดที่พิมพ์ไว้ยังอยู่ครบ/);
  assert.match(reportSource, /ยังไม่มี moderation workflow, Platform Admin flow หรือ SLA จริง/);
});

test("connects CON-002 to temporary Business Sharing without changing Public Safety", async () => {
  const [detailSource, sharingHtml, sharingState, safetySource] = await Promise.all([
    readFile(new URL("my-pets/[petId]/PetDetailScreen.tsx", appRoot), "utf8"),
    htmlFor("/my-pets/demo-luna/sharing"),
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/safetyState.ts", appRoot), "utf8"),
  ]);

  assert.match(detailSource, /Temporary Business Access/);
  assert.match(detailSource, /href=\{`\/my-pets\/\$\{pet\.prototypeSlug\}\/sharing`\}/);
  assert.match(detailSource, /canShareWithBusiness \?/);
  assert.match(detailSource, /PetSafetyQuickPanel/);
  const claimedSharingResponse = await render("/my-pets/claimed-local/sharing");
  assert.equal(claimedSharingResponse.status, 307);
  assert.equal(claimedSharingResponse.headers.get("location"), "/my-pets/claimed-local");
  assert.match(sharingHtml, /กำลังเปิด Temporary Business Sharing/);
  assert.match(sharingState, /meawketting:business-sharing:prototype-v1/);
  assert.match(safetySource, /meawketting:safety-lost:prototype-v1/);
  assert.notEqual(
    sharingState.match(/SHARING_STORAGE_KEY = "([^"]+)/)?.[1],
    safetySource.match(/SAFETY_STORAGE_KEY = "([^"]+)/)?.[1],
  );
});

test("keeps Business fixtures fictional, branch-specific, and suspended recipients blocked", async () => {
  const [stateSource, ownerSource] = await Promise.all([
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
  ]);

  for (const fixture of ["Whisker Rest Demo", "Gentle Groom Demo", "Paw Partner Demo", "Quiet Paws Demo"]) {
    assert.match(stateSource, new RegExp(fixture));
  }
  assert.match(stateSource, /verification: "suspended"/);
  assert.match(stateSource, /สาขาอารีย์ \(Demo\)/);
  assert.match(stateSource, /ชื่อคล้ายอีกรายการ/);
  assert.match(ownerSource, /business\.verification === "suspended"/);
  assert.match(ownerSource, /disabled=\{!business \|\| !branch \|\| business\.verification === "suspended"\}/);
  assert.match(ownerSource, /role="combobox"/);
  assert.match(ownerSource, /ArrowDown/);
  assert.match(ownerSource, /Demo code ไม่ถูกต้อง/);
});

test("defaults sensitive scope to hidden and shows Shared plus Hidden before consent", async () => {
  const [stateSource, ownerSource] = await Promise.all([
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(stateSource, /basicIdentity: true/);
  assert.match(stateSource, /photo: false/);
  assert.match(stateSource, /passportReference: false/);
  assert.match(ownerSource, /SHARED IF SELECTED/);
  assert.match(ownerSource, /NOT SHARED \/ HIDDEN/);
  assert.match(ownerSource, /Private notes — ไม่แชร์จาก flow นี้/);
  assert.match(ownerSource, /ยา ภูมิแพ้ วัคซีน และข้อมูลสุขภาพ — model นี้ยังไม่มีข้อมูล/);
  assert.doesNotMatch(stateSource, /Amoxicillin|โปรตีนไก่|vaccine date|medication value/i);
});

test("renders all five human-readable consent dimensions with exact local expiry and editable state", async () => {
  const [stateSource, ownerSource] = await Promise.all([
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
  ]);

  for (const label of ["ใครจะเห็น", "ใช้เพื่ออะไร", "ข้อมูลที่แชร์", "เห็นถึงเมื่อไร", "ยกเลิกอย่างไร"]) {
    assert.match(ownerSource, new RegExp(label));
  }
  assert.match(ownerSource, /แก้ Business/);
  assert.match(ownerSource, /แก้ Scope/);
  assert.match(ownerSource, /แก้ Duration/);
  assert.match(ownerSource, /ยืนยันและสร้าง Temporary Business QR/);
  assert.match(ownerSource, /browserTimezoneLabel/);
  assert.match(stateSource, /durationChosenAt/);
  assert.match(stateSource, /dateStyle: "medium", timeStyle: "short"/);
  assert.match(stateSource, /OQ-B02|DURATION_PRESETS/);
});

test("creates a distinct Temporary QR contract with detail, revoke, and Access History", async () => {
  const [ownerSource, stateSource] = await Promise.all([
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
  ]);

  for (const surface of ["SHARE-006", "SHARE-009", "SHARE-010", "SHARE-011"]) {
    assert.match(ownerSource, new RegExp(surface));
  }
  assert.match(ownerSource, /Temporary Business QR/);
  assert.match(ownerSource, /Fallback code/);
  assert.match(ownerSource, /Revoke Temporary Access/);
  assert.match(ownerSource, /Access History/);
  assert.match(ownerSource, /ไม่ใช่ Service History/);
  assert.match(ownerSource, /status: "revoked"/);
  assert.match(stateSource, /revoke-failed/);
  assert.match(stateSource, /presentationStatus/);
  assert.doesNotMatch(stateSource, /hash|encrypt|jwt|supabase|database/i);
});

test("keeps PUB-007 safe before context validation and supports request plus owner decision fixtures", async () => {
  const [gatewayHtml, gatewaySource, ownerSource] = await Promise.all([
    htmlFor("/temporary-access/prototype-missing"),
    readFile(new URL("temporary-access/[accessId]/TemporaryAccessGateway.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(gatewayHtml, /กำลังตรวจสถานะ Temporary Access/);
  assert.match(gatewayHtml, /ยังไม่แสดงชื่อ รูป หรือข้อมูลการดูแลของ Pet/);
  for (const state of ["invalid", "expired", "revoked", "wrong-business", "suspicious", "network-error"]) {
    assert.match(gatewaySource, new RegExp(`"${state}"`));
  }
  assert.match(gatewaySource, /Pet identity: not disclosed/);
  assert.match(gatewaySource, /Protected data: not disclosed/);
  assert.match(gatewaySource, /SHARE-007 · BUSINESS ACCESS REQUEST/);
  assert.match(gatewaySource, /ไม่ใช่ Pet owner/);
  assert.match(gatewaySource, /ข้อมูล Pet ยังไม่ถูกเปิด/);
  assert.match(ownerSource, /SHARE-008/);
  assert.match(ownerSource, /Approve Temporary Access/);
  assert.match(ownerSource, /Deny request/);
  assert.match(ownerSource, /access\.status !== "awaiting-owner"/);
});

test("adds responsive and accessible Phase D form contracts without new UI glyphs", async () => {
  const [css, ownerSource, gatewaySource] = await Promise.all([
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("my-pets/[petId]/sharing/SharingOwnerScreen.tsx", appRoot), "utf8"),
    readFile(new URL("temporary-access/[accessId]/TemporaryAccessGateway.tsx", appRoot), "utf8"),
  ]);

  assert.match(css, /Phase D — Temporary Business Sharing & Consent/);
  assert.match(css, /\.flow-actions\s*\{[\s\S]*?display: flex/);
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 470px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(ownerSource, /aria-live="polite"/);
  assert.match(ownerSource, /<fieldset/);
  assert.match(ownerSource, /<legend/);
  assert.match(ownerSource, /aria-activedescendant/);
  assert.match(gatewaySource, /<select/);
  assert.doesNotMatch(ownerSource + gatewaySource, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
});

test("redirects /business to / as the canonical Business Landing page", async () => {
  const [response, source, hero] = await Promise.all([
    render("/business"),
    readFile(new URL("business/page.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
  ]);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/");
  assert.match(source, /redirect\("\/"\)/);
  assert.match(hero, /href="\/business\/login"/);
  assert.match(hero, /ให้ทุกการเข้าพัก/);
  assert.doesNotMatch(hero, /Today|Sessions|Customers|Documents|Team|Settings/);
});

test("keeps Business Login separate after Consumer login is deferred", async () => {
  const [html, removedLoginResponse, businessLogin] = await Promise.all([
    htmlFor("/business/login"),
    render("/login"),
    readFile(new URL("business/login/BusinessLoginScreen.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /กลับมาดูแลร้าน/);
  assert.match(html, /เข้าสู่ระบบ/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.equal(removedLoginResponse.status, 404);
  assert.doesNotMatch(businessLogin, /router\.push|setTimeout|continueWithGoogle/);
  assert.match(businessLogin, /api\/auth\/google\/start/);
  assert.doesNotMatch(businessLogin, /eyebrow|ดำเนินการต่อด้วยบัญชีของคุณ|บัญชีบุคคลเดียวสามารถเป็นทั้งผู้ดูแลสัตว์และสมาชิกของร้านได้/);
  assert.doesNotMatch(businessLogin, /disabled aria-disabled="true"/);
  assert.doesNotMatch(businessLogin, /DRAFT_PASSPORT_STORAGE_KEY|prototypeClaimed/);
});

test("renders Business Home as a priority-first local prototype with booking-derived work and shared revenue", async () => {
  const [html, source, spotlight, serviceVisual, state, businessCss] = await Promise.all([
    businessFixtureHtml("/business/home"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHomeSpotlight.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessServiceVisual.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>ภาพรวมวันนี้<\/h1>/);
  assert.match(html, /Whisker Rest/);
  assert.match(html, /สาขาอารีย์/);
  assert.match(html, /สิ่งที่ต้องจัดการ/);
  assert.match(html, /ตารางงานวันนี้/);
  assert.match(html, /อาบน้ำ \/ ตัดขน/);
  assert.match(html, /โรงแรม/);
  assert.match(html, /รายรับวันนี้/);
  assert.match(html, /รับชำระแล้ว/);
  assert.match(html, /ยอดค้างชำระ/);
  assert.match(html, /href="\/business\/billing"/);
  assert.doesNotMatch(html, /เริ่มจาก 3 เรื่องที่ต้องจัดการ|ภาพรวมงานสำคัญของร้าน|ข้อมูลตัวอย่าง/);
  assert.match(html, /href="\/business\/scan"/);
  assert.match(html, /href="\/business\/calendar\?new=1"/);
  assert.match(html, /href="\/business\/customers\?focus=search"/);
  assert.match(html, /href="\/business\/inbox"/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(source, /getEnabledBusinessModules\(context(?:, !businessStateReady)?\)/);
  assert.match(source, /enabledModules\.map/);
  assert.match(source, /listPrototypeBookings\(context/);
  assert.match(source, /getPrototypeInboxUnreadCount\(context/);
  assert.match(source, /groomingSummary\.readyForPickup/);
  assert.match(source, /id: booking\.bookingId/);
  assert.doesNotMatch(state, /newMessages|ระบบข้อความยังไม่เปิดใช้/);
  assert.match(source, /bookingsToday/);
  assert.match(state, /"whisker-ari-frontdesk": \["grooming", "hotel"\]/);
  assert.match(state, /"whisker-thonglor-frontdesk": \["grooming"\]/);
  assert.match(state, /"paw-partner-onnut": \["hotel", "daycare"\]/);
  assert.match(source, /getPrototypeRevenueSummary\(context/);
  assert.match(source, /revenueSummary\.revenueToday/);
  assert.match(source, /รายรับวันนี้/);
  assert.match(source, /BusinessHomeSpotlight/);
  assert.match(source, /BusinessServiceIcon/);
  assert.equal((spotlight.match(/\/images\/business\/business-banner-[^"']+\.png/g) ?? []).length, 3);
  assert.match(spotlight, /business-banner-care-lounge\.png/);
  assert.match(spotlight, /business-banner-grooming\.png/);
  assert.match(spotlight, /business-banner-hotel\.png/);
  assert.match(spotlight, /aria-label="แบนเนอร์ก่อนหน้า" onClick=\{showPrevious\}/);
  assert.match(spotlight, /aria-label="แบนเนอร์ถัดไป" onClick=\{showNext\}/);
  assert.match(spotlight, /SWIPE_THRESHOLD_PX = 48/);
  assert.doesNotMatch(spotlight, /window\.setInterval/);
  assert.match(businessCss, /prefers-reduced-motion/);
  assert.match(spotlight, /onPointerDown=\{handlePointerDown\}/);
  assert.match(spotlight, /onPointerUp=\{handlePointerUp\}/);
  assert.match(spotlight, /dashboard-banner__picture/);
  assert.match(spotlight, /activeIndex \+ 1/);
  assert.match(spotlight, /src=\{active\.imageSrc\}/);
  assert.match(businessCss, /\.business-home-hero \.business-home-banner__image\s*\{[\s\S]*?aspect-ratio:\s*1 \/ 1 !important/);
  assert.match(businessCss, /\.business-home-banner__track\s*\{[\s\S]*?transform:\s*translate3d\(calc\(var\(--business-banner-index, 0\) \* -100%\), 0, 0\);[\s\S]*?transition:\s*transform/);
  assert.match(businessCss, /@media \(min-width: 1024px\) \{[\s\S]*?\.business-home-hero\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(businessCss, /\.business-home-hero \.business-home-banner\s*\{[\s\S]*?width:\s*min\(100%, 400px\) !important/);
  assert.doesNotMatch(businessCss, /@keyframes business-banner-slide-(?:next|previous)/);
  assert.doesNotMatch(spotlight, /setDirection|slide--\$\{direction\}/);
  assert.doesNotMatch(spotlight, /role="tablist"|aria-selected=/);
  assert.match(spotlight, /aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(spotlight, /autoPlay|autoplay/);
  assert.match(serviceVisual, /Scissors/);
  assert.match(serviceVisual, /Bed/);
  assert.match(serviceVisual, /PawPrint/);
  assert.doesNotMatch(source, /business-demo-label|business-section-kicker|Whisker Rest Demo/);
  assert.doesNotMatch(state, /nextWork:\s*\[/);
});

test("builds one Branch-aware Business shell with live Calendar, Customers, Inbox, Billing, Reports, Team, and capability-aware operations", async () => {
  const [layout, frame, desktopNav, mobileNav, model, header, menu, documentLink, state] = await Promise.all([
    readFile(new URL("business/layout.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessPortalFrame.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessHeader.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessUserMenu.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessDocumentLink.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);

  assert.match(layout, /<BusinessPortalFrame>/);
  assert.match(frame, /<BusinessNavigation \/>/);
  assert.match(frame, /<BusinessMobileNavigation \/>/);
  assert.doesNotMatch(frame + desktopNav + mobileNav + header + menu, /AppNav|BottomNavigation|My Pets|Create Passport/);
  assert.match(desktopNav, /href="\/business\/home"/);
  assert.match(desktopNav, /href=\{destination\.href\}/);
  assert.match(mobileNav, /BUSINESS_CALENDAR_DESTINATION\.href/);
  assert.match(header + mobileNav, /href="\/business\/scan"/);
  assert.match(documentLink, /return <a href=\{href\}/);
  assert.doesNotMatch(desktopNav + mobileNav + header, /from "next\/link"/);
  assert.match(desktopNav, /BUSINESS_MANAGEMENT_DESTINATIONS/);
  assert.match(mobileNav, /BUSINESS_SETTINGS_DESTINATION/);
  assert.match(desktopNav + mobileNav, /aria-label="งานบริการ"/);
  assert.match(model, /BUSINESS_CALENDAR_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/calendar"/);
  assert.match(model, /BUSINESS_CUSTOMERS_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/customers"/);
  assert.match(model, /BUSINESS_MESSAGES_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/inbox"/);
  assert.match(model, /BUSINESS_GROOMING_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/grooming"/);
  assert.match(model, /BUSINESS_HOTEL_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/hotel"/);
  assert.match(model, /BUSINESS_DAYCARE_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/daycare"/);
  assert.match(model, /BUSINESS_SETTINGS_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/settings"/);
  assert.match(model, /BUSINESS_BILLING_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/billing"/);
  assert.match(model, /BUSINESS_REPORTS_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/reports"/);
  assert.match(model, /BUSINESS_TEAM_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/team"/);
  assert.match(desktopNav + mobileNav, /module === "grooming"/);
  assert.match(desktopNav + mobileNav, /module === "hotel"/);
  assert.match(desktopNav + mobileNav, /BUSINESS_DAYCARE_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_GROOMING_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_HOTEL_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_BILLING_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_REPORTS_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_TEAM_DESTINATION/);
  assert.match(mobileNav, /BUSINESS_CUSTOMERS_DESTINATION\.href/);
  assert.match(mobileNav, /BUSINESS_MESSAGES_DESTINATION\.href/);
  assert.match(mobileNav, /BUSINESS_REPORTS_DESTINATION\.href/);
  assert.match(mobileNav, /BUSINESS_TEAM_DESTINATION\.href/);
  assert.doesNotMatch(desktopNav + mobileNav + model, /\/business\/finance/);
  for (const label of ["ปฏิทิน", "ลูกค้าและสัตว์เลี้ยง", "ข้อความ", "อาบน้ำ / ตัดขน", "โรงแรม", "Daycare", "การเงิน", "รายงาน", "ทีม", "ตั้งค่า"]) {
    assert.match(model, new RegExp(label));
  }
  assert.match(desktopNav, /getEnabledBusinessModules\(context(?:, !stateReady)?\)/);
  assert.match(mobileNav, /getEnabledBusinessModules\(context(?:, !stateReady)?\)/);
  assert.match(state, /getEnabledBusinessModules/);
  assert.doesNotMatch(menu, /href="\/business\/(?:home|scan)|ปฏิทิน|อาบน้ำ \/ ตัดขน|โรงแรม|Daycare|การเงิน/);
});

test("keeps the five-item Business mobile navigation and accessible More sheet", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  for (const label of ["หน้าหลัก", "สแกน", "ข้อความ", "เพิ่มเติม"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /BUSINESS_CALENDAR_DESTINATION/);
  assert.match(source, /BUSINESS_CUSTOMERS_DESTINATION/);
  assert.match(source, /BUSINESS_MESSAGES_DESTINATION/);
  assert.equal((source.match(/business-mobile-navigation__item(?!-)/g) ?? []).length, 5);
  assert.match(source, /<Link[\s\S]*?BUSINESS_CALENDAR_DESTINATION\.href/);
  assert.match(source, /<Link[\s\S]*?BUSINESS_MESSAGES_DESTINATION\.href/);
  assert.doesNotMatch(source, /is-disabled[\s\S]{0,180}ข้อความ/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /business-mobile-navigation__item--scan[\s\S]*?color-meaw-ink-950/);
});

test("switches the shared Business and Branch context through one keyboard-usable control", async () => {
  const [switcher, hook, scanner, intake, state, fixtures] = await Promise.all([
    readFile(new URL("business/_components/BusinessContextSwitcher.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/useBusinessContext.ts", appRoot), "utf8"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
  ]);

  assert.match(switcher, /<select/);
  assert.match(switcher, /aria-label="เปลี่ยนร้านและสาขา"/);
  assert.match(switcher, /listPrototypeBusinessContexts\(undefined, !stateReady\)/);
  assert.match(switcher, /contexts\.map/);
  assert.match(hook, /meawketting:business-state/);
  assert.match(hook, /writeActiveBusinessContext/);
  assert.match(scanner, /meawketting:business-state/);
  assert.match(intake, /readActiveBusinessContext/);
  assert.match(intake, /intakeAccessGate\(access, activeContext\)/);
  assert.match(intake, /loadDurableIntake\(context, intakeId\)/);
  assert.match(state, /whisker-thonglor-frontdesk/);
  assert.match(fixtures, /whisker-thonglor/);
});

test("renders BF-2 Business Calendar over durable BE3 planning truth", async () => {
  const [html, page, calendar, planningBoard, staySpan, dayTimeline, mutation, presentation, editor, state, agenda, css] = await Promise.all([
    businessFixtureHtml("/business/calendar"),
    readFile(new URL("business/calendar/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarPlanningBoard.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarStaySpan.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarDayTimeline.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/bookingMutation.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/calendarPresentation.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarAgenda.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>ปฏิทิน<\/h1>/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /เพิ่มการจอง/);
  // The production bundle renders the durable empty state before the client
  // hydrates its authorized BE3 directory; the isolated fixture server keeps
  // the historical Mochi sample for compatibility coverage.
  if (/Mochi/.test(html)) {
    assert.match(html, /เข้าพักโรงแรม/);
    assert.equal((html.match(/class="calendar-stay-span(?:\s|")/g) ?? []).length, 3);
  } else {
    assert.match(html, /ยังไม่มีการจองในวันนี้/);
    assert.equal((html.match(/class="calendar-stay-span(?:\s|")/g) ?? []).length, 0);
  }
  assert.match(html, /href="\/business\/calendar"/);
  assert.match(page, /BusinessCalendar/);
  assert.match(page, /searchParams/);
  assert.match(page, /launchRequest/);
  assert.match(calendar, /CalendarPlanningBoard/);
  assert.match(calendar, /CalendarDayTimeline/);
  assert.match(calendar, /CalendarAgenda/);
  assert.match(calendar, /business-calendar__mobile-view/);
  assert.match(calendar, /กดค้างแล้วลากบนจอสัมผัส/);
  assert.match(calendar, /onPointerDragStart/);
  assert.match(calendar, /CalendarView = "day" \| "week" \| "month" \| "custom"/);
  assert.match(calendar, /CUSTOM_CALENDAR_RANGE_OPTIONS = \[28, 35, 42\]/);
  assert.match(calendar, /listPrototypeBookings/);
  assert.match(calendar, /includeCancelled: true/);
  assert.match(agenda, /calendar-agenda__days/);
  assert.match(agenda, /onDateChange/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1199px\) \{[\s\S]*?\.business-calendar__surface \{[\s\S]*?overflow-x: auto !important;[\s\S]*?\.business-calendar__desktop-view \.calendar-planning-board \{[\s\S]*?min-width: 60rem;/);
  assert.match(planningBoard, /booking\.timeModel === "date-range"/);
  assert.match(planningBoard, /booking\.timeModel !== "date-range"/);
  assert.match(planningBoard, /CalendarStaySpan/);
  assert.match(staySpan, /BusinessServiceIcon module="hotel"/);
  assert.match(staySpan, /aria-label=/);
  assert.match(staySpan, /columnEnd - columnStart === 1/);
  assert.match(staySpan, /is-compact/);
  assert.match(staySpan, /onResizeStart/);
  assert.match(planningBoard, /"resize-end"/);
  assert.match(dayTimeline, /SNAP_MINUTES = 30/);
  assert.match(dayTimeline, /resize-start/);
  assert.match(dayTimeline, /resize-end/);
  assert.match(css, /\.calendar-stay-span\.is-dragging,[\s\S]*?pointer-events:\s*none/);
  assert.match(mutation, /appointmentDuration/);
  assert.match(mutation, /calendarDayDistance/);
  assert.match(presentation, /daysForCalendarMonth/);
  assert.match(presentation, /daysForCustomRange/);
  assert.match(editor, /role=\{cancelConfirmation \? "alertdialog" : "dialog"\}/);
  assert.match(editor, /aria-modal="true"/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /event\.key !== "Tab"/);
  assert.match(calendar, /evaluatePrototypeBookingAvailability\(draft, context\)/);
  assert.match(calendar, /queryDurableBookings/);
  assert.match(calendar, /rescheduleDurableBooking/);
  assert.match(calendar, /createDurableBooking/);
  assert.match(calendar, /cancelDurableBooking/);
  assert.doesNotMatch(calendar, /savePrototypeBooking|cancelPrototypeBooking/);
  assert.match(calendar, /เลือกวัน\/เวลาใหม่/);
  assert.match(calendar, /เลือกตัวเลือกอื่น/);
  assert.doesNotMatch(calendar, /Move failed/i);
  assert.match(state, /BOOKING_DEMO_DATE = "2026-08-18"/);
});

test("moves and resizes supported Calendar bookings through one pure mutation adapter", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-calendar-test-"));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const mutation = await vite.ssrLoadModule("/app/business/calendar/bookingMutation.ts");
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const context = state.getDemoBusinessContext();
    const fixtures = state.listPrototypeBookingFixtures(context, { includeCancelled: true });
    const grooming = fixtures.find((booking) => booking.bookingId === "booking-fixture-ari-grooming-1030");
    const hotel = fixtures.find((booking) => booking.serviceModule === "hotel" && booking.pets.some((pet) => pet.name === "Luna"));
    assert.ok(grooming);
    assert.ok(hotel);

    const movedAppointment = mutation.buildBookingMutationDraft(grooming, "move", { date: "2026-08-19", time: "13:00" });
    assert.equal(movedAppointment.start, "2026-08-19T13:00");
    assert.equal(movedAppointment.end, "2026-08-19T14:30");
    assert.equal(state.evaluatePrototypeBookingAvailability(movedAppointment, context).available, true);

    const resizedAppointment = mutation.buildBookingMutationDraft(grooming, "resize-end", { date: "2026-08-18", time: "12:30" });
    assert.equal(resizedAppointment.start, "2026-08-18T10:30");
    assert.equal(resizedAppointment.end, "2026-08-18T12:30");
    const shortenedAppointment = mutation.buildBookingMutationDraft(grooming, "resize-end", { date: "2026-08-18", time: "11:30" });
    assert.equal(shortenedAppointment.end, "2026-08-18T11:30");

    const movedStay = mutation.buildBookingMutationDraft(hotel, "move", { date: "2026-08-24" });
    assert.equal(movedStay.start, "2026-08-24");
    assert.equal(movedStay.end, "2026-08-27");
    const extendedStay = mutation.buildBookingMutationDraft(hotel, "resize-end", { date: "2026-08-22" });
    assert.equal(extendedStay.end, "2026-08-23");
    const shortenedStay = mutation.buildBookingMutationDraft(hotel, "resize-start", { date: "2026-08-20" });
    assert.equal(shortenedStay.start, "2026-08-20");
    assert.equal(shortenedStay.end, "2026-08-21");
    const shortenedStayEnd = mutation.buildBookingMutationDraft(hotel, "resize-end", { date: "2026-08-19" });
    assert.equal(shortenedStayEnd.start, "2026-08-18");
    assert.equal(shortenedStayEnd.end, "2026-08-20");

    const conflictCandidate = {
      ...grooming,
      bookingId: "calendar-conflict-candidate",
      customer: hotel.customer,
      pets: hotel.pets,
    };
    const conflictingMove = mutation.buildBookingMutationDraft(conflictCandidate, "move", { date: "2026-08-18", time: "10:30" });
    const conflict = state.evaluatePrototypeBookingAvailability(conflictingMove, context);
    assert.equal(conflict.available, false);
    assert.equal(conflict.conflicts.some((item) => item.code === "resource-conflict"), true);
    assert.equal(conflict.conflicts.every((item) => item.message !== "Move failed"), true);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
});

test("keeps one shared Booking foundation for appointment, stay, and day work", async () => {
  const [state, editor, grooming, hotel, daycare] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/GroomingBookingFields.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/HotelBookingFields.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/DaycareBookingFields.tsx", appRoot), "utf8"),
  ]);

  assert.match(state, /BookingTimeModel = "appointment" \| "date-range" \| "day"/);
  assert.match(state, /pets: DemoBookingPet\[\]/);
  assert.match(state, /timeModel === "appointment"/);
  assert.match(state, /timeModel === "day"/);
  assert.match(state, /exclusive check-out date/);
  assert.match(editor, /GroomingBookingFields/);
  assert.match(editor, /HotelBookingFields/);
  assert.match(editor, /DaycareBookingFields/);
  assert.match(grooming, /ระยะเวลาที่คาดไว้/);
  assert.match(grooming, /ช่างที่รับงาน/);
  assert.match(hotel, /วันเช็กอิน/);
  assert.match(hotel, /วันเช็กเอาต์/);
  assert.match(hotel, /พื้นที่พักตามเงื่อนไข/);
  assert.match(hotel, /จัดห้องหรือโซนจริงใน Hotel Operations หลังยืนยันการจอง/);
  assert.match(daycare, /วันที่ใช้บริการ/);
  assert.match(daycare, /โซนดูแล/);
});

test("uses one accessible service identity and keeps quick relationship creation inside Booking", async () => {
  const [editor, serviceVisual, bookingItem, css] = await Promise.all([
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessServiceVisual.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingItem.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(editor, /booking-service-selector/);
  assert.match(editor, /services\.map/);
  assert.match(editor, /BusinessServiceIcon/);
  assert.match(editor, /เพิ่มลูกค้าใหม่/);
  assert.match(editor, /เพิ่มสัตว์เลี้ยง/);
  assert.match(editor, /CustomerEditor/);
  assert.match(editor, /PetRelationshipEditor/);
  assert.match(editor, /inert=\{relationshipEditor \? true : undefined\}/);
  assert.doesNotMatch(editor, /window\.location|href="\/business\/customers"/);
  assert.match(serviceVisual, /grooming: Scissors/);
  assert.match(serviceVisual, /hotel: BedDouble/);
  assert.match(serviceVisual, /daycare: PawPrint/);
  assert.match(bookingItem, /BusinessServiceIcon/);
  assert.match(bookingItem, /booking\.service\.label/);
  assert.match(bookingItem, /BookingStatusBadge/);
  for (const serviceModule of ["grooming", "hotel", "daycare"]) {
    assert.match(css, new RegExp(`--color-meaw-service-${serviceModule}-surface`));
    assert.match(css, new RegExp(`business-service-icon--${serviceModule}`));
  }
});

test("checks Branch services, resources, capacity, and duplicate confirmation before durable Booking save", async () => {
  const [state, editor, availability, durableClient] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/AvailabilityStatus.tsx", appRoot), "utf8"),
    readFile(new URL("_backend/be3/client.ts", appRoot), "utf8"),
  ]);

  assert.match(state, /getBookingServices\(context/);
  assert.match(state, /getEnabledBusinessModules\(context/);
  assert.match(state, /wrong-context/);
  assert.match(state, /service-not-enabled/);
  assert.match(state, /bookingIntervalsOverlap\(first/);
  assert.match(state, /first\.start < second\.end && second\.start < first\.end/);
  assert.match(state, /resource\.capacityMode === "exclusive"/);
  assert.match(state, /resource\.capacityMode === "capacity"/);
  assert.match(state, /status !== "cancelled"/);
  assert.match(state, /capacity-conflict/);
  assert.match(state, /duplicate-confirmation/);
  assert.doesNotMatch(state, /export function savePrototypeBooking/);
  assert.match(editor, /evaluatePrototypeBookingAvailability\(draft, context\)/);
  assert.match(editor, /checkDurableBookingAvailability/);
  assert.match(editor, /createDurableBooking/);
  assert.match(editor, /updateDurableBooking/);
  assert.match(durableClient, /BE3_API_PATH/);
  assert.match(editor, /สาขาที่กำลังใช้งานเปลี่ยนแล้ว/);
  assert.match(availability, /เปลี่ยนเวลา/);
  assert.match(availability, /เปลี่ยนตัวเลือก/);
  assert.match(availability, /เปลี่ยนวันที่/);
});

test("supports durable Booking create, edit, cancellation history, and safe recovery UI", async () => {
  const [state, editor, durableClient, css] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("_backend/be3/client.ts", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(state, /bookings: Record<string, PrototypeBooking>/);
  assert.match(state, /customers: \{\}, bookings: \{\}/);
  assert.match(state, /BUSINESS_FIXTURE_TEST_MODE/);
  assert.doesNotMatch(state, /export function (?:save|cancel)PrototypeBooking/);
  assert.match(durableClient, /createDurableBooking/);
  assert.match(durableClient, /updateDurableBooking/);
  assert.match(durableClient, /cancelDurableBooking/);
  assert.match(state, /cancelledAt/);
  assert.match(editor, /ยืนยันการจอง/);
  assert.match(editor, /บันทึกการเปลี่ยนแปลง/);
  assert.match(editor, /ยกเลิกการจอง/);
  assert.match(editor, /ยืนยันยกเลิกการจอง/);
  assert.match(editor, /การจองนี้ยกเลิกแล้ว/);
  assert.match(editor, /initialBooking \? "แก้ไขการจอง" : "เพิ่มการจอง"/);
  assert.doesNotMatch(editor, /แก้ไขข้อมูลตัวอย่าง|เริ่มจากข้อมูลหลัก|บริการ ลูกค้า และน้อง|ต้นแบบนี้เริ่มจากการจอง 1 ตัวต่อครั้ง/);
  assert.match(css, /booking-editor__backdrop/);
  assert.match(css, /booking-editor-enter 220ms/);
  assert.match(css, /booking-editor-mobile-enter/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?booking-editor/);
});

test("keeps shared Business Core routes live with capability-aware Grooming, Hotel, Daycare, Team, and Settings", async () => {
  const routes = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const routePaths = routes
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => entry.parentPath.replaceAll("\\", "/"));

  assert.equal(routePaths.some((path) => /business\/calendar$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/customers$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/customers\/\[customerId\]$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/inbox$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/grooming$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/hotel$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/billing$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/reports$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/team$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/daycare$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/settings$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/(?:bookings|finance)(?:\/|$)/.test(path)), false);
  assert.equal(routePaths.some((path) => /business\/pets(?:\/|$)/.test(path)), false);
});

test("renders BF-5 Grooming as a visual, capability-aware execution board with a mobile status alternative", async () => {
  const [html, page, operations, card, detail, presentation, css, state, desktopNav, mobileNav] = await Promise.all([
    businessFixtureHtml("/business/grooming"),
    readFile(new URL("business/grooming/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingOperations.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobCard.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/groomingPresentation.ts", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>อาบน้ำ \/ ตัดขน<\/h1>/);
  for (const lane of ["รอรับเข้า", "รอเริ่ม", "กำลังทำ", "พร้อมรับกลับ", "เสร็จแล้ว"]) assert.match(presentation, new RegExp(lane));
  // Protected execution rows arrive only after the authorized backend directory loads.
  assert.doesNotMatch(await htmlFor("/business/grooming"), /Mochi|grooming-job-fixture/);
  assert.match(operations, /_backend\/be4\/facade/);
  assert.match(page, /GroomingOperations/);
  assert.match(operations, /getEnabledBusinessModules\(context(?:, !stateReady)?\)\.includes\("grooming"\)/);
  assert.match(operations, /onDragStart/);
  assert.match(operations, /onDrop=/);
  assert.match(operations, /onPointerDown/);
  assert.match(operations, /งานกลับอยู่สถานะเดิมแล้ว/);
  assert.doesNotMatch(operations, /GROOMING_MOBILE_FILTERS|GROOMING_ATTENTION_FILTER_OPTIONS|grooming-toolbar/);
  assert.match(operations, /grooming-mobile-list__group/);
  assert.match(card, /BusinessPetAvatar/);
  assert.match(card, /data-service-job-id/);
  assert.match(card, /<button/);
  assert.match(detail, /aria-label="เปลี่ยนสถานะงาน"/);
  assert.match(detail, /role="dialog"/);
  assert.match(detail, /ร้านส่งคำขอได้ แต่ไม่สามารถอนุมัติแทนเจ้าของได้/);
  assert.doesNotMatch(detail, /passport|allerg|medication|health/i);
  assert.match(presentation, /GROOMING_BOARD_LANES/);
  assert.match(presentation, /groomingJobLateMinutes/);
  assert.match(css, /\.grooming-board-scroll\s*\{[\s\S]*?overflow-x: auto/);
  assert.match(css, /grooming-board-column\.is-drop-valid/);
  assert.match(css, /grooming-board-column\.is-drop-invalid/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.grooming-mobile-list \{ display: grid/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.grooming-job-card/);
  assert.match(state, /DEMO_GROOMING_SERVICE_JOB_FIXTURES/);
  assert.match(desktopNav + mobileNav, /BUSINESS_GROOMING_DESTINATION/);
  assert.match(desktopNav + mobileNav, /BUSINESS_DAYCARE_DESTINATION/);
});

test("renders BF-6 Hotel as a capability-aware occupancy, lifecycle, and daily-care foundation", async () => {
  const routes = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const routePaths = routes
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => entry.parentPath.replaceAll("\\", "/"));
  const [html, page, operations, detail, presentation, desktopNav, mobileNav, model, command, home, scanner, intake, customerDetail, state, inboxState, css, calendar] = await Promise.all([
    businessFixtureHtml("/business/hotel"),
    readFile(new URL("business/hotel/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/HotelOperations.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/HotelStayDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/hotelPresentation.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessCommandPalette.tsx", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
    readFile(new URL("business/calendar/HotelBookingFields.tsx", appRoot), "utf8"),
  ]);

  assert.equal(routePaths.some((path) => /business\/hotel$/.test(path)), true);
  assert.match(html, /<h1[^>]*>โรงแรม<\/h1>/);
  for (const label of ["เข้าพักวันนี้", "ออกวันนี้", "การใช้พื้นที่", "ต้องดูแล", "ต้องจัดการ", "ห้องและโซน", "การเข้าพัก"]) assert.match(html, new RegExp(label));
  assert.doesNotMatch(await htmlFor("/business/hotel"), /Luna|ห้อง A01/);
  assert.match(operations, /_backend\/be4\/facade/);
  assert.match(page, /HotelOperations/);
  assert.match(operations, /getEnabledBusinessModules\(context(?:, !stateReady)?\)\.includes\("hotel"\)/);
  assert.match(operations, /getPrototypeHotelRoomOccupancySummary/);
  assert.match(operations, /hotel-occupancy-span--\$\{span\.stay\.status\}/);
  assert.match(operations, /onDragStart/);
  assert.match(operations, /onDrop=/);
  assert.match(operations, /evaluatePrototypeHotelStayRoomAvailability/);
  assert.match(operations, /รายการกลับอยู่ห้องเดิมแล้ว/);
  assert.match(operations, /ready-for-checkout[\s\S]*?operationalEnd/);
  assert.match(operations, /hotel-mobile-view-tabs/);
  assert.doesNotMatch(operations, /hotel-occupancy-mobile/);
  assert.match(detail, /checkInPrototypeHotelStay/);
  assert.match(detail, /transitionPrototypeHotelStay/);
  assert.match(detail, /"completed"/);
  assert.match(detail, /assignPrototypeHotelStayRoom/);
  assert.match(detail, /movePrototypeHotelStayRoom/);
  assert.match(detail, /roomMoveHistory/);
  assert.match(detail, /completePrototypeHotelCareTask/);
  assert.match(detail, /รายการยาแสดงได้เฉพาะเมื่อมีคำแนะนำและการยืนยันจาก Intake/);
  assert.match(detail, /Incident \/ note ที่ต้องติดตาม/);
  assert.match(detail, /หมายเหตุของร้าน/);
  assert.match(detail, /\/business\/inbox\?customerId=/);
  assert.match(detail, /ร้านส่งคำขอเพิ่มบริการผ่าน Inbox ได้ แต่ไม่สามารถอนุมัติแทนเจ้าของได้/);
  assert.match(detail, /\/business\/billing\?hotelStayId=/);
  assert.match(detail, /การชำระเงินทำผ่าน Checkout แยกต่างหาก/);
  assert.match(presentation, /HOTEL_LIST_FILTERS/);
  assert.match(desktopNav + mobileNav + model, /BUSINESS_HOTEL_DESTINATION/);
  assert.match(command, /getEnabledBusinessModules\(context, !stateReady\)\.map\(\(module\) => BUSINESS_MODULE_COMMANDS\[module\]\)/);
  assert.match(command, /hotel: \{[\s\S]*?href: "\/business\/hotel"/);
  assert.match(desktopNav + mobileNav, /BUSINESS_DAYCARE_DESTINATION/);
  assert.match(state, /export type PrototypeHotelStay/);
  assert.match(state, /hotelStays: Record<string, PrototypeHotelStay>/);
  assert.match(state, /synchronizePrototypeHotelStaysForBooking/);
  assert.match(state, /getPrototypeHotelRoomOccupancySummary/);
  assert.match(state, /buildPrototypeHotelCareTaskCompletion/);
  assert.match(state, /source: "customer-confirmed-intake"/);
  assert.match(state, /incidentNotes/);
  assert.match(scanner, /hotelStayId/);
  assert.match(intake, /\/business\/hotel\?stayId=/);
  assert.match(customerDetail, /listPrototypeHotelStays/);
  assert.match(customerDetail, /\/business\/hotel\?stayId=/);
  assert.match(home, /getPrototypeHotelStaySummary/);
  assert.match(home, /hotelSummary\.occupied/);
  assert.match(calendar, /Hotel Operations หลังยืนยันการจอง/);
  assert.doesNotMatch(inboxState, /guardianCareInstruction|incidentNotes|dailyCareTasks|PrototypeHotelStay/);
  assert.match(css, /\.hotel-occupancy-board-wrap\s*\{[^}]*overflow-x: auto/);
  assert.match(css, /\.hotel-occupancy-row\.is-drop-valid/);
  assert.match(css, /\.hotel-occupancy-row\.is-drop-invalid/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.hotel-occupancy \{ display: none/);
  assert.match(css, /data-mobile-view="staying"/);
  assert.match(css, /\.hotel-stay-detail__content \{ padding-bottom: calc\(6rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hotel-occupancy-span/);
  assert.equal(routePaths.some((path) => /business\/billing(?:\/|$)/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/(?:finance|backend)(?:\/|$)/.test(path)), false);
});

test("keeps BF-6 Hotel state linked, capacity-safe, immutable, and privacy-bounded", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-hotel-test-"));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const ari = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-ari-frontdesk");
    const groomingOnly = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-thonglor-frontdesk");
    const onnut = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "paw-partner-onnut");
    assert.ok(ari);
    assert.ok(groomingOnly);
    assert.ok(onnut);
    assert.equal(state.getEnabledBusinessModules(ari).includes("hotel"), true);
    assert.equal(state.getEnabledBusinessModules(onnut).includes("hotel"), true);
    assert.equal(state.getEnabledBusinessModules(groomingOnly).includes("hotel"), false);

    const bookings = state.listPrototypeBookingFixtures(ari, { includeCancelled: true });
    const hotelBookings = bookings.filter((booking) => booking.serviceModule === "hotel" && booking.status !== "cancelled");
    const stays = state.listPrototypeHotelStayFixtures(ari, { includeClosed: true });
    for (const booking of hotelBookings) {
      for (const pet of booking.pets) {
        const linked = stays.filter((stay) => stay.bookingId === booking.bookingId && stay.petId === pet.id);
        assert.equal(linked.length, 1);
        assert.equal(linked[0].customerId, booking.customer.id);
      }
    }

    const luna = stays.find((stay) => stay.hotelStayId === "hotel-stay-fixture-luna");
    const biscuit = stays.find((stay) => stay.hotelStayId === "hotel-stay-fixture-biscuit-checkout");
    const milo = stays.find((stay) => stay.hotelStayId === "hotel-stay-fixture-milo");
    assert.ok(luna);
    assert.ok(biscuit);
    assert.ok(milo);
    assert.equal(state.hotelStayOccursOnDate(luna, "2026-08-18"), true);
    assert.equal(state.hotelStayOccursOnDate(luna, "2026-08-20"), true);
    assert.equal(state.hotelStayOccursOnDate(luna, "2026-08-21"), false);
    assert.equal(biscuit.roomMoveHistory.length > 0, true);
    assert.equal(biscuit.roomMoveHistory.at(-1).toRoomId, "ari-hotel-room-a02");

    const roomSummary = state.getPrototypeHotelRoomOccupancySummary(stays, ari, "ari-hotel-room-a01", state.BOOKING_DEMO_DATE);
    assert.deepEqual(roomSummary, { occupied: 1, reserved: 0, capacity: 1, available: 0 });
    const collisionCandidate = { ...milo, hotelStayId: "hotel-stay-capacity-check", scheduledCheckIn: "2026-08-18", scheduledCheckOut: "2026-08-20", roomAssignments: [] };
    const collision = state.evaluatePrototypeHotelStayRoomAvailability(collisionCandidate, "ari-hotel-room-a01", "2026-08-18", "2026-08-20", ari, stays);
    assert.equal(collision.available, false);
    assert.equal(collision.conflicts.some((conflict) => conflict.stayIds.includes(luna.hotelStayId)), true);
    const available = state.evaluatePrototypeHotelStayRoomAvailability(collisionCandidate, "ari-hotel-room-b03", "2026-08-18", "2026-08-19", ari, stays);
    assert.equal(available.available, true);

    for (const [from, to] of [["booked", "checked-in"], ["checked-in", "in-stay"], ["in-stay", "ready-for-checkout"], ["ready-for-checkout", "checked-out"], ["checked-out", "completed"], ["booked", "cancelled"]]) {
      assert.equal(state.hotelStayCanTransition(from, to), true);
    }
    assert.equal(state.hotelStayCanTransition("completed", "in-stay"), false);

    const water = luna.dailyCareTasks.find((task) => task.kind === "water");
    const medication = luna.dailyCareTasks.find((task) => task.kind === "medication");
    assert.ok(water);
    assert.ok(medication);
    assert.equal(state.prototypeHotelCareTaskIsAuthorized(medication), true);
    assert.equal(state.prototypeHotelCareTaskIsAuthorized({ ...medication, authorization: null }), false);
    const completed = state.buildPrototypeHotelCareTaskCompletion(luna, water.id, "2026-08-18T12:05:00.000Z", "ทีมทดสอบ");
    assert.ok(completed);
    assert.equal(luna.dailyCareTasks.find((task) => task.id === water.id).state, "pending");
    assert.equal(completed.dailyCareTasks.find((task) => task.id === water.id).state, "completed");
    assert.equal(completed.history.at(-1).type, "care");

    const ariSummary = state.summarizePrototypeHotelStays(stays, ari, state.BOOKING_DEMO_DATE);
    assert.equal(ariSummary.arrivals, 1);
    assert.equal(ariSummary.departures, 1);
    assert.equal(ariSummary.capacity, state.getHotelRooms(ari).reduce((total, room) => total + room.capacity, 0));
    assert.equal(ariSummary.occupied + ariSummary.reserved + ariSummary.available, ariSummary.capacity);
    assert.equal(ariSummary.incidents, 1);
    const onnutSummary = state.getPrototypeHotelStaySummary(onnut, state.BOOKING_DEMO_DATE, true);
    assert.equal(onnutSummary.arrivals, 1);
    assert.equal(onnutSummary.reserved, 1);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
});

test("keeps Grooming Service Jobs distinct from Bookings with verified lifecycle, timing, history, and resource conflict rules", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-grooming-test-"));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const context = state.getDemoBusinessContext();
    const disabledContext = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "paw-partner-onnut");
    const bookings = state.listPrototypeBookingFixtures(context, { includeCancelled: true });
    const jobs = state.listPrototypeGroomingServiceJobFixtures(context, { date: state.BOOKING_DEMO_DATE });
    const mochiBooking = bookings.find((booking) => booking.bookingId === "booking-fixture-ari-grooming-1030");
    const mochiJob = jobs.find((job) => job.bookingId === mochiBooking?.bookingId);
    const bookedJob = jobs.find((job) => job.status === "booked");
    assert.ok(mochiBooking);
    assert.ok(mochiJob);
    assert.ok(bookedJob);
    assert.ok(disabledContext);
    assert.equal(state.getEnabledBusinessModules(context).includes("grooming"), true);
    assert.equal(state.getEnabledBusinessModules(disabledContext).includes("grooming"), false);
    assert.equal(mochiBooking.status, "confirmed");
    assert.equal(mochiJob.status, "in-service");
    assert.equal(mochiJob.customerId, mochiBooking.customer.id);
    assert.equal(mochiJob.petId, mochiBooking.pets[0].id);
    assert.equal(mochiJob.assignedResourceIds.join(","), mochiBooking.assignedResources.join(","));
    assert.equal(state.serviceJobCanTransition("booked", "checked-in"), true);
    assert.equal(state.serviceJobCanTransition("booked", "completed"), true);
    const directInService = state.buildPrototypeGroomingServiceJobTransition(bookedJob, "in-service", "2026-08-18T14:40:00.000Z");
    assert.equal(directInService?.status, "in-service");
    const checkedIn = state.buildPrototypeGroomingServiceJobTransition(bookedJob, "checked-in", "2026-08-18T14:35:00.000Z");
    const inService = state.buildPrototypeGroomingServiceJobTransition(checkedIn, "in-service", "2026-08-18T14:40:00.000Z");
    const ready = state.buildPrototypeGroomingServiceJobTransition(inService, "ready-for-pickup", "2026-08-18T15:40:00.000Z");
    const completed = state.buildPrototypeGroomingServiceJobTransition(ready, "completed", "2026-08-18T15:45:00.000Z");
    const reversed = state.buildPrototypeGroomingServiceJobTransition(completed, "in-service", "2026-08-18T16:00:00.000Z");
    assert.equal(inService.actualStartedAt, "2026-08-18T14:40:00.000Z");
    assert.equal(completed.actualCompletedAt, "2026-08-18T15:45:00.000Z");
    assert.equal(completed.history.at(-1).type, "status");
    assert.equal(reversed?.status, "in-service");
    assert.equal(bookedJob.status, "booked");
    const siblingResources = state.evaluatePrototypeGroomingServiceJobResources(
      { ...mochiJob, serviceJobId: "grooming-job-sibling" },
      ["ari-groomer-pim"],
      context,
      jobs,
    );
    assert.equal(siblingResources.available, true);
    const resourceCollision = state.evaluatePrototypeGroomingServiceJobResources(
      { ...mochiJob, serviceJobId: "grooming-job-resource-collision", bookingId: "other-booking" },
      ["ari-groomer-pim"],
      context,
      jobs,
    );
    assert.equal(resourceCollision.available, false);
    assert.equal(resourceCollision.conflicts.some((conflict) => conflict.resourceId === "ari-groomer-pim"), true);
    const summary = state.summarizeGroomingServiceJobs(jobs, state.BOOKING_DEMO_DATE);
    assert.equal(summary.total, jobs.length);
    assert.equal(summary.readyForPickup, jobs.filter((job) => job.status === "ready-for-pickup").length);
    const history = state.listCompletedPrototypeGroomingServiceJobs("booking-contact-nalin", true);
    assert.equal(history.some((job) => job.serviceJobId === "grooming-job-fixture-biscuit"), true);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
});

test("renders BF-7 Billing as a branch-scoped Charge, Payment, and shared revenue foundation", async () => {
  const [html, page, screen, state, home, customerDetail, groomingDetail, hotelDetail, desktopNav, mobileNav, command, inboxState, css, contextHook, bookingEditor] = await Promise.all([
    businessFixtureHtml("/business/billing"),
    readFile(new URL("business/billing/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/billing/BillingScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/HotelStayDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessCommandPalette.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
    readFile(new URL("business/_components/useBusinessContext.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>การเงิน<\/h1>/);
  assert.match(html, /รายรับวันนี้/);
  assert.match(html, /รายการเรียกเก็บ/);
  assert.match(html, /ตรวจยอดคงเหลือและสถานะการชำระ/);
  for (const status of ["ยังไม่ชำระ", "บางส่วน", "ชำระแล้ว"]) assert.match(html, new RegExp(status));
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(page, /serviceJobId/);
  assert.match(page, /hotelStayId/);
  assert.match(screen, /BusinessDataTable/);
  assert.match(screen, /billing-charge-cards/);
  assert.match(screen, /BusinessModal/);
  assert.match(screen, /STATUS_ICON/);
  assert.match(screen, /recordPrototypePayment/);
  assert.match(screen, /addPrototypeChargeAdjustment/);
  assert.match(screen, /cancelPrototypeCharge/);
  assert.match(screen, /await checkoutDurableCharge/);
  assert.match(screen, /ensureDurableBilling/);
  assert.doesNotMatch(html, /charge-booking-|รับแล้ว 200/);
  assert.match(screen, /ensurePrototypeConversation/);
  assert.match(screen, /sendPrototypeTextMessage/);
  assert.match(screen, /billingReady/);
  assert.match(contextHook, /isContextReady/);
  assert.match(screen, /function ChargeCard/);
  const chargeCardSource = screen.match(/function ChargeCard[\s\S]*?\n}\n\nexport function BillingScreen/)?.[0] ?? "";
  assert.match(chargeCardSource, /billing-charge-card__source/);
  assert.doesNotMatch(chargeCardSource.match(/<button[\s\S]*?<\/button>/)?.[0] ?? "", /<Link/);
  assert.match(screen, /description="ตรวจรายละเอียดรายการ ยอดคงเหลือ และประวัติการรับชำระเงิน"/);
  assert.doesNotMatch(screen, /Local prototype/);
  assert.doesNotMatch(screen, /LINE (?:Mini App|Login|messaging|notification)|Stripe|payment gateway/i);
  assert.match(state, /charges: Record<string, PrototypeCharge>/);
  assert.match(state, /payments: Record<string, PrototypePayment>/);
  assert.match(state, /getPrototypeRevenueSummary/);
  assert.match(state, /whole Thai Baht/);
  assert.match(state, /allocatedPaymentAmountForCharge/);
  assert.match(state, /projectedTotal < allocatedPaymentAmountForCharge/);
  assert.doesNotMatch(state, /Math\.round\(booking\.estimate/);
  assert.match(bookingEditor, /step="1"/);
  assert.match(bookingEditor, /inputMode="numeric"/);
  assert.match(home, /getPrototypeRevenueSummary\(context/);
  assert.match(home, /href="\/business\/billing"/);
  assert.doesNotMatch(home, /DEMO_BUSINESS_HOME\.revenueToday/);
  assert.match(customerDetail, /ยอดและการชำระ/);
  assert.match(customerDetail, /listPrototypeChargeBalances/);
  assert.match(customerDetail, /listPrototypePayments/);
  assert.match(groomingDetail, /\/business\/billing\?serviceJobId=/);
  assert.match(groomingDetail, /สถานะงานและการชำระเงินแยกกัน/);
  assert.match(hotelDetail, /\/business\/billing\?hotelStayId=/);
  assert.match(hotelDetail, /การชำระเงินทำผ่าน Checkout แยกต่างหาก/);
  assert.match(desktopNav + mobileNav + command, /BUSINESS_BILLING_DESTINATION|href: "\/business\/billing"/);
  assert.doesNotMatch(inboxState, /recordPrototypePayment|addPrototypeChargeAdjustment|cancelPrototypeCharge|PrototypePayment/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.billing-charge-table \{ display: none; \}[\s\S]*?\.billing-charge-cards \{ display: grid/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.billing-charge-card/);
});

test("renders BF-8 Reports as a branch-aware business insights route derived from shared state", async () => {
  const [html, page, screen, presentation, state, desktopNav, mobileNav, command, css] = await Promise.all([
    businessFixtureHtml("/business/reports"),
    readFile(new URL("business/reports/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/reports/ReportsScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/reports/reportsPresentation.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessCommandPalette.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.match(html, /role="status">กำลังโหลดข้อมูลรายงาน/);
  const reportCache = await mkdtemp(join(tmpdir(), "meawketting-report-test-"));
  const fixtureServer = await createServer({ configFile: false, cacheDir: reportCache, server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    plugins: [{ name: "report-browser-ready-simulation", enforce: "pre", transform(code, id) {
      if (id.replaceAll("\\", "/").endsWith("/useBusinessContext.ts")) return code.replace("useSyncExternalStore(emptySubscribe, () => true, () => false)", "useSyncExternalStore(emptySubscribe, () => true, () => true)");
    } }],
  });
  let loadedReport;
  try {
    const { ReportsScreen } = await fixtureServer.ssrLoadModule("/app/business/reports/ReportsScreen.tsx");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    loadedReport = renderToStaticMarkup(createElement(ReportsScreen));
  } finally { await fixtureServer.close(); await rm(reportCache, { recursive: true, force: true, maxRetries: 3 }); }

  assert.match(html, /<h1[^>]*>รายงานและข้อมูลเชิงลึก<\/h1>/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(loadedReport, /รายรับรวม/);
  assert.match(loadedReport, /บริการที่เสร็จสิ้น/);
  assert.match(loadedReport, /การจองทั้งหมด/);
  assert.match(loadedReport, /ลูกค้าที่ใช้บริการ/);
  assert.match(loadedReport, /ภาพรวมตามประเภทบริการ/);
  assert.match(loadedReport, /ข้อมูลเชิงลึกการดำเนินงาน/);
  assert.doesNotMatch(await htmlFor("/business/reports"), /1,350 บาท/); // Production SSR never renders browser financial fixtures.
  assert.doesNotMatch(html, /3,050 บาท/);

  assert.match(screen, /getBusinessReportsSummary/);
  assert.match(screen, /BusinessSegmentedControl/);
  assert.match(screen, /REPORT_PRESET_OPTIONS/);
  assert.match(screen, /REPORT_BRANCH_OPTIONS/);
  assert.match(screen, /BusinessDataTable/);
  assert.match(desktopNav, /BUSINESS_REPORTS_DESTINATION/);
  assert.match(mobileNav, /BUSINESS_REPORTS_DESTINATION/);
  assert.match(command, /"รายงาน"/);
  assert.match(css, /\.business-reports/);
  assert.match(css, /\.reports-kpi-grid/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(page, /ReportsScreen/);
  assert.match(presentation, /formatBusinessMoney/);
  assert.match(state, /getBusinessReportsSummary/);
});

test("collapses BF-8 into shared Service Record history without a standalone CareProof UI", async () => {
  const routes = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const routePaths = routes
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => entry.parentPath.replaceAll("\\", "/"));
  const [html, state, customerDetail, groomingDetail, hotelDetail, desktopNav, mobileNav, command, model, css] = await Promise.all([
    businessFixtureHtml("/business/customers/booking-contact-pim"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/HotelStayDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessCommandPalette.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /ประวัติบริการ/);
  assert.equal(routePaths.some((path) => /business\/careproof/i.test(path)), false);
  assert.match(state, /serviceRecords: Record<string, PrototypeServiceRecord>/);
  assert.match(state, /serviceRecordIdForGroomingJob/);
  assert.match(state, /serviceRecordIdForHotelStay/);
  assert.match(state, /getPrototypeServiceRecordPaymentReference/);
  assert.match(state, /correctPrototypeServiceRecord/);
  assert.match(state, /guardianCareInstruction, Intake, or medical details/);
  assert.match(customerDetail, /ServiceRecordHistoryItem/);
  assert.match(customerDetail, /ประวัติบริการ/);
  assert.match(customerDetail, /<details className="customer-service-record">/);
  assert.match(customerDetail, /getPrototypeServiceRecordPaymentReference/);
  assert.match(customerDetail, /ไม่ใช่ Pet Passport หรือข้อมูลสุขภาพ/);
  assert.doesNotMatch(customerDetail, /business\/careproof|CareProof ล่าสุด|customer-detail-section--careproof/);
  assert.match(groomingDetail, /บันทึกประวัติบริการแล้ว/);
  assert.match(hotelDetail, /บันทึกประวัติบริการแล้ว/);
  assert.doesNotMatch(groomingDetail + hotelDetail, /business\/careproof|grooming-detail-careproof|hotel-detail-lifecycle__careproof/);
  assert.doesNotMatch(desktopNav + mobileNav + command + model, /BUSINESS_CAREPROOF_DESTINATION|business\/careproof|careproof/i);
  assert.match(css, /\.customer-service-record/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.customer-service-record__body/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.customer-service-record/);
  assert.doesNotMatch(css, /\.careproof[-_]/i);
});

test("keeps BF-7 Charge and Payment records separate, branch-safe, idempotent, and checkout-linked", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-billing-test-"));
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    },
    dispatchEvent: () => true,
  };
  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };
  }

  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const ari = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-ari-frontdesk");
    const thonglor = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-thonglor-frontdesk");
    assert.ok(ari);
    assert.ok(thonglor);

    const fixtureRevenue = state.getPrototypeRevenueSummary(ari, state.BOOKING_DEMO_DATE, true);
    assert.deepEqual(
      { revenueToday: fixtureRevenue.revenueToday, paymentCountToday: fixtureRevenue.paymentCountToday, unpaidBalance: fixtureRevenue.unpaidBalance, unpaidCount: fixtureRevenue.unpaidCount, partialCount: fixtureRevenue.partialCount },
      { revenueToday: 1350, paymentCountToday: 2, unpaidBalance: 3050, unpaidCount: 1, partialCount: 1 },
    );
    assert.deepEqual(state.getPrototypeRevenueSummary(thonglor, state.BOOKING_DEMO_DATE, true).revenueToday, 650);

    const ariReports = state.getBusinessReportsSummary(ari, { dateRangePreset: "today", branchScope: "current", fixtureOnly: true });
    assert.equal(ariReports.keyMetrics.revenue, 1350);
    assert.equal(ariReports.keyMetrics.paymentCount, 2);
    assert.equal(ariReports.keyMetrics.unpaidBalance, 3050);
    assert.equal(ariReports.keyMetrics.completedGrooming, 1);
    assert.equal(ariReports.keyMetrics.completedHotel, 0);
    assert.equal(ariReports.keyMetrics.completedServices, 1);
    assert.ok(ariReports.keyMetrics.totalBookings > 0);

    const allReports = state.getBusinessReportsSummary(ari, { dateRangePreset: "today", branchScope: "all", fixtureOnly: true });
    assert.equal(allReports.branchComparison.length, 2);
    assert.equal(allReports.keyMetrics.revenue, 1350 + 650);

    assert.equal(state.applyPrototypeApprovedGroomingAddOn({
      serviceJobId: "grooming-job-fixture-mochi",
      bookingId: "booking-fixture-ari-grooming-1030",
      sourceRequestId: "bf7-test-mochi-fractional",
      serviceName: "ค่าบริการทศนิยม",
      additionalPrice: 99.5,
      additionalMinutes: 10,
      approvedAt: state.BILLING_DEMO_NOW,
    }), null);
    const approvedAddOn = state.applyPrototypeApprovedGroomingAddOn({
      serviceJobId: "grooming-job-fixture-mochi",
      bookingId: "booking-fixture-ari-grooming-1030",
      sourceRequestId: "bf7-test-mochi-deshed",
      serviceName: "แกะสางขน",
      additionalPrice: 300,
      additionalMinutes: 20,
      approvedAt: state.BILLING_DEMO_NOW,
    });
    assert.equal(approvedAddOn?.duplicate, false);

    const groomingCheckout = state.getOrCreatePrototypeChargeForGroomingJob("grooming-job-fixture-mochi", ari);
    assert.equal(groomingCheckout.ok, true);
    assert.equal(groomingCheckout.created, true);
    assert.equal(groomingCheckout.reconciled, true);
    assert.equal(groomingCheckout.charge.lineItems.filter((line) => line.kind === "add-on").length, 1);
    assert.equal(state.getPrototypeChargeBalance(groomingCheckout.charge).total, 1150);
    const repeatedCheckout = state.getOrCreatePrototypeChargeForGroomingJob("grooming-job-fixture-mochi", ari);
    assert.equal(repeatedCheckout.ok, true);
    assert.equal(repeatedCheckout.created, false);
    assert.equal(repeatedCheckout.charge.lineItems.length, groomingCheckout.charge.lineItems.length);

    const payment = state.recordPrototypePayment({
      chargeId: groomingCheckout.charge.chargeId,
      context: ari,
      amount: 500,
      method: "cash",
      note: "รับที่หน้าเคาน์เตอร์",
      requestKey: "bf7-test-mochi-payment",
      recordedAt: state.BILLING_DEMO_NOW,
    });
    assert.equal(payment.ok, true);
    assert.equal(payment.duplicate, false);
    const duplicatedPayment = state.recordPrototypePayment({
      chargeId: groomingCheckout.charge.chargeId,
      context: ari,
      amount: 500,
      method: "cash",
      requestKey: "bf7-test-mochi-payment",
      recordedAt: state.BILLING_DEMO_NOW,
    });
    assert.equal(duplicatedPayment.ok, true);
    assert.equal(duplicatedPayment.duplicate, true);
    assert.equal(duplicatedPayment.payment.paymentId, payment.payment.paymentId);
    const partialBalance = state.getPrototypeChargeBalance(state.readPrototypeCharge(groomingCheckout.charge.chargeId));
    assert.deepEqual({ total: partialBalance.total, paid: partialBalance.paid, remaining: partialBalance.remaining, status: partialBalance.status }, { total: 1150, paid: 500, remaining: 650, status: "partial" });
    assert.deepEqual(
      state.recordPrototypePayment({ chargeId: groomingCheckout.charge.chargeId, context: ari, amount: 651, method: "cash", requestKey: "bf7-test-mochi-overpayment" }),
      { ok: false, reason: "overpayment" },
    );
    assert.deepEqual(
      state.recordPrototypePayment({ chargeId: groomingCheckout.charge.chargeId, context: thonglor, amount: 1, method: "cash", requestKey: "bf7-test-mochi-payment" }),
      { ok: false, reason: "wrong-context" },
    );
    assert.deepEqual(
      state.addPrototypeChargeAdjustment({
        chargeId: groomingCheckout.charge.chargeId,
        context: ari,
        kind: "discount",
        label: "ส่วนลดเกินยอดที่รับแล้ว",
        amount: 700,
        reason: "ต้องไม่ซ่อนยอดรับชำระ",
      }),
      { ok: false, reason: "invalid-total" },
    );

    const discount = state.addPrototypeChargeAdjustment({
      chargeId: groomingCheckout.charge.chargeId,
      context: ari,
      kind: "discount",
      label: "ส่วนลดทดสอบ",
      amount: 100,
      reason: "แก้ไขยอดตามนโยบายร้าน",
    });
    assert.equal(discount.ok, true);
    const discountedBalance = state.getPrototypeChargeBalance(state.readPrototypeCharge(groomingCheckout.charge.chargeId));
    assert.deepEqual({ total: discountedBalance.total, remaining: discountedBalance.remaining, status: discountedBalance.status }, { total: 1050, remaining: 550, status: "partial" });

    const hotelCheckout = state.getOrCreatePrototypeChargeForHotelStay("hotel-stay-fixture-luna", ari);
    assert.equal(hotelCheckout.ok, true);
    assert.equal(hotelCheckout.created, true);
    const hotelStay = state.listPrototypeHotelStays(ari, { includeClosed: true }).find((stay) => stay.hotelStayId === "hotel-stay-fixture-luna");
    assert.equal(hotelStay.status, "in-stay");
    assert.deepEqual(
      { total: state.getPrototypeChargeBalance(hotelCheckout.charge).total, status: state.getPrototypeChargeBalance(hotelCheckout.charge).status },
      { total: 3600, status: "unpaid" },
    );
    const cancelledHotelCharge = state.cancelPrototypeCharge(hotelCheckout.charge.chargeId, "ยกเลิกรายการทดสอบ", ari);
    assert.equal(cancelledHotelCharge.ok, true);
    assert.deepEqual(
      (() => {
        const balance = state.getPrototypeChargeBalance(state.readPrototypeCharge(hotelCheckout.charge.chargeId));
        return { status: balance.status, paid: balance.paid, remaining: balance.remaining };
      })(),
      { status: "cancelled", paid: 0, remaining: 0 },
    );
    assert.deepEqual(
      state.recordPrototypePayment({ chargeId: hotelCheckout.charge.chargeId, context: ari, amount: 100, method: "other", requestKey: "bf7-test-cancelled" }),
      { ok: false, reason: "cancelled" },
    );

    const pairFirst = state.getOrCreatePrototypeChargeForHotelStay("hotel-stay-fixture-mochi-pair", ari);
    const pairSecond = state.getOrCreatePrototypeChargeForHotelStay("hotel-stay-fixture-biscuit-pair", ari);
    assert.equal(pairFirst.ok, true);
    assert.equal(pairSecond.ok, true);
    assert.equal(pairFirst.created, true);
    assert.equal(pairSecond.created, false);
    assert.equal(pairFirst.charge.chargeId, pairSecond.charge.chargeId);
    assert.deepEqual(
      { petId: pairFirst.charge.petId, hotelStayId: pairFirst.charge.hotelStayId, total: state.getPrototypeChargeBalance(pairFirst.charge).total },
      { petId: null, hotelStayId: null, total: 4800 },
    );

    const nalinBalances = state.listPrototypeChargeBalances(ari).filter((balance) => balance.charge.customerId === "booking-contact-nalin");
    assert.equal(nalinBalances.some((balance) => balance.charge.chargeId === groomingCheckout.charge.chargeId && balance.status === "partial"), true);
    assert.equal(state.listPrototypeChargeBalances(thonglor).some((balance) => balance.charge.chargeId === groomingCheckout.charge.chargeId), false);
    const revenueAfterPayment = state.getPrototypeRevenueSummary(ari, state.BOOKING_DEMO_DATE);
    assert.equal(revenueAfterPayment.revenueToday, fixtureRevenue.revenueToday + 500);
    assert.equal(revenueAfterPayment.paymentCountToday, fixtureRevenue.paymentCountToday + 1);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  }
});

test("keeps BF-8 Service Records source-keyed, private, correction-safe, and separate from BF-7 Payment", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-service-record-test-"));
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    },
    dispatchEvent: () => true,
  };
  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };
  }

  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const ari = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-ari-frontdesk");
    const thonglor = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-thonglor-frontdesk");
    assert.ok(ari);
    assert.ok(thonglor);

    const biscuitBeforeReopen = state.readPrototypeServiceRecord("service-record-grooming-grooming-job-fixture-biscuit");
    assert.ok(biscuitBeforeReopen);
    assert.equal(biscuitBeforeReopen.completedAt, "2026-08-18T09:08:00.000Z");
    // The first visible record is fixture-derived. Reopening the source must
    // persist that snapshot before it disappears, then record a revision on
    // re-completion instead of creating a second Service Record.
    const biscuitReopened = state.transitionPrototypeGroomingServiceJob("grooming-job-fixture-biscuit", "in-service", ari);
    assert.equal(biscuitReopened.ok, true);
    const biscuitPersistedBeforeRecompletion = state.readPrototypeServiceRecord("service-record-grooming-grooming-job-fixture-biscuit");
    assert.ok(biscuitPersistedBeforeRecompletion);
    assert.equal(biscuitPersistedBeforeRecompletion.completedAt, biscuitBeforeReopen.completedAt);
    assert.equal(state.updatePrototypeGroomingServiceJobNote("grooming-job-fixture-biscuit", "ตรวจขนบริเวณหูเพิ่มก่อนส่งมอบ", ari).businessNote, "ตรวจขนบริเวณหูเพิ่มก่อนส่งมอบ");
    const biscuitRecompleted = state.transitionPrototypeGroomingServiceJob("grooming-job-fixture-biscuit", "completed", ari);
    assert.equal(biscuitRecompleted.ok, true);
    const biscuit = state.getOrCreatePrototypeServiceRecordForGroomingJob("grooming-job-fixture-biscuit", ari);
    assert.equal(biscuit.ok, true);
    assert.equal(biscuit.created, false);
    assert.deepEqual(
      {
        source: biscuit.record.source,
        serviceJobId: biscuit.record.serviceJobId,
        hotelStayId: biscuit.record.hotelStayId,
        customerId: biscuit.record.customerId,
        petId: biscuit.record.petId,
      },
      {
        source: "grooming-job",
        serviceJobId: "grooming-job-fixture-biscuit",
        hotelStayId: null,
        customerId: "booking-contact-nalin",
        petId: "booking-pet-biscuit",
      },
    );
    assert.notEqual(biscuit.record.completedAt, biscuitBeforeReopen.completedAt);
    assert.equal(biscuit.record.details.some((detail) => detail.label === "บริการหลัก"), true);
    assert.equal(biscuit.record.staffResourceLabels.length > 0, true);
    assert.deepEqual(biscuit.record.photos, []);
    assert.equal(biscuit.record.businessNote, "ตรวจขนบริเวณหูเพิ่มก่อนส่งมอบ");
    assert.equal(biscuit.record.sourceRevisions.length, 1);
    assert.equal(biscuit.record.sourceRevisions[0].completedAt, biscuitBeforeReopen.completedAt);
    assert.ok(Date.parse(biscuit.record.sourceRevisions[0].at) >= Date.parse(biscuit.record.completedAt));
    const biscuitRepeat = state.getOrCreatePrototypeServiceRecordForGroomingJob("grooming-job-fixture-biscuit", ari);
    assert.equal(biscuitRepeat.ok, true);
    assert.equal(biscuitRepeat.created, false);
    assert.equal(biscuitRepeat.record.serviceRecordId, biscuit.record.serviceRecordId);
    assert.equal(state.listPrototypeServiceRecords(ari).filter((record) => record.serviceJobId === "grooming-job-fixture-biscuit").length, 1);

    assert.deepEqual(
      state.getOrCreatePrototypeServiceRecordForGroomingJob("grooming-job-fixture-mochi", ari),
      { ok: false, reason: "not-completed" },
    );
    const mochiCompletion = state.transitionPrototypeGroomingServiceJob("grooming-job-fixture-mochi", "completed", ari);
    assert.equal(mochiCompletion.ok, true);
    const mochiRecord = state.readPrototypeServiceRecord("service-record-grooming-grooming-job-fixture-mochi");
    assert.ok(mochiRecord);
    const mochiCharge = state.getOrCreatePrototypeChargeForGroomingJob("grooming-job-fixture-mochi", ari);
    assert.equal(mochiCharge.ok, true);
    const mochiPayment = state.recordPrototypePayment({
      chargeId: mochiCharge.charge.chargeId,
      context: ari,
      amount: 200,
      method: "cash",
      requestKey: "bf8-mochi-payment",
      recordedAt: state.BILLING_DEMO_NOW,
    });
    assert.equal(mochiPayment.ok, true);
    assert.equal(state.getPrototypeServiceRecordPaymentReference(mochiRecord, ari).status, "partial");
    const mochiReopened = state.transitionPrototypeGroomingServiceJob("grooming-job-fixture-mochi", "in-service", ari);
    assert.equal(mochiReopened.ok, true);
    assert.equal(state.readPrototypeServiceRecord(mochiRecord.serviceRecordId).serviceRecordId, mochiRecord.serviceRecordId);
    assert.equal(state.updatePrototypeGroomingServiceJobNote("grooming-job-fixture-mochi", "แก้หมายเหตุของงานต้นทาง", ari).businessNote, "แก้หมายเหตุของงานต้นทาง");
    assert.notEqual(state.readPrototypeServiceRecord(mochiRecord.serviceRecordId).businessNote, "แก้หมายเหตุของงานต้นทาง");

    const correction = state.correctPrototypeServiceRecord({
      serviceRecordId: biscuit.record.serviceRecordId,
      context: ari,
      field: "summary",
      nextValue: "อาบน้ำและตัดขนเรียบร้อย",
      reason: "ปรับถ้อยคำให้ตรงกับการบริการจริง",
      requestKey: "bf8-biscuit-summary-correction",
    });
    assert.equal(correction.ok, true);
    assert.equal(correction.duplicate, false);
    assert.equal(correction.record.corrections.length, 1);
    assert.equal(correction.record.corrections[0].previousValue, "อาบน้ำ / ตัดขน เสร็จแล้ว");
    assert.ok(Date.parse(correction.record.corrections[0].at) >= Date.parse(correction.record.completedAt));
    const correctionRepeat = state.correctPrototypeServiceRecord({
      serviceRecordId: biscuit.record.serviceRecordId,
      context: ari,
      field: "summary",
      nextValue: "อาบน้ำและตัดขนเรียบร้อย",
      reason: "ปรับถ้อยคำให้ตรงกับการบริการจริง",
      requestKey: "bf8-biscuit-summary-correction",
    });
    assert.equal(correctionRepeat.ok, true);
    assert.equal(correctionRepeat.duplicate, true);
    assert.equal(correctionRepeat.record.corrections.length, 1);
    assert.deepEqual(
      state.correctPrototypeServiceRecord({
        serviceRecordId: biscuit.record.serviceRecordId,
        context: thonglor,
        field: "summary",
        nextValue: "ห้ามแก้ข้ามสาขา",
        reason: "ทดสอบสิทธิ์สาขา",
        requestKey: "bf8-wrong-branch-correction",
      }),
      { ok: false, reason: "wrong-context" },
    );

    const biscuitPayment = state.getPrototypeServiceRecordPaymentReference(state.readPrototypeServiceRecord(biscuit.record.serviceRecordId), ari);
    assert.equal(biscuitPayment.status, "paid");
    // Billing remains a read-only reference in history. A paid Charge does
    // not create a second record or start a handover workflow, and execution
    // can still be corrected through the source lifecycle.
    const reopenAfterPayment = state.transitionPrototypeGroomingServiceJob("grooming-job-fixture-biscuit", "in-service", ari);
    assert.equal(reopenAfterPayment.ok, true);
    assert.equal(state.readPrototypeServiceRecord(biscuit.record.serviceRecordId).serviceRecordId, biscuit.record.serviceRecordId);

    const biscuitHotelCare = state.completePrototypeHotelCareTask("hotel-stay-fixture-biscuit-checkout", "hotel-care-biscuit-check", ari);
    assert.ok(biscuitHotelCare);
    const biscuitHotelCheckout = state.transitionPrototypeHotelStay("hotel-stay-fixture-biscuit-checkout", "checked-out", ari);
    assert.equal(biscuitHotelCheckout.ok, true);
    const biscuitHotelRecord = state.readPrototypeServiceRecord("service-record-hotel-hotel-stay-fixture-biscuit-checkout");
    assert.ok(biscuitHotelRecord);
    assert.equal(biscuitHotelRecord.source, "hotel-stay");
    assert.equal(biscuitHotelRecord.details.some((detail) => detail.label === "ช่วงเข้าพัก"), true);
    assert.equal(biscuitHotelRecord.details.some((detail) => detail.label === "ห้อง / โซน"), true);
    const biscuitHotelRepeat = state.getOrCreatePrototypeServiceRecordForHotelStay("hotel-stay-fixture-biscuit-checkout", ari);
    assert.equal(biscuitHotelRepeat.ok, true);
    assert.equal(biscuitHotelRepeat.created, false);
    assert.equal(biscuitHotelRepeat.record.serviceRecordId, biscuitHotelRecord.serviceRecordId);

    const luna = state.readPrototypeHotelStay("hotel-stay-fixture-luna");
    assert.ok(luna);
    for (const task of luna.dailyCareTasks.filter((task) => task.state !== "completed")) {
      assert.ok(state.completePrototypeHotelCareTask(luna.hotelStayId, task.id, ari));
    }
    assert.equal(state.transitionPrototypeHotelStay(luna.hotelStayId, "ready-for-checkout", ari).ok, true);
    assert.equal(state.transitionPrototypeHotelStay(luna.hotelStayId, "checked-out", ari).ok, true);
    const lunaRecord = state.readPrototypeServiceRecord("service-record-hotel-hotel-stay-fixture-luna");
    assert.ok(lunaRecord);
    const lunaJson = JSON.stringify(lunaRecord);
    for (const protectedValue of [
      "guardianCareInstruction",
      "ให้อาหารตามตารางที่ลูกค้าแจ้ง",
      "customer-confirmed-intake",
      "prototype-intake-hotel-luna",
      "ทำตามคำแนะนำที่ลูกค้ายืนยัน",
      "medication",
      "incidentNotes",
      "passportSlug",
      "demo-luna",
    ]) assert.doesNotMatch(lunaJson, new RegExp(protectedValue));

    const nalinHistory = state.listPrototypeServiceRecordsForCustomer("booking-contact-nalin", ari);
    assert.equal(nalinHistory.some((record) => record.serviceRecordId === biscuit.record.serviceRecordId && record.petId === "booking-pet-biscuit"), true);
    assert.equal(state.listPrototypeServiceRecords(thonglor).some((record) => record.serviceRecordId === biscuit.record.serviceRecordId), false);

    const persisted = JSON.parse(storage.get(state.BUSINESS_STORAGE_KEY));
    assert.ok(persisted.serviceRecords[biscuit.record.serviceRecordId]);
    assert.ok(persisted.charges[mochiCharge.charge.chargeId]);
    assert.ok(persisted.payments[mochiPayment.payment.paymentId]);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  }
});

test("renders a backend-searchable Customers & Pets route for Business frontdesk work", async () => {
  const [html, page, screen, avatars, state, durableClient, desktopNav, mobileNav, css] = await Promise.all([
    businessFixtureHtml("/business/customers"),
    readFile(new URL("business/customers/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomersScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessIdentityAvatar.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("_backend/be2/client.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>ลูกค้าและสัตว์เลี้ยง<\/h1>/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /ค้นหาชื่อลูกค้า ชื่อน้อง หรือเบอร์โทร/);
  assert.match(html, /เพิ่มลูกค้า/);
  assert.match(html, /Mochi/);
  assert.match(html, /Luna/);
  assert.match(html, /href="\/business\/customers\/booking-contact-nalin"/);
  assert.match(html, /นัดถัดไป/);
  assert.match(page, /CustomersScreen/);
  assert.match(screen, /CUSTOMER_CRM_SEGMENTS/);
  assert.match(screen, /searchDurableCustomers/);
  assert.match(durableClient, /type: "customer\.search"/);
  assert.match(screen, /customerMatchesCrmSegment/);
  assert.match(screen, /customer-list-item__identity/);
  assert.match(screen, /customer-list-item__pets/);
  assert.match(screen, /BusinessCustomerAvatar/);
  assert.match(screen, /BusinessPetAvatar/);
  assert.match(screen, /customer-results__heading/);
  assert.match(screen, /crmProfiles\.filter\(\(profile\) => customerMatchesCrmSegment\(profile, option\.value\)\)\.length/);
  assert.doesNotMatch(screen, /customer-list__header|<table|<th/);
  assert.match(screen, /CustomerEditor/);
  assert.match(avatars, /aria-hidden="true"/);
  assert.match(avatars, /role="img"/);
  assert.match(avatars, /pet\.species === "cat" \? Cat : Dog/);
  assert.match(state, /DEMO_CUSTOMER_FIXTURES/);
  assert.match(state, /listPrototypeCustomers/);
  assert.match(state, /phone: "081-555-0142"/);
  assert.match(desktopNav + mobileNav, /BUSINESS_CUSTOMERS_DESTINATION/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.customer-list-item \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 24px/);
});

test("renders stable Customer detail with Pets, Bookings, local notes, and Passport boundaries", async () => {
  const [html, page, detail, badges, petEditor] = await Promise.all([
    businessFixtureHtml("/business/customers/booking-contact-pim"),
    readFile(new URL("business/customers/[customerId]/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerBadges.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/PetRelationshipEditor.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>[\s\S]*?คุณพิม[\s\S]*?<\/h1>/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /ผู้ติดต่อหลัก/);
  assert.match(html, /Luna/);
  assert.match(html, /Tofu/);
  assert.match(html, /หมายเหตุของร้าน/);
  assert.match(html, /Passport และสิทธิ์เข้าถึง/);
  assert.match(html, /ประวัติบริการ/);
  assert.match(html, /href="\/business\/calendar\?customerId=booking-contact-pim"/);
  assert.match(html, /href="\/business\/inbox\?customerId=booking-contact-pim"/);
  assert.match(page, /CustomerDetailScreen/);
  assert.match(detail, /ผู้ติดต่อหลักไม่เท่ากับ Guardian/);
  assert.match(detail, /ข้อมูลจาก Pet Passport/);
  assert.match(detail, /ข้อมูลของร้าน/);
  assert.match(detail, /สิทธิ์ที่ร้านมีตอนนี้/);
  assert.match(detail, /<details className="customer-authority-note">/);
  assert.doesNotMatch(detail, /<details className="customer-authority-note"\s+open/);
  assert.match(detail, /updateDurableCustomerTags/);
  assert.match(detail, /PetRelationshipEditor/);
  assert.match(badges, /ข้อมูลที่ลูกค้าแจ้ง|petDataSourceLabel/);
  assert.match(petEditor, /createDurablePet/);
  assert.match(petEditor, /allowPotentialDuplicate/);
  assert.doesNotMatch(petEditor, /บังคับ.*Pet Passport|ต้องเชื่อม Pet Passport/);
  assert.match(petEditor, /role=\{embedded \? "region" : "dialog"\}/);
  assert.match(petEditor, /aria-modal=\{embedded \? undefined : "true"\}/);
});

test("keeps durable Customer/Pet truth and non-authoritative Passport compatibility explicit", async () => {
  const [state, editor, detail, petEditor, durableClient, durableCache, passportCompatibility, intake] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/PetRelationshipEditor.tsx", appRoot), "utf8"),
    readFile(new URL("_backend/be2/client.ts", appRoot), "utf8"),
    readFile(new URL("_backend/be2/customerPetCache.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/be2PassportCompatibility.ts", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
  ]);

  assert.match(state, /PetPassportConnectionState/);
  assert.match(state, /"linked-active" \| "linked-no-access" \| "unlinked" \| "access-expired"/);
  assert.match(state, /customers: Record<string, PrototypeCustomer>/);
  assert.match(state, /customers: \{\}/);
  assert.doesNotMatch(state, /export function savePrototypeCustomer|export function addPrototypePetRelationship/);
  assert.match(editor, /createDurableCustomer/);
  assert.match(editor, /updateDurableCustomer/);
  assert.match(petEditor, /createDurablePet/);
  assert.match(durableClient, /BE2_API_PATH/);
  assert.match(durableCache, /readBe2CustomerByStableId/);
  assert.match(passportCompatibility, /DEV PROTOTYPE \/ NON-AUTHORITATIVE READ MODEL ONLY/);
  assert.match(passportCompatibility, /not returned by BE2, persisted in PostgreSQL/);
  assert.match(state, /findKnownBusinessCustomerPetByPassportSlug/);
  assert.match(state, /unknown QR never creates a permanent Customer relationship/);
  assert.match(editor, /อาจมีลูกค้ารายนี้อยู่แล้ว/);
  assert.match(editor, /ดูข้อมูลเดิม/);
  assert.match(editor, /สร้างต่อ/);
  assert.match(detail, /DataSourceLabel/);
  assert.match(detail, /pet\.businessNote/);
  assert.match(detail, /การเชื่อมต่อไม่ใช่สิทธิ์ถาวร/);
  assert.match(intake, /knownCustomer/);
  assert.match(intake, /ไม่สร้างลูกค้าใหม่ และไม่แก้ Pet Passport/);
  assert.doesNotMatch(state + detail, /writeClaimedPrototypePet|owner of the pet|เจ้าของสัตว์เลี้ยง/);
});

test("reuses the Customer relationship source for Booking context and responsive Business UI", async () => {
  const [calendar, editor, bookingItem, state, css] = await Promise.all([
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingItem.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(calendar, /customerId/);
  assert.match(calendar, /petId/);
  assert.match(calendar, /preselectedCustomerId/);
  assert.match(calendar, /handledLaunchRef/);
  assert.match(calendar, /useState<EditorState>\(\(\) => \([\s\S]*?launchKey[\s\S]*?customerId: launchCustomerId, petId: launchPetId/);
  assert.match(calendar, /useRef<string \| null>\(launchBookingId \? null : launchKey\)/);
  assert.match(calendar, /requestAnimationFrame\(\(\) => \{[\s\S]*?setEditor\(\{ kind: "new", customerId: launchCustomerId, petId: launchPetId \}\)/);
  assert.match(editor, /preselectedCustomerId/);
  assert.match(editor, /preselectedPetId/);
  assert.match(editor, /getDemoBookingContacts\(context\)/);
  assert.match(bookingItem, /resolvePrototypeBookingRelationship/);
  assert.match(state, /getDemoBookingContacts\(context/);
  assert.match(css, /BF-3 — Customers & Pets foundation/);
  assert.match(css, /Business BF1–BF3 UX\/UI correction — operational density/);
  assert.match(css, /customer-list-item__identity/);
  assert.doesNotMatch(css, /customer-list__header/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?business-customers/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?business-customers/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?customer-editor/);
  assert.match(css, /customer-editor__backdrop/);
  assert.match(css, /min-height: 44px/);
});

test("renders BF-4 Inbox as a contextual Business communication route", async () => {
  const [html, page, inbox, list, pane, timeline, composer, presentation, state] = await Promise.all([
    businessFixtureHtml("/business/inbox?conversation=conversation-fixture-pim"),
    readFile(new URL("business/inbox/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/BusinessInbox.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationList.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationPane.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageTimeline.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageComposer.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/inboxPresentation.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>ข้อความ<\/h1>/);
  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /ค้นหาลูกค้า น้อง หรือข้อความ/);
  assert.match(html, /ทั้งหมด/);
  assert.match(html, /ยังไม่ได้อ่าน/);
  assert.match(html, /กำลังใช้บริการ/);
  assert.doesNotMatch(html, /จบงานแล้ว/);
  // Production SSR has no authenticated inbox data. Hydration reads the scoped API.
  assert.doesNotMatch(await htmlFor("/business/inbox"), /คุณพิม|ได้รับข้อมูลแล้วค่ะ ขอบคุณค่ะ|แกะสางขน/);
  assert.match(await businessFixtureHtml("/business/inbox", { empty: true }), /เลือกบทสนทนาเพื่อเริ่มงาน/);
  assert.match(inbox, /ensureDurableInbox/);
  assert.match(inbox, /loadDurableConversation/);
  assert.match(timeline, /ร้านขอเพิ่มบริการ/);
  assert.match(composer, /พิมพ์ข้อความ/);
  assert.match(page, /conversationId/);
  assert.match(page, /customerId/);
  assert.match(page, /bookingId/);
  assert.doesNotMatch(page, /\[conversationId\]/);
  assert.match(inbox, /ConversationList/);
  assert.match(inbox, /ConversationPane/);
  assert.match(list, /conversationMatchesPrototypeSearch|prototypeMessagePreview/);
  assert.match(pane, /MessageTimeline/);
  assert.match(pane, /MessageComposer/);
  assert.match(timeline, /StructuredRequestCard/);
  assert.match(composer, /PROTOTYPE_QUICK_REPLIES/);
  assert.match(presentation, /conversationIsInService/);
  assert.match(state, /DEMO_CONVERSATION_FIXTURES/);
});

test("keeps BF-4 local conversation reducers reusable, idempotent, and Business-wide across Branches", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-inbox-test-"));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/inboxState.ts");
    const business = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const presentation = await vite.ssrLoadModule("/app/business/inbox/inboxPresentation.ts");
    const ari = business.DEMO_BUSINESS_CONTEXTS[0];
    const thonglor = business.DEMO_BUSINESS_CONTEXTS[1];
    const ariThreads = state.listPrototypeConversationFixtures(ari);
    const thonglorThreads = state.listPrototypeConversationFixtures(thonglor);
    assert.deepEqual(ariThreads.map((item) => item.conversationId), thonglorThreads.map((item) => item.conversationId));

    const conversation = state.findReusablePrototypeConversation(ariThreads, ari.businessId, "booking-contact-pim");
    assert.ok(conversation);
    assert.equal(conversation.conversationId, "conversation-fixture-pim");
    const read = state.markPrototypeConversationReadValue(conversation, "2026-08-18T05:00:00.000Z");
    assert.equal(read.unreadCount, 0);
    assert.equal(conversation.unreadCount, 2);

    const appended = state.appendPrototypeTextMessageValue(read, " พร้อมรับกลับแล้วค่ะ ", "message-test", "2026-08-18T05:01:00.000Z");
    assert.equal(appended.message.text, "พร้อมรับกลับแล้วค่ะ");
    assert.equal(appended.conversation.messages.length, read.messages.length + 1);
    const request = conversation.messages.find((message) => message.kind === "add-service-request");
    assert.ok(request);
    const approved = state.applyPrototypeGuardianDecision(request, "approved", "2026-08-18T05:02:00.000Z");
    assert.equal(approved.duplicate, false);
    assert.equal(approved.message.requestStatus, "approved");
    assert.equal(approved.message.responseSource, "guardian-local-preview");
    const duplicate = state.applyPrototypeGuardianDecision(approved.message, "declined", "2026-08-18T05:03:00.000Z");
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.message.requestStatus, "approved");

    const context = presentation.resolvePrototypeConversationContext(conversation, true);
    assert.equal(presentation.conversationMatchesPrototypeSearch(conversation, context, "Luna"), true);
    assert.equal(presentation.conversationMatchesPrototypeSearch(conversation, context, "ได้รับข้อมูลแล้ว"), true);
    assert.equal(presentation.conversationMatchesPrototypeSearch(conversation, context, "คำที่ไม่มี"), false);
    assert.equal(presentation.conversationIsInService(context), true);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
});

test("integrates Inbox with Customer, Booking, Home, unread navigation, and stable query recovery", async () => {
  const [customer, bookingEditor, calendarPage, calendar, home, desktopNav, mobileNav, model, inbox] = await Promise.all([
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(new URL("business/inbox/BusinessInbox.tsx", appRoot), "utf8"),
  ]);

  assert.match(customer, /\/business\/inbox\?customerId=/);
  assert.match(customer, /ส่งข้อความ/);
  assert.match(bookingEditor, /\/business\/inbox\?customerId=/);
  assert.match(bookingEditor, /bookingId=/);
  assert.match(calendarPage, /bookingId/);
  assert.match(calendar, /getDurableBooking\(context\.businessId, context\.branchId, launchBookingId\)/);
  assert.match(inbox, /ensurePrototypeConversation/);
  assert.match(inbox, /params\.set\("conversation"/);
  assert.match(home, /getPrototypeInboxUnreadCount/);
  assert.match(home, /"\/business\/inbox"/);
  assert.match(desktopNav + mobileNav, /getPrototypeInboxUnreadCount/);
  assert.match(desktopNav, /business-nav-unread-badge/);
  assert.match(mobileNav, /business-mobile-unread-badge/);
  assert.match(model, /BUSINESS_MESSAGES_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/inbox"/);
  for (const planned of ["อาบน้ำ / ตัดขน", "โรงแรม", "Daycare", "การเงิน", "รายงาน", "ทีม", "ตั้งค่า"]) {
    assert.match(model, new RegExp(planned));
  }
});

test("keeps structured approval Guardian-owned and limits approved Grooming add-ons to the Service Job", async () => {
  const [state, timeline, dialog, pane] = await Promise.all([
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageTimeline.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/AddServiceRequestDialog.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationPane.tsx", appRoot), "utf8"),
  ]);

  assert.match(state, /requestStatus:\s*"waiting"/);
  assert.match(state, /simulatePrototypeGuardianResponse/);
  assert.match(state, /guardian-local-preview/);
  assert.match(state, /if \(message\.requestStatus !== "waiting"\)[\s\S]*duplicate: true/);
  assert.match(state, /applyPrototypeApprovedGroomingAddOn/);
  assert.match(state, /if \(decision === "approved"\)[\s\S]*applyPrototypeApprovedGroomingAddOn/);
  assert.doesNotMatch(state, /savePrototypeBooking/);
  assert.doesNotMatch(state, /savePrototype(?:Charge|Payment)|createPrototype(?:Charge|Payment)/);
  assert.doesNotMatch(timeline, /โหมดทดสอบ|จำลองเจ้าของ|simulatePrototypeGuardianResponse/);
  assert.match(timeline, /request\.serviceJobId \?/);
  assert.match(timeline, /อัปเดตเฉพาะงานบริการ/);
  assert.match(timeline, /ไม่เปลี่ยนการจองหรือยอดเรียกเก็บอัตโนมัติ/);
  assert.match(dialog, /บริการเพิ่มเติม/);
  assert.match(dialog, /ราคาเพิ่ม/);
  assert.match(dialog, /เวลาเพิ่ม \(นาที\)/);
  assert.match(dialog, /รอเจ้าของตอบ/);
  assert.match(pane, /AddServiceRequestDialog/);
});

test("connects Calendar, Intake, Inbox, Customer history, and Home through the shared Grooming Job identity", async () => {
  const [businessState, inboxState, calendarEditor, intake, customerDetail, home, detail, dialog] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/AddServiceRequestDialog.tsx", appRoot), "utf8"),
  ]);

  assert.match(businessState, /serviceJobs: Record<string, PrototypeServiceJob>/);
  assert.match(businessState, /synchronizePrototypeGroomingJobsForBooking/);
  assert.match(businessState, /buildGroomingServiceJobFromBooking/);
  assert.match(businessState, /record\.serviceJobId/);
  assert.match(businessState, /รับเข้าแล้วจาก Intake/);
  assert.match(calendarEditor, /\/business\/grooming\?jobId=/);
  assert.match(intake, /\/business\/grooming\?jobId=/);
  assert.match(customerDetail, /listPrototypeServiceRecords/);
  assert.match(customerDetail, /ServiceRecordHistoryItem/);
  assert.match(home, /getGroomingServiceJobSummary/);
  assert.match(home, /groomingSummary\.total/);
  assert.doesNotMatch(home, /grooming:\s*\{ value: "(?:8|5) งานวันนี้/);
  assert.match(inboxState, /serviceJobId\?: string \| null/);
  assert.match(inboxState, /applyPrototypeApprovedGroomingAddOn/);
  assert.match(detail, /serviceJobId: job\.serviceJobId/);
  assert.match(dialog, /serviceJobId/);
  assert.doesNotMatch(detail, /simulatePrototypeGuardianResponse|อนุมัติ \(จำลองเจ้าของ\)/);
});

test("keeps Inbox privacy-safe, accessible, and responsive without a full Consumer Inbox", async () => {
  const [state, inbox, list, pane, timeline, composer, dialog, presentation, css, routes] = await Promise.all([
    readFile(new URL("_prototype/inboxState.ts", appRoot), "utf8"),
    readFile(new URL("business/inbox/BusinessInbox.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationList.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationPane.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageTimeline.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageComposer.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/AddServiceRequestDialog.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/inboxPresentation.ts", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
    readdir(appRoot, { recursive: true, withFileTypes: true }),
  ]);
  const conversationType = state.match(/export type PrototypeConversation = \{[\s\S]*?\n\};/)?.[0] ?? "";
  const inboxSources = inbox + list + pane + timeline + composer + dialog + presentation;
  const routePaths = routes.filter((entry) => entry.isFile() && entry.name === "page.tsx").map((entry) => entry.parentPath.replaceAll("\\", "/"));

  assert.match(conversationType, /customerId: string/);
  assert.match(conversationType, /petId: string \| null/);
  assert.match(conversationType, /bookingId: string \| null/);
  assert.doesNotMatch(conversationType, /customerName|petName|passport|health|allerg/i);
  assert.doesNotMatch(state, /sharingState|TemporaryAccess|sharedScope|allowedScope|passportSlug/);
  assert.doesNotMatch(inboxSources, /passportSlug|businessNote|sharedScope|allowedScope|allerg|medication/i);
  assert.equal(routePaths.some((path) => /business\/inbox\/\[conversationId\]$/.test(path)), false);
  assert.equal(routePaths.some((path) => /(?:^|\/)messages(?:\/|$)/.test(path) && !/business\/inbox/.test(path)), false);
  assert.match(list, /<button[\s\S]*?aria-current=/);
  assert.match(list, /aria-label=\{`\$\{identityLabel\}/);
  assert.match(pane, /headingRef\.current\?\.focus/);
  assert.match(composer, /<label className="sr-only"/);
  assert.match(composer, /aria-label="ส่งข้อความ"/);
  assert.match(timeline, /role="log"/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(css, /BF-4 — Inbox & Customer Communication foundation/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?business-inbox\.has-selection \.inbox-list-pane[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.message-composer/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.structured-request-card/);
  assert.match(css, /min-height: 44px/);
});

test("enforces the BF1–BF3 Business content-density contracts without changing workflow logic", async () => {
  const [pageHeader, home, calendar, booking, customers, detail, customerEditor, petEditor, css] = await Promise.all([
    readFile(new URL("business/_components/BusinessPageHeader.tsx", appRoot), "utf8"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomersScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/PetRelationshipEditor.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(pageHeader, /context\?: ReactNode/);
  assert.match(pageHeader, /actions\?: ReactNode/);
  assert.match(pageHeader, /<h1>/);
  assert.doesNotMatch(home + calendar + customers + detail, /business-demo-label|business-section-kicker|Whisker Rest Demo|\(ตัวอย่าง\)/);
  assert.doesNotMatch(booking, /แก้ไขข้อมูลตัวอย่าง|เริ่มจากข้อมูลหลัก|บริการ ลูกค้า และน้อง/);
  assert.doesNotMatch(customers + css, /customer-list__header|<table|<th/);
  assert.doesNotMatch(css, /business-(?:home|calendar|customers)__heading|business-customer-detail__heading|customer-pet-summary/);
  assert.match(customers, /customer-list-item__identity/);
  assert.match(detail, /<details className="customer-pet-row__details">/);
  assert.match(detail, /<details className="customer-authority-note">/);
  assert.doesNotMatch(customerEditor + petEditor, /eyebrow|intro|ต้องเชื่อม Pet Passport/);
  assert.match(css, /width: min\(100% - 64px, 1200px\)/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("keeps Business out of authenticated Consumer navigation", async () => {
  const [menu, appNav, bottomNavigation] = await Promise.all([
    readFile(new URL("_components/UserMenu.tsx", appRoot), "utf8"),
    readFile(new URL("_components/AppNav.tsx", appRoot), "utf8"),
    readFile(new URL("_components/BottomNavigation.tsx", appRoot), "utf8"),
  ]);

  const authenticatedMenu = menu.slice(menu.indexOf("const groups"));
  const consumerNav = appNav.match(/const consumerNavItems[\s\S]*?\];/)?.[0] ?? "";
  const consumerBottomNav = bottomNavigation.match(/const consumerItems[\s\S]*?\];/)?.[0] ?? "";
  assert.doesNotMatch(authenticatedMenu + consumerNav + consumerBottomNav, /\/business|Business Scanner|สำหรับธุรกิจ/);
  assert.match(consumerNav, /หน้าหลัก[\s\S]*disabled: true/);
  assert.match(consumerNav, /href: "\/my-pets", label: "สัตว์เลี้ยง"/);
  assert.match(consumerNav, /href: "\/activity", label: "กิจกรรม"/);
  assert.match(consumerNav, /ข้อความ[\s\S]*disabled: true/);
  assert.doesNotMatch(consumerNav, /\/create-passport|href:\s*["']\/["']/);
  assert.doesNotMatch(authenticatedMenu, /\/my-pets|\/create-passport|\/activity|My Pets|Create Passport|Activity|Messages/);
  assert.match(menu, /user-menu__business-entry[\s\S]*href="\/business"/);
});

test("keeps Consumer navigation aligned across mobile and desktop without fake destinations", async () => {
  const [css, appNav, bottomNavigation, myPets] = await Promise.all([
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("_components/AppNav.tsx", appRoot), "utf8"),
    readFile(new URL("_components/BottomNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("my-pets/MyPetsScreen.tsx", appRoot), "utf8"),
  ]);
  const consumerNav = appNav.match(/const consumerNavItems[\s\S]*?\];/)?.[0] ?? "";
  const consumerBottomNav = bottomNavigation.match(/const consumerItems[\s\S]*?\];/)?.[0] ?? "";
  for (const label of ["หน้าหลัก", "สัตว์เลี้ยง", "กิจกรรม", "ข้อความ"]) {
    assert.match(consumerNav, new RegExp(label));
    assert.match(consumerBottomNav, new RegExp(label));
  }
  assert.equal((consumerBottomNav.match(/label:/g) ?? []).length, 4);
  assert.equal((consumerNav.match(/label:/g) ?? []).length, 4);
  assert.match(appNav + bottomNavigation, /aria-disabled="true"/);
  assert.doesNotMatch(consumerNav + consumerBottomNav, /href:\s*["']\/(?:home|inbox|messages?)["']/i);
  assert.match(consumerNav + consumerBottomNav, /href: "\/my-pets"/);
  assert.match(consumerNav + consumerBottomNav, /href: "\/activity"/);
  assert.match(myPets, /href="\/create-passport"/);
  assert.match(myPets, /สร้าง Pet Passport/);
  assert.match(myPets, /เพิ่มสัตว์เลี้ยง/);
  assert.match(myPets, /my-pets-add-action/);
  const headingBlock = myPets.match(/<header className="consumer-page__heading">[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.doesNotMatch(headingBlock, /เพิ่มสัตว์เลี้ยง/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /--text-meaw-bottom-nav:\s*0\.875rem/);
  assert.match(css, /bottom-navigation__link--disabled/);
  assert.match(css, /min-height:\s*64px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /width:\s*min\(92vw,\s*420px\)/);
  assert.match(css, /user-menu-drawer-in/);
  assert.match(css, /photo-step__actions[\s\S]*?border:\s*1px solid var\(--rose-200\)/);
});

test("applies calm operational Business styling and restrained accessible motion", async () => {
  const css = await readFile(new URL("globals.css", appRoot), "utf8");
  assert.match(css, /Business portal separation — WARM OPERATIONAL CLARITY/);
  assert.match(css, /\.business-header\s*\{[\s\S]*?color-meaw-yellow-300/);
  assert.match(css, /\.business-portal \.button--business,[\s\S]*?box-shadow: 0 1px 2px/);
  assert.match(css, /@keyframes business-calm-enter[\s\S]*?translateY\(8px\)/);
  assert.match(css, /\.business-state-enter\s*\{[\s\S]*?220ms ease-out/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.business-state-enter[\s\S]*?animation: none !important/);
  assert.match(css, /\.business-page \.button:hover svg[\s\S]*?animation: none/);
  assert.match(css, /@media \(max-width: 430px\)/);
});

test("uses everyday Thai task language across the Business flow", async () => {
  const [scanner, intake, login] = await Promise.all([
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("business/login/BusinessLoginScreen.tsx", appRoot), "utf8"),
  ]);
  const copy = scanner + intake + login;
  assert.match(copy, /สแกนรับเข้า/);
  assert.match(copy, /ข้อมูลที่ร้านได้รับ/);
  assert.match(copy, /บันทึกรับเข้า/);
  assert.match(copy, /เสนอแก้ไขข้อมูล/);
  assert.match(copy, /ยืนยันรับเข้า/);
  assert.doesNotMatch(copy, /CHECK-IN REVIEW|ยืนยัน Check-in|Shared with this Business|Suggest Correction|รอ Guardian|Protected Pet values/);
});

test("renders the Phase E Business Scanner as a reachable operational route", async () => {
  const [html, source, siteHeader, hero] = await Promise.all([
    businessFixtureHtml("/business/scan"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("_components/SiteHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>สแกนรับเข้า<\/h1>/);
  assert.match(html, /QR ชั่วคราว/);
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /BarcodeDetector/);
  assert.match(source, /กรอกรหัสใต้ QR/);
  assert.doesNotMatch(source, /รหัสทดลอง:|placeholder="เช่น DEMO-|ตัวควบคุมทดสอบ/);
  assert.match(source, /camera-denied/);
  assert.match(source, /camera-unavailable/);
  assert.match(source, /no-camera/);
  assert.match(source, /unreadable/);
  assert.match(siteHeader, /pathname\.startsWith\("\/business\/"\)/);
  assert.match(hero, /href="\/business\/login"/);
});

test("rejects Quick Passport and Public Safety QR before Business Intake", async () => {
  const [scanner, businessState] = await Promise.all([
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);

  assert.match(businessState, /QrContractType = "quick-passport" \| "public-safety" \| "temporary-business" \| "unknown"/);
  assert.match(businessState, /quick-passport/);
  assert.match(businessState, /public-safety/);
  assert.match(businessState, /temporary-access/);
  assert.match(scanner, /type === "quick-passport" \|\| type === "public-safety"/);
  assert.match(scanner, /QR นี้ไม่ได้ใช้สำหรับรับเข้าร้าน/);
  assert.match(scanner, /สแกน QR ชั่วคราวสำหรับร้าน/);
  assert.doesNotMatch(scanner, /getPrototypePetBySlug/);
});

test("keeps every Scanner failure Pet-neutral with explicit recovery", async () => {
  const scanner = await readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8");
  for (const state of ["invalid", "expired", "revoked", "wrong-business", "suspicious", "network-error", "access-changed"]) {
    assert.match(scanner, new RegExp(`(?:^|\\s|")${state.replace("-", "-")}(?:"|:)`));
  }
  assert.match(scanner, /ยังไม่เปิดข้อมูลระบุตัวน้อง/);
  assert.match(scanner, /ข้อมูลที่ต้องมีสิทธิ์ยังถูกซ่อนไว้/);
  assert.match(scanner, /ขอ QR ใหม่จากเจ้าของ/);
  assert.match(scanner, /ref=\{resultHeadingRef\}[\s\S]*tabIndex=\{-1\}/);
});

test("keeps QR taxonomy while the Business Scanner validates grants through BE5", async () => {
  const [sharingState, businessState, scanner] = await Promise.all([
    readFile(new URL("_prototype/sharingState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
  ]);

  assert.match(sharingState, /findTemporaryAccessByFallbackCode/);
  assert.match(sharingState, /evaluateTemporaryAccess/);
  assert.match(businessState, /getBusinessFixture/);
  assert.match(businessState, /getBusinessBranch/);
  assert.match(businessState, /meawketting:business-intake:prototype-v1/);
  assert.match(scanner, /scanTemporaryAccess/);
  assert.match(scanner, /startDurableIntake/);
  assert.doesNotMatch(scanner, /findTemporaryAccessFromScanValue|ensureBusinessScanFixtures|evaluateTemporaryAccess/);
  assert.doesNotMatch(businessState, /const BUSINESS_FIXTURES/);
  assert.doesNotMatch(businessState, /jwt|encrypt|database|supabase/i);
});

test("shows only allowed Phase D scope and invents no health facts in Intake", async () => {
  const source = await readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8");
  assert.match(source, /ข้อมูลที่ร้านได้รับ/);
  assert.match(source, /เปิดให้ร้าน/);
  assert.match(source, /ไม่ได้เปิดให้ร้าน/);
  assert.match(source, /access\.scope\.includes\("photo"\)/);
  assert.match(source, /access\.scope\.includes\("passportReference"\)/);
  assert.match(source, /ยา ภูมิแพ้ วัคซีน ประวัติสุขภาพ และเอกสาร — สิทธิ์ครั้งนี้ไม่ครอบคลุมข้อมูลประเภทนี้/);
  assert.match(source, /สิทธิ์นี้ไม่มีคำแนะนำการดูแล/);
  assert.doesNotMatch(source, /Amoxicillin|Apoquel|โปรตีนไก่|rabies date|vaccine date|medication dose/i);
});

test("preserves Business Intake separately and Suggest Correction never mutates Pet", async () => {
  const [source, businessState, petState] = await Promise.all([
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("_prototype/consumerPets.ts", appRoot), "utf8"),
  ]);
  assert.match(source, /ของที่เจ้าของนำมาด้วย/);
  assert.match(source, /หมายเหตุการรับเข้า/);
  assert.match(source, /ข้อมูลส่วนนี้เป็นของร้าน และไม่แก้ Pet Passport/);
  assert.match(source, /เสนอแก้ไขข้อมูล/);
  assert.match(source, /ข้อมูลต้นฉบับของน้องยังไม่เปลี่ยน/);
  assert.match(businessState, /correctionSuggestion/);
  assert.match(businessState, /submitCorrectionSuggestion/);
  assert.doesNotMatch(businessState, /PROTOTYPE_DRAFT_STORAGE_KEY|writeClaimedPrototypePet/);
  assert.doesNotMatch(petState, /businessNote|correctionSuggestion|belongings/);
});

test("supports awaiting consent while keeping owner-decision and interruption controls out of Business UI", async () => {
  const [source, businessState] = await Promise.all([
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);
  assert.match(source, /รอเจ้าของอนุมัติ/);
  assert.match(source, /ข้อมูลของน้องยังถูกซ่อน/);
  assert.match(source, /รอการตอบกลับจากเจ้าของ/);
  assert.doesNotMatch(source, /ต้นแบบนี้ไม่แจ้งเตือนแบบทันที|จำลองว่าเจ้าของอนุมัติ|prototype-state-controls|approveOwnerDecisionPrototype|setPrototypeAccessInterruption/);
  assert.match(source, /สิทธิ์เข้าถึงหมดอายุแล้ว/);
  assert.match(source, /เจ้าของยกเลิกสิทธิ์แล้ว/);
  assert.match(source, /แบบร่างการรับเข้ายังอยู่/);
  assert.match(businessState, /approveOwnerDecisionPrototype/);
  assert.match(businessState, /setPrototypeAccessInterruption/);
});

test("revalidates and de-duplicates receiving without adding a Service Session UI", async () => {
  const [source, businessState, routes] = await Promise.all([
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readdir(appRoot, { recursive: true, withFileTypes: true }),
  ]);
  assert.match(source, /ตรวจทานก่อนรับเข้า/);
  assert.match(source, /ยืนยันรับเข้า/);
  assert.match(source, /aria-busy=\{submitting\}/);
  assert.match(source, /รับเข้าเรียบร้อย/);
  assert.match(source, /รับเข้าเรียบร้อย/);
  assert.match(source, /ใช้ติดตามรายการรับเข้าของร้าน/);
  assert.match(businessState, /record\.checkInState === "checked-in"/);
  assert.match(businessState, /evaluateTemporaryAccess\(access, record\.businessId, record\.branchId\)/);
  assert.match(businessState, /prototypeSessionReference/);
  const routeFiles = routes.filter((entry) => entry.isFile() && entry.name === "page.tsx").map((entry) => entry.parentPath.replaceAll("\\", "/"));
  assert.equal(routeFiles.some((path) => /business\/sessions/i.test(path)), false);
  assert.equal(routeFiles.some((path) => /business\/careproof/i.test(path)), false);
});

test("keeps Phase E responsive, accessible, and free of Marketing Footer", async () => {
  const [css, scanner, intake, footer] = await Promise.all([
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_components/RouteFooter.tsx", appRoot), "utf8"),
  ]);
  assert.match(css, /Phase E — Business Scan & Intake/);
  assert.match(css, /\.scanner-camera\s*\{[\s\S]*?min-height: clamp\(310px/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.allowed-data-layout/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.business-shell/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(scanner, /aria-describedby=\{manualError/);
  assert.match(intake, /role="dialog"/);
  assert.match(intake, /aria-modal="true"/);
  assert.match(intake, /event\.key === "Escape"/);
  assert.match(intake, /event\.key !== "Tab"/);
  assert.match(footer, /new Set\(\["\/"\]\)/);
  assert.doesNotMatch(scanner + intake, /<SiteFooter|Marketing Footer/);
});

test("renders BF-9 Team as a shared, branch-aware operations foundation", async () => {
  const [html, page, operations, state, desktopNav, mobileNav, command, model, bookingEditor, groomingFields, groomingDetail, hotelDetail, css] = await Promise.all([
    businessFixtureHtml("/business/team"),
    readFile(new URL("business/team/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/team/TeamOperations.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessCommandPalette.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/GroomingBookingFields.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/hotel/HotelStayDetail.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.equal(countRenderedElements(html, "h1"), 1);
  assert.match(html, /<h1[^>]*>ทีม<\/h1>/);
  assert.match(html, /ทีมและความสามารถของสาขา/);
  assert.match(html, /aria-label="ขอบเขตการจัดการทีม"/);
  assert.doesNotMatch(html, /Team &amp; Staff Operations|Local prototype/);
  assert.match(html, /ดูบทบาท ความสามารถ สาขา ความพร้อม และงานวันนี้/);
  assert.match(html, /รายชื่อทีม/);
  assert.match(html, /พร้อมรับงาน/);
  assert.match(page, /TeamOperations/);
  for (const capability of [
    "listPrototypeTeamMembers",
    "createPrototypeTeamMember",
    "updatePrototypeTeamMember",
    "setPrototypeTeamMemberActive",
    "evaluatePrototypeTeamMemberAvailability",
    "getPrototypeTeamMemberWorkload",
  ]) assert.match(operations, new RegExp(capability));
  assert.match(operations, /BusinessStaffAvatar/);
  assert.match(operations, /BusinessDataTable/);
  assert.match(operations, /team-mobile-cards/);
  assert.match(operations, /BusinessModal/);
  assert.match(operations, /const CAPABILITY_LABELS = TEAM_MEMBER_CAPABILITY_LABELS/);
  assert.match(operations, /ข้อมูลนี้ใช้ค้นหาพนักงานและช่วยมอบหมายงานของสาขา/);
  assert.match(state, /teamMembers: Record<string, PrototypeTeamMember>/);
  assert.match(state, /DEMO_TEAM_MEMBER_FIXTURES/);
  assert.match(state, /branchIds: \["whisker-ari", "whisker-thonglor"\]/);
  assert.match(state, /staffId: "team-pim"/);
  assert.match(state, /getBookingResourceStaffMember/);
  assert.match(state, /evaluateTeamResourceEligibility/);
  assert.match(state, /listPrototypeTeamWorkItems/);
  assert.match(state, /assignPrototypeHotelCareTaskStaff/);
  assert.doesNotMatch(state, /DEMO_(?:GROOMING|HOTEL)_STAFF/);
  assert.match(model, /BUSINESS_TEAM_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/team"/);
  assert.match(desktopNav, /BUSINESS_TEAM_DESTINATION/);
  assert.match(mobileNav, /BUSINESS_TEAM_DESTINATION/);
  assert.match(command, /label: "ทีม"[\s\S]*?href: "\/business\/team"/);
  assert.match(bookingEditor, /getBookingResourceStaffMember/);
  assert.match(bookingEditor, /staff\.active/);
  assert.match(groomingFields, /evaluatePrototypeTeamMemberAvailability/);
  assert.match(groomingFields, /disabled=\{!staffState\.enabled\}/);
  assert.match(groomingDetail, /evaluatePrototypeTeamMemberAvailability/);
  assert.match(hotelDetail, /getTeamMembersForCapability/);
  assert.match(hotelDetail, /assignPrototypeHotelCareTaskStaff/);
  assert.match(hotelDetail, /ผู้รับผิดชอบ/);
  assert.match(css, /\.team-directory__table/);
  assert.match(css, /\.team-mobile-cards/);
  assert.match(css, /@media \(max-width: 767px\) \{[\s\S]*?\.team-directory__table \{ display: none; \}[\s\S]*?\.team-mobile-cards \{ display: grid;/);
});

test("keeps BF-9 Team data branch-aware, availability-safe, and shared by Booking, Grooming, Hotel, and workload", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "meawketting-team-test-"));
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    },
    dispatchEvent: () => true,
  };
  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };
  }

  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: cacheDirectory,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const state = await vite.ssrLoadModule("/app/_prototype/businessState.ts");
    const ari = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-ari-frontdesk");
    const thonglor = state.DEMO_BUSINESS_CONTEXTS.find((item) => item.key === "whisker-thonglor-frontdesk");
    assert.ok(ari);
    assert.ok(thonglor);

    const ariTeam = state.listPrototypeTeamMemberFixtures(ari, { includeInactive: true });
    const thonglorTeam = state.listPrototypeTeamMemberFixtures(thonglor, { includeInactive: true });
    const namAtAri = ariTeam.find((member) => member.staffId === "team-nam");
    const namAtThonglor = thonglorTeam.find((member) => member.staffId === "team-nam");
    assert.ok(namAtAri);
    assert.ok(namAtThonglor);
    assert.equal(state.DEMO_TEAM_MEMBER_FIXTURES.filter((member) => member.staffId === "team-nam").length, 1);
    assert.deepEqual([...namAtAri.branchIds].sort(), ["whisker-ari", "whisker-thonglor"]);
    assert.equal(namAtAri.staffId, namAtThonglor.staffId);
    assert.equal(state.getBookingResourceStaffMember("ari-groomer-pim")?.staffId, "team-pim");
    assert.equal(state.getBookingResourceStaffMember("ari-station-a"), null);

    const activeGroomers = state.getTeamMembersForCapability(ari, "grooming");
    const allGroomers = state.getTeamMembersForCapability(ari, "grooming", { includeInactive: true });
    assert.deepEqual(activeGroomers.map((member) => member.staffId), ["team-pim"]);
    assert.deepEqual(allGroomers.map((member) => member.staffId).sort(), ["team-joy", "team-pim"]);
    const pim = state.readPrototypeTeamMember("team-pim");
    assert.ok(pim);
    const lunchBreak = state.evaluatePrototypeTeamMemberAvailability(
      pim,
      state.getBookingInterval("appointment", "2026-08-18T12:15", "2026-08-18T12:45"),
    );
    assert.equal(lunchBreak.available, false);
    assert.equal(lunchBreak.state, "break");

    const bookingDraft = {
      businessId: ari.businessId,
      branchId: ari.branchId,
      serviceModule: "grooming",
      serviceId: "ari-grooming-bath-groom",
      timeModel: "appointment",
      customer: { id: "booking-contact-nalin", name: "คุณนลิน" },
      pets: [{ id: "booking-pet-mochi", name: "Mochi", species: "cat" }],
      start: "2026-08-18T14:00",
      end: "2026-08-18T15:00",
      assignedResourceIds: ["ari-groomer-joy", "ari-station-b", "ari-dryer-2"],
      notes: "BF-9 inactive staff validation",
      estimate: 850,
      status: "pending",
    };
    const inactiveBooking = state.evaluateBookingAvailability(bookingDraft, ari, []);
    assert.equal(inactiveBooking.available, false);
    assert.equal(inactiveBooking.conflicts.some((conflict) => conflict.code === "staff-inactive"), true);
    const unavailableBooking = state.evaluateBookingAvailability({
      ...bookingDraft,
      start: "2026-08-18T12:15",
      end: "2026-08-18T13:15",
      assignedResourceIds: ["ari-groomer-pim", "ari-station-b", "ari-dryer-2"],
    }, ari, []);
    assert.equal(unavailableBooking.available, false);
    assert.equal(unavailableBooking.conflicts.some((conflict) => conflict.code === "staff-unavailable"), true);

    const groomingJob = state.listPrototypeGroomingServiceJobFixtures(ari, { date: state.BOOKING_DEMO_DATE })
      .find((job) => job.serviceJobId === "grooming-job-fixture-tofu");
    assert.ok(groomingJob);
    const inactiveGroomingAssignment = state.evaluatePrototypeGroomingServiceJobResources(
      groomingJob,
      ["ari-groomer-joy", "ari-station-b", "ari-dryer-2"],
      ari,
      [groomingJob],
    );
    assert.equal(inactiveGroomingAssignment.available, false);
    assert.equal(inactiveGroomingAssignment.conflicts.some((conflict) => conflict.code === "staff-inactive"), true);

    const noonHotelCareStaff = state.getTeamMembersForCapability(ari, "hotel-care", {
      interval: state.getBookingInterval("appointment", "2026-08-18T12:00", "2026-08-18T12:30"),
    });
    assert.deepEqual(noonHotelCareStaff.map((member) => member.staffId), ["team-nam"]);
    const unavailableCareAssignment = state.assignPrototypeHotelCareTaskStaff(
      "hotel-stay-fixture-luna",
      "hotel-care-luna-water",
      "team-aom",
      ari,
    );
    assert.equal(unavailableCareAssignment.ok, false);
    assert.equal(unavailableCareAssignment.reason, "unavailable");
    const careAssignment = state.assignPrototypeHotelCareTaskStaff(
      "hotel-stay-fixture-luna",
      "hotel-care-luna-water",
      "team-nam",
      ari,
    );
    assert.equal(careAssignment.ok, true);
    assert.equal(careAssignment.duplicate, false);
    const luna = state.readPrototypeHotelStay("hotel-stay-fixture-luna");
    assert.equal(luna?.dailyCareTasks.find((task) => task.id === "hotel-care-luna-water")?.assignedStaffId, "team-nam");
    assert.equal(luna?.history.at(-1)?.type, "care-assignment");

    const workItems = state.listPrototypeTeamWorkItems(ari, state.BOOKING_DEMO_DATE);
    const pimWorkload = state.getPrototypeTeamMemberWorkload("team-pim", ari, state.BOOKING_DEMO_DATE);
    assert.equal(workItems.some((item) => item.kind === "hotel-care" && item.staffId === "team-nam"), true);
    assert.equal(workItems.some((item) => item.kind === "grooming" && item.staffId === "team-joy" && item.conflict), true);
    assert.ok(pimWorkload.today > 0);
    assert.equal(pimWorkload.items.every((item) => item.kind === "grooming" || item.kind === "hotel-care"), true);

    const created = state.createPrototypeTeamMember({
      staffId: "bf9-test-multi-branch",
      branchIds: [ari.branchId, thonglor.branchId],
      name: "ทีมทดสอบ",
      avatarSeed: "bf9-test",
      role: "staff",
      capabilities: ["hotel-care"],
      active: true,
      availability: [{ id: "bf9-test-working", state: "working", start: "2026-08-18T08:00", end: "2026-08-18T18:00", note: null }],
    }, ari);
    assert.equal(created.ok, true);
    const deactivated = state.setPrototypeTeamMemberActive("bf9-test-multi-branch", false, ari);
    assert.equal(deactivated.ok, true);
    assert.equal(deactivated.member.active, false);
    assert.equal(state.listPrototypeTeamMembers(thonglor, { includeInactive: true }).filter((member) => member.staffId === "bf9-test-multi-branch").length, 1);
  } finally {
    await vite.close();
    await rm(cacheDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  }
});

test("keeps the derived manual aligned with the canonical hybrid Business architecture", async () => {
  const [html, validation, architecture, decisions] = await Promise.all([
    readFile(manualUrl, "utf8"),
    readFile(validationUrl, "utf8"),
    readFile(architectureUrl, "utf8"),
    readFile(decisionsUrl, "utf8"),
  ]);
  const modelPanel = html.match(/<section class="panel" id="model"[\s\S]*?<\/section>/)?.[0] ?? "";
  const corePanel = html.match(/<section class="panel" id="core"[\s\S]*?<\/section>/)?.[0] ?? "";
  const modulePanel = html.match(/<section class="panel" id="modules"[\s\S]*?<\/section>/)?.[0] ?? "";
  const scenarioPanel = html.match(/<section class="panel" id="scenarios"[\s\S]*?<\/section>/)?.[0] ?? "";
  const designPanel = html.match(/<section class="panel" id="design"[\s\S]*?<\/section>/)?.[0] ?? "";
  const roadmapPanel = html.match(/<section class="panel" id="roadmap"[\s\S]*?<\/section>/)?.[0] ?? "";
  const overviewPanel = html.match(/<section class="panel is-active" id="overview"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(html, /\.panel:not\(\.is-active\)\{display:none!important\}/);
  assert.match(html, /src="\.\.\/\.\.\/public\/logo\.svg"/);
  for (const panelId of ["overview", "model", "core", "modules", "scenarios", "design", "roadmap"]) {
    assert.match(html, new RegExp(`data-target="${panelId}"`));
    assert.match(html, new RegExp(`id="${panelId}"`));
  }

  assert.match(html, /Person → BusinessMembership → Business → authorized Branch → Enabled Service Modules/);
  assert.match(overviewPanel, /BF1–BF12 Business Frontend Prototype/);
  assert.match(overviewPanel, /\/business\/settings/);
  assert.match(overviewPanel, /\/business\/daycare/);
  assert.match(overviewPanel, /CRM \/ Retention/);
  assert.match(overviewPanel, /\/business\/customers/);
  assert.match(overviewPanel, /\/business\/grooming/);
  assert.match(overviewPanel, /\/business\/hotel/);
  assert.match(overviewPanel, /\/business\/billing/);
  assert.match(overviewPanel, /\/business\/team/);
  assert.match(overviewPanel, /ประวัติบริการ/);
  assert.doesNotMatch(overviewPanel, /\/business\/careproof/);
  assert.match(overviewPanel, /Cloudflare/);
  assert.match(modelPanel, /Customer/);
  assert.match(modelPanel, /Visit \/ Order/);
  assert.match(modelPanel, /Service Job/);
  assert.match(modelPanel, /Conversation/);
  assert.match(modelPanel, /Charge/);
  assert.match(modelPanel, /Payment/);
  assert.match(modelPanel, /Consent \/ Access Grant/);
  assert.equal((corePanel.match(/class="capability"/g) ?? []).length, 17);
  assert.match(corePanel, /Home \/ Today/);
  assert.match(corePanel, /\/business\/home/);
  assert.match(corePanel, /Branch-aware/);
  assert.match(corePanel, /Inbox/);
  assert.match(corePanel, /Hotel \/ Boarding/);
  assert.match(corePanel, /Billing/);
  assert.match(corePanel, /Charge/);
  assert.match(corePanel, /Payment/);
  assert.match(corePanel, /Service Record history/);
  assert.match(corePanel, /Team &amp; Staff Operations/);
  assert.match(corePanel, /LOCAL PROTOTYPE/);
  assert.match(html, new RegExp("BE1 Identity / Scope"));
  assert.match(html, /Production Auth.*not implemented/i);
  assert.match(corePanel, /Payroll.*HR.*NOT IMPLEMENTED/);
  assert.doesNotMatch(corePanel, /\/business\/careproof/);
  assert.match(modulePanel, /Grooming \/ Bathing/);
  assert.match(modulePanel, /BF-5 LOCAL/);
  assert.match(modulePanel, /Hotel \/ Boarding/);
  assert.match(modulePanel, /BF-6 LOCAL/);
  assert.match(modulePanel, /explicit checkout/);
  assert.match(modulePanel, /Daycare/);
  assert.match(modulePanel, /date-range Hotel Booking/);
  assert.equal((scenarioPanel.match(/class="scenario"/g) ?? []).length, 6);
  assert.match(scenarioPanel, /Hotel Booking \+ Grooming/);
  assert.match(scenarioPanel, /Guardian approval เพิ่มเฉพาะ add-on และเวลา/);
  assert.match(scenarioPanel, /Branch scope and future transfer/);
  assert.match(scenarioPanel, /Cross-Branch Hotel transfer ยังไม่ implement/);
  assert.match(scenarioPanel, /ประวัติบริการจากงานที่เสร็จแล้ว/);

  assert.match(html, /Noto Sans Thai/);
  assert.match(html, /LINE Seed Sans TH/);
  for (const sharedComponent of [
    "BusinessSegmentedControl",
    "BusinessBreadcrumbs",
    "BusinessSidebarSectionHeader",
    "BusinessDataTable",
    "BusinessAlert",
    "BusinessModal",
    "BusinessProgress",
    "BusinessSkeleton",
  ]) {
    assert.match(html, new RegExp(sharedComponent));
  }
  assert.match(html, /mounted transform-only track/);
  assert.match(html, /400×400px/);
  assert.match(html, /Shared component registry · 3\.3 และ 7–10/);
  assert.match(html, /business-signature-sweep[\s\S]*?Primary Yellow[\s\S]*?Foreground Black/);
  assert.doesNotMatch(html, /three auto 16:9 variants/);
  assert.doesNotMatch(html, /73\s*\/\s*73/);
  assert.match(designPanel, /WARM OPERATIONAL CLARITY/);
  assert.match(designPanel, /Pastel Yellow/);
  assert.match(designPanel, /#F4C95D/i);
  assert.match(designPanel, /Light \/ Warm White/);
  assert.match(designPanel, /CONSUMER VISUAL REDESIGN: PAUSED/);
  assert.match(designPanel, /ภาพถ่ายจริง/);
  assert.match(designPanel, /ไม่โหลด <code>public\/images\/cats<\/code>/);
  assert.doesNotMatch(designPanel, /Deep Teal/);
  assert.match(designPanel, /16px/);
  assert.match(designPanel, /fast 180ms, base 220ms, slow 300ms/);
  assert.match(designPanel, /Grooming = Scissors \+ Coral/);
  assert.match(designPanel, /Billing \/ Payment/);
  assert.match(designPanel, /Custom ใช้ 28\/35\/42 วัน/);
  assert.match(roadmapPanel, /Shared Business Intake Engine/);
  assert.match(roadmapPanel, /BF-1/);
  assert.match(roadmapPanel, /BF-3/);
  assert.match(roadmapPanel, /BF-4/);
  assert.match(roadmapPanel, /Cloudflare/);
  assert.match(roadmapPanel, /BF-5 Grooming implemented locally/);
  assert.match(roadmapPanel, /BF-6 Hotel \/ Boarding implemented locally/);
  assert.match(roadmapPanel, /BF-7 Billing, Payments/);
  assert.match(roadmapPanel, /BF-8 Shared Service Record/);
  assert.match(roadmapPanel, /BF-9 Team &amp; Staff Operations/);
  assert.match(roadmapPanel, /Stop after BE3/);
  assert.match(roadmapPanel, /BE2 Customer \/ Pet implemented locally/);
  assert.match(roadmapPanel, /BE3 Booking \/ Calendar implemented locally/);
  assert.match(roadmapPanel, /BF-10/);
  assert.match(roadmapPanel, /BF-11/);
  assert.match(roadmapPanel, /BF-12/);
  assert.match(roadmapPanel, /Daycare operations/);

  assert.match(validation, /# Validation/);
  assert.match(validation, new RegExp("BE1 identity / Business / Branch validation"));
  assert.match(validation, /34 `page\.tsx` route entries/);
  assert.match(html, /Production Ready:.*NO/);
  assert.doesNotMatch(html, /Daycare operations ยังไม่เริ่ม|Daycare has no operations route|Stop after BF-9|32 route entries/);
  assert.match(validation, /Cloudflare Worker\/Vinext \+ Supabase PostgreSQL is the BE1–BE8 local architecture/);
  assert.match(architecture, /TARGET PLATFORM:\s*Cloudflare/);
  assert.match(architecture, /PRODUCTION:\s*NOT DEPLOYED \/ NOT VERIFIED/);
  assert.match(decisions, /Cloudflare replaces Vercel as the target production platform direction/);
  assert.match(decisions, /D-132/);
  assert.match(decisions, /SUPERSEDED/);
  assert.match(validation, /Broken relative Markdown links/);
  assert.match(validation, /Stale legacy references/);
  assert.match(validation, /Shared Business Intake Engine/);
  assert.doesNotMatch(html, /143 legacy|Page ID|OPS-\d{3}|docs\/ux-ui/i);
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html), false);
});

test("renders BF10 Settings, BF11 Daycare, and BF12 CRM with shared state and honest scope boundaries", async () => {
  const [settingsHtml, daycareHtml, customersHtml, detailHtml, settings, daycare, daycareDetail, billing, customerDetail, crm, css] = await Promise.all([
    businessFixtureHtml("/business/settings"),
    businessFixtureHtml("/business/daycare"),
    businessFixtureHtml("/business/customers"),
    businessFixtureHtml("/business/customers/booking-contact-nalin"),
    readFile(new URL("business/settings/SettingsScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/daycare/DaycareScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/daycare/DaycareAttendanceDetail.tsx", appRoot), "utf8"),
    readFile(new URL("business/billing/BillingScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CrmPanel.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);
  assert.equal(countRenderedElements(settingsHtml, "h1"), 1);
  assert.match(settingsHtml, /<h1[^>]*>ตั้งค่า<\/h1>/);
  assert.match(settingsHtml, /ข้อมูลร้าน/);
  assert.match(settingsHtml, /aria-label="ส่วนการตั้งค่า"/);
  assert.match(settings, /updateDurableBusiness/);
  assert.match(settings, /saveDurableBranch/);
  assert.match(settings, /setDurableBranchActive/);
  assert.match(settings, /เวลาทำการรายวัน/);
  assert.match(settings, /BUSINESS_SERVICE_MODULES/);
  assert.match(settings, /profileToDraft\(context.businessId, !stateReady\)/);
  assert.match(settings, /getPrototypeBusinessProfile\(businessId, fixtureOnly\)/);
  assert.match(settings, /const team = stateReady \? listPrototypeTeamMembers\(\) : listPrototypeTeamMemberFixtures\(\)/);
  assert.match(settings, /team=\{team\.filter\(\(member\) => member\.businessId === branch\.businessId && member\.branchIds\.includes\(branch\.branchId\)\)\}/);
  assert.match(settings, /<dt>ทีมประจำสาขา<\/dt>/);
  assert.match(settings, /team\.map\(\(member\) => member\.name\)\.join/);
  assert.match(settings, /TEAM_MEMBER_CAPABILITY_LABELS\[capability\]/);
  assert.match(settings, /const branchContext = getDemoBusinessContextForBranch\(branch\.businessId, branch\.branchId, fixtureOnly\)/);
  assert.match(settings, /getBookingServices\(branchContext, fixtureOnly\)/);
  assert.match(settings, /getHotelRooms\(branchContext, fixtureOnly\)/);
  assert.match(settings, /getPrototypeDaycareZones\(branchContext, fixtureOnly\)/);
  assert.match(settings, /<details className="settings-branch-services">[\s\S]*?<summary>บริการและทรัพยากร<\/summary>/);
  assert.match(settings, /ใช้เวลาและทรัพยากรชุดเดียวกับปฏิทินและงานบริการ/);
  assert.match(settings, /onOpenTeam=\{\(\) => selectContext\(getDemoBusinessContextForBranch\(branch\.businessId, branch\.branchId\)\.key\)\}/);
  assert.match(settings, /branch\.active \? <a[^>]+href="\/business\/team" onClick=\{onOpenTeam\} aria-label=\{`ดูทีม \$\{branch\.name\}`\}/);
  assert.doesNotMatch(settings, /createPrototypeTeamMember|updatePrototypeTeamMember|settingsTeam|branchTeamMembers/);
  assert.equal(countRenderedElements(daycareHtml, "h1"), 1);
  assert.match(daycareHtml, /<h1[^>]*>Daycare<\/h1>/);
  assert.match(daycareHtml, /สาขานี้ยังไม่เปิด Daycare/);
  assert.match(daycareHtml, /href="\/business\/settings\?section=branches"/);
  assert.match(daycare, /listPrototypeDaycareAttendances/);
  assert.match(daycare, /getPrototypeDaycareZoneAvailability/);
  assert.match(daycare, /daycare-mobile-list/);
  assert.match(daycare, /role="tabpanel"/);
  assert.match(daycareDetail, /transitionPrototypeDaycareAttendance/);
  assert.match(daycareDetail, /addPrototypeDaycareCareEvent/);
  assert.match(billing, /launchRequest\.daycareAttendanceId/);
  assert.match(daycareDetail, /\/business\/billing\?daycareAttendanceId=/);
  assert.match(daycareDetail, /daycareAttendanceId=/);
  assert.match(customersHtml, /ภาพรวมความสัมพันธ์ลูกค้า/);
  assert.match(customersHtml, /ไม่มีนัดถัดไป/);
  assert.match(detailHtml, /สรุปลูกค้า/);
  assert.match(detailHtml, /ไทม์ไลน์ลูกค้า/);
  assert.match(detailHtml, /แนะนำให้ทำต่อ/);
  assert.match(detailHtml, /กิจกรรมย้อนหลัง/);
  assert.doesNotMatch(detailHtml, /crm-loyalty/);
  assert.match(customerDetail, /deriveCustomerCrmProfile/);
  assert.match(customerDetail, /deriveCustomerTimeline/);
  assert.match(crm, /aria-pressed=\{timelineFilter === filter.value\}/);
  assert.match(crm, /role="toolbar" aria-label="กรองไทม์ไลน์ลูกค้า"/);
  assert.doesNotMatch(settings + daycare + crm, /sessionStorage\.setItem|localStorage\.setItem/);
  assert.match(css, /\.business-settings/);
  assert.match(css, /\.daycare-board/);
  assert.match(css, /\.customer-crm-panel/);
});

test("BF10 configuration shares Business and Branch settings without replacing historical records", async () => {
  await withBusinessStateTest(async ({ state, storage, vite }) => {
    const cache = await installBe1ConfigurationFixture(state, vite);
    const ari = state.getDemoBusinessContext("whisker-ari-frontdesk");
    const thonglor = state.getDemoBusinessContext("whisker-thonglor-frontdesk");
    const onnut = state.getDemoBusinessContext("paw-partner-onnut");
    const baseline = state.getPrototypeBusinessProfile(ari.businessId);
    const bookingsBefore = state.listPrototypeBookings(ari, { includeCancelled: true });
    const customersBefore = state.listPrototypeCustomers(ari);
    const settingsTeam = state.listPrototypeTeamMemberFixtures();
    for (const branchContext of [ari, thonglor, onnut]) {
      const branchTeam = settingsTeam.filter((member) => member.businessId === branchContext.businessId && member.branchIds.includes(branchContext.branchId));
      assert.deepEqual(branchTeam, state.listPrototypeTeamMemberFixtures(branchContext), "Settings summary and Team directory use the same active staff source");
      assert.equal(branchTeam.every((member) => member.active), true);
      assert.equal(branchTeam.flatMap((member) => member.capabilities).every((capability) => Boolean(state.TEAM_MEMBER_CAPABILITY_LABELS[capability])), true);
      const targetContext = state.getDemoBusinessContextForBranch(branchContext.businessId, branchContext.branchId);
      state.writeActiveBusinessContext(targetContext.key);
      assert.equal(state.readActiveBusinessContext().businessId, branchContext.businessId);
      assert.equal(state.readActiveBusinessContext().branchId, branchContext.branchId, "opening Team from a Branch card preserves that Branch context");
    }
    state.writeActiveBusinessContext(ari.key);
    const durableBusiness = cache.readCachedBusiness(ari.businessId);
    cache.patchCachedBusiness({ ...durableBusiness, name: "Whisker Test", phone: "02-000-0010", updatedAt: "2026-09-05T01:00:00.000Z" });
    assert.equal(state.getDemoBusinessContextDetails(thonglor).business.name, "Whisker Test");
    assert.equal(state.getPrototypeBusinessProfile(ari.businessId, true).name, baseline.name, "SSR fixtures remain stable after local edits");

    const durableAri = cache.readCachedBranches(ari.businessId).find((item) => item.id === ari.branchId);
    cache.patchCachedBranch({
      ...durableAri,
      name: "อารีย์ใหม่",
      enabledModules: ["grooming", "daycare"],
      operatingHours: state.createDefaultOperatingHours().map((day) => ({ ...day, closed: day.day === "tuesday" })),
      updatedAt: "2026-09-05T01:01:00.000Z",
    });
    assert.deepEqual(state.getEnabledBusinessModules(ari), ["grooming", "daycare"]);
    assert.deepEqual(state.getEnabledBusinessModules(ari, true), ["grooming", "hotel"]);
    assert.equal(state.getDemoBusinessContextDetails(ari).branch.name, "อารีย์ใหม่");
    assert.equal(state.getBookingServices(ari).some((service) => service.module === "daycare"), true);
    assert.equal(state.getBookingServices(ari).some((service) => service.module === "hotel"), false);
    assert.equal(state.getPrototypeDaycareZones(ari).length > 0, true);
    assert.deepEqual(state.listPrototypeBookings(ari, { includeCancelled: true }), bookingsBefore);
    assert.deepEqual(state.listPrototypeCustomers(ari), customersBefore);
    const daycareService = state.getBookingServices(ari).find((service) => service.module === "daycare");
    const draft = {
      businessId: ari.businessId, branchId: ari.branchId, serviceModule: "daycare", serviceId: daycareService.id,
      timeModel: "day", customer: { id: "booking-contact-pim", name: "คุณพิม" },
      pets: [{ id: "booking-pet-luna", name: "Luna", species: "cat" }],
      start: "2026-08-25", end: "", assignedResourceIds: [state.getPrototypeDaycareZones(ari)[0].id],
      notes: "", estimate: 450, status: "confirmed",
    };
    const closed = state.evaluateBookingAvailability(draft, ari, []);
    assert.equal(closed.available, false);
    assert.equal(closed.conflicts.some((conflict) => conflict.code === "branch-closed"), true);

    const createdId = "brn_01k47meawketting000000101";
    cache.patchCachedBranch({
      ...durableAri,
      id: createdId,
      name: "สาขาทดสอบ",
      status: "active",
      enabledModules: ["hotel", "daycare"],
      operatingHours: state.createDefaultOperatingHours(),
      createdAt: "2026-09-05T01:02:00.000Z",
      updatedAt: "2026-09-05T01:02:00.000Z",
    });
    const newContext = state.listPrototypeBusinessContexts(ari.businessId).find((context) => context.branchId === createdId);
    assert.ok(newContext);
    assert.equal(state.listPrototypeBusinessContexts(ari.businessId, true).some((context) => context.branchId === newContext.branchId), false);
    assert.deepEqual(state.getEnabledBusinessModules(newContext), ["hotel", "daycare"]);
    assert.equal(state.getBookingServices(newContext).length, 2);
    assert.equal(state.listPrototypeBusinessBranches(onnut.businessId).some((item) => item.branchId === newContext.branchId), false);
    state.writeActiveBusinessContext(newContext.key);
    cache.patchCachedBranch({ ...cache.readCachedBranches(ari.businessId).find((item) => item.id === createdId), status: "inactive", updatedAt: "2026-09-05T01:03:00.000Z" });
    assert.notEqual(state.readActiveBusinessContext().branchId, newContext.branchId);
    assert.equal(state.listPrototypeBusinessContexts().some((context) => context.branchId === newContext.branchId), false);
    assert.equal(state.getPrototypeBusinessBranch(ari.businessId, newContext.branchId).active, false);
    const storedEnvelope = JSON.parse(storage.get(state.BUSINESS_STORAGE_KEY));
    assert.equal(Object.hasOwn(storedEnvelope, "businessProfiles"), false);
    assert.equal(Object.hasOwn(storedEnvelope, "branches"), false);
  });
});

test("BF10 Reports retains inactive Branch history while capacity stays active-Branch-only", async () => {
  await withBusinessStateTest(async ({ state, storage, vite }) => {
    const cache = await installBe1ConfigurationFixture(state, vite);
    const ari = state.getDemoBusinessContext("whisker-ari-frontdesk");
    const thonglor = state.getDemoBusinessContext("whisker-thonglor-frontdesk");
    const onnut = state.getDemoBusinessContext("paw-partner-onnut");
    const options = { dateRangePreset: "today", branchScope: "all" };
    const fixtureReports = state.getBusinessReportsSummary(ari, { ...options, fixtureOnly: true });
    const ariBranch = cache.readCachedBranches(ari.businessId).find((branch) => branch.id === ari.branchId);
    cache.patchCachedBranch({ ...ariBranch, name: "อารีย์เก็บประวัติ", updatedAt: "2026-09-05T02:00:00.000Z" });
    const before = state.getBusinessReportsSummary(thonglor, options);
    const ariBefore = before.branchComparison.find((branch) => branch.branchId === ari.branchId);
    const recentAriBefore = before.customerInsights.recentServices.filter((service) => service.branchId === ari.branchId);
    assert.ok(ariBefore.bookingCount > 0);
    assert.ok(ariBefore.revenue > 0);
    assert.equal(recentAriBefore.some((service) => service.module === "grooming"), true);
    assert.equal(recentAriBefore.some((service) => service.module === "hotel"), true);
    cache.patchCachedBranch({ ...cache.readCachedBranches(ari.businessId).find((branch) => branch.id === ari.branchId), status: "inactive", updatedAt: "2026-09-05T02:01:00.000Z" });
    assert.equal(state.listPrototypeBusinessContexts(ari.businessId).some((branch) => branch.branchId === ari.branchId), false);
    const storageBeforeRead = [...storage.entries()];
    const after = state.getBusinessReportsSummary(thonglor, options);
    assert.deepEqual(after.keyMetrics, before.keyMetrics, "deactivating a Branch cannot erase its report totals");
    assert.deepEqual(after.branchComparison.find((branch) => branch.branchId === ari.branchId), ariBefore, "inactive Branch history remains in comparison");
    assert.deepEqual(after.customerInsights.recentServices.filter((service) => service.branchId === ari.branchId), recentAriBefore, "Grooming and Hotel history keep the stored Branch name");
    assert.equal(after.branchComparison.reduce((sum, branch) => sum + branch.revenue, 0), after.keyMetrics.revenue);
    assert.equal(after.branchComparison.reduce((sum, branch) => sum + branch.bookingCount, 0), after.keyMetrics.totalBookings);
    const activeHotelCapacity = state.listPrototypeBusinessContexts(ari.businessId).flatMap((branch) => state.getHotelRooms(branch)).reduce((sum, room) => sum + room.capacity, 0);
    assert.equal(after.serviceBreakdown.hotel.capacity, activeHotelCapacity);
    assert.ok(after.serviceBreakdown.hotel.capacity < before.serviceBreakdown.hotel.capacity);
    assert.equal(state.getBusinessReportsSummary(ari).serviceBreakdown.hotel.capacity, 0, "a historical inactive context contributes no currently available capacity");
    assert.deepEqual(state.getBusinessReportsSummary(ari, { ...options, fixtureOnly: true }), fixtureReports, "fixture reports ignore local Branch rename and deactivation");
    assert.deepEqual([...storage.entries()], storageBeforeRead, "report reads do not persist replacement Branch or history data");

    const onnutBranch = cache.readCachedBranches(onnut.businessId).find((branch) => branch.id === onnut.branchId);
    const spareId = "brn_01k47meawketting000000102";
    cache.patchCachedBranch({
      ...onnutBranch,
      id: spareId,
      name: "สาขารับงานใหม่",
      status: "active",
      enabledModules: [],
      createdAt: "2026-09-05T02:02:00.000Z",
      updatedAt: "2026-09-05T02:02:00.000Z",
    });
    const spareContext = state.getDemoBusinessContextForBranch(onnut.businessId, spareId);
    const onnutBefore = state.getBusinessReportsSummary(spareContext, options);
    const recentDaycareBefore = onnutBefore.customerInsights.recentServices.filter((service) => service.module === "daycare");
    assert.ok(recentDaycareBefore.length > 0);
    cache.patchCachedBranch({ ...onnutBranch, status: "inactive", updatedAt: "2026-09-05T02:03:00.000Z" });
    const onnutAfter = state.getBusinessReportsSummary(spareContext, options);
    assert.deepEqual(onnutAfter.keyMetrics, onnutBefore.keyMetrics);
    assert.deepEqual(onnutAfter.customerInsights.recentServices.filter((service) => service.module === "daycare"), recentDaycareBefore, "Daycare history keeps inactive Branch naming");
    assert.deepEqual(onnutAfter.branchComparison.find((branch) => branch.branchId === onnut.branchId), onnutBefore.branchComparison.find((branch) => branch.branchId === onnut.branchId));
    assert.equal(onnutAfter.branchComparison.some((branch) => branch.branchId === ari.branchId), false, "history stays Business-scoped");
    assert.equal(onnutAfter.serviceBreakdown.daycare.enabled, false);
    assert.equal(onnutAfter.serviceBreakdown.daycare.capacity, 0);
    assert.equal(state.getBusinessReportsSummary(onnut).serviceBreakdown.daycare.capacity, 0);
  });
});

test("BF11 Daycare enforces capacity and staff, preserves lifecycle history, and shares billing and Service Records", async () => {
  await withBusinessStateTest(async ({ state }) => {
    const onnut = state.getDemoBusinessContext("paw-partner-onnut");
    const ari = state.getDemoBusinessContext("whisker-ari-frontdesk");
    const puddingId = "daycare-attendance-fixture-pudding";
    const mapleId = "daycare-attendance-fixture-maple";
    const social = state.getPrototypeDaycareZoneAvailability(onnut, "onnut-daycare-social");
    assert.equal(social.capacity, 2);
    assert.equal(social.used, 2);
    assert.equal(social.available, false);
    assert.equal(state.listPrototypeDaycareAttendances(ari).length, 0);
    assert.equal(state.transitionPrototypeDaycareAttendance(puddingId, "ready-for-pickup", ari).reason, "wrong-context");
    assert.equal(state.transitionPrototypeDaycareAttendance(puddingId, "completed", onnut).reason, "invalid-transition");
    assert.equal(state.assignPrototypeDaycareStaff(puddingId, "team-fern", onnut).reason, "invalid-staff");
    const unavailable = state.createPrototypeTeamMember({
      staffId: "bf11-unavailable", branchIds: [onnut.branchId], name: "ผู้ดูแลไม่ว่าง", avatarSeed: "bf11", role: "staff",
      capabilities: ["daycare"], active: true,
      availability: [{ id: "bf11-off", state: "unavailable", start: "2026-08-18T08:00", end: "2026-08-18T20:00", note: null }],
    }, onnut);
    assert.equal(unavailable.ok, true);
    assert.equal(state.assignPrototypeDaycareStaff(puddingId, "bf11-unavailable", onnut).reason, "unavailable");
    assert.equal(state.assignPrototypeDaycareStaff(puddingId, "team-mint", onnut).duplicate, true);

    const service = state.getBookingServices(onnut).find((item) => item.module === "daycare");
    const lee = state.readPrototypeCustomer("booking-contact-onnut-lee");
    const booking = installExecutionBookingFixture(state, onnut, {
      businessId: onnut.businessId, branchId: onnut.branchId, serviceModule: "daycare", serviceId: service.id,
      timeModel: "day", customer: { id: lee.id, name: lee.name },
      pets: lee.pets.map(({ id, name, species }) => ({ id, name, species })), start: state.BOOKING_DEMO_DATE, end: "",
      assignedResourceIds: ["onnut-daycare-quiet"], notes: "ทดสอบรับฝากรายวัน", estimate: 450, status: "confirmed",
    }, "be3-regression-daycare-leo");
    const leo = state.listPrototypeDaycareAttendances(onnut).find((item) => item.bookingId === booking.bookingId);
    assert.ok(leo);
    assert.equal(leo.customerId, booking.customer.id);
    assert.equal(leo.petId, booking.pets[0].id);
    assert.equal(leo.status, "booked");
    assert.equal(state.assignPrototypeDaycareZone(leo.daycareAttendanceId, "onnut-daycare-social", onnut).reason, "capacity");
    assert.equal(state.addPrototypeDaycareCareEvent(leo.daycareAttendanceId, "water", "ก่อนรับเข้า", onnut), null);
    assert.equal(state.transitionPrototypeDaycareAttendance(leo.daycareAttendanceId, "checked-in", onnut).ok, true);
    assert.equal(state.transitionPrototypeDaycareAttendance(leo.daycareAttendanceId, "active", onnut).ok, true);
    assert.equal(state.getPrototypeDaycareZoneAvailability(onnut, "onnut-daycare-quiet").used, 1);

    const care = state.addPrototypeDaycareCareEvent(puddingId, "water", "เติมน้ำสะอาด", onnut);
    assert.ok(care.careEvents.some((event) => event.kind === "water" && event.note === "เติมน้ำสะอาด"));
    state.updatePrototypeDaycareNote(puddingId, "บันทึกภายในร้าน BF11", onnut);
    const ready = state.transitionPrototypeDaycareAttendance(puddingId, "ready-for-pickup", onnut);
    assert.equal(ready.ok, true);
    assert.equal(state.transitionPrototypeDaycareAttendance(puddingId, "ready-for-pickup", onnut).duplicate, true);
    const charge = state.getOrCreatePrototypeChargeForDaycareAttendance(puddingId, onnut);
    const sharedCharge = state.getOrCreatePrototypeChargeForDaycareAttendance(mapleId, onnut);
    assert.equal(charge.ok, true);
    assert.equal(sharedCharge.ok, true);
    assert.equal(sharedCharge.charge.chargeId, charge.charge.chargeId, "a multi-Pet booking is charged once");
    assert.equal(sharedCharge.created, false);
    assert.equal(charge.charge.petId, null);
    const balance = state.getPrototypeChargeBalance(charge.charge, state.listPrototypePayments(null));
    const paid = state.recordPrototypePayment({ chargeId: charge.charge.chargeId, context: onnut, amount: balance.remaining, method: "cash", requestKey: "bf11-daycare-payment" });
    assert.equal(paid.ok, true);
    assert.equal(state.recordPrototypePayment({ chargeId: charge.charge.chargeId, context: onnut, amount: balance.remaining, method: "cash", requestKey: "bf11-daycare-payment" }).duplicate, true);
    assert.equal(state.getPrototypeChargeBalance(charge.charge, state.listPrototypePayments(null)).remaining, 0);
    assert.equal(state.readPrototypeDaycareAttendance(puddingId).status, "ready-for-pickup", "Payment does not finish service execution");

    const checkedOut = state.transitionPrototypeDaycareAttendance(puddingId, "checked-out", onnut);
    assert.equal(checkedOut.ok, true);
    assert.equal(state.getPrototypeDaycareZoneAvailability(onnut, "onnut-daycare-social").used, 1);
    assert.equal(state.transitionPrototypeDaycareAttendance(puddingId, "completed", onnut).ok, true);
    const record = state.listPrototypeServiceRecords(onnut).find((item) => item.daycareAttendanceId === puddingId);
    assert.ok(record);
    assert.equal(record.source, "daycare-attendance");
    assert.equal(record.bookingId, checkedOut.attendance.bookingId);
    assert.equal(record.customerId, checkedOut.attendance.customerId);
    assert.equal(record.petId, checkedOut.attendance.petId);
    assert.equal(record.businessNote, "บันทึกภายในร้าน BF11");
    assert.equal(state.listPrototypeServiceRecords(onnut).filter((item) => item.daycareAttendanceId === puddingId).length, 1);
    assert.equal(state.listPrototypeServiceRecords(ari).some((item) => item.serviceRecordId === record.serviceRecordId), false);
    assert.equal(state.addPrototypeDaycareCareEvent(puddingId, "water", "หลังปิดงาน", onnut), null);
    assert.equal(state.transitionPrototypeDaycareAttendance(puddingId, "active", onnut).reason, "invalid-transition");
    assert.equal(state.synchronizePrototypeExecutionCompatibilityForBooking({
      ...booking,
      status: "cancelled",
      revision: 2,
      updatedAt: "2026-09-07T06:01:00.000Z",
      cancelledAt: "2026-09-07T06:01:00.000Z",
    }), true);
    assert.equal(state.readPrototypeDaycareAttendance(leo.daycareAttendanceId).status, "cancelled");
    assert.equal(state.getPrototypeDaycareZoneAvailability(onnut, "onnut-daycare-quiet").used, 0);
  });
});

test("BF11 explicit Daycare Intake reuses consent and Customer/Pet identity without duplicate execution records", async () => {
  await withBusinessStateTest(async ({ state, vite, storage }) => {
    const sharing = await vite.ssrLoadModule("/app/_prototype/sharingState.ts");
    const cache = await installBe1ConfigurationFixture(state, vite);
    const ari = state.getDemoBusinessContext("whisker-ari-frontdesk");
    const thonglor = state.getDemoBusinessContext("whisker-thonglor-frontdesk");
    const branch = cache.readCachedBranches(ari.businessId).find((item) => item.id === ari.branchId);
    cache.patchCachedBranch({ ...branch, enabledModules: [...branch.enabledModules, "daycare"], updatedAt: "2026-09-05T03:00:00.000Z" });
    const service = state.getBookingServices(ari).find((item) => item.module === "daycare");
    const zone = state.getPrototypeDaycareZones(ari)[0];
    const bookingDraft = {
      businessId: ari.businessId, branchId: ari.branchId, serviceModule: "daycare", serviceId: service.id,
      timeModel: "day", customer: { id: "booking-contact-pim", name: "คุณพิม" },
      pets: [{ id: "booking-pet-luna", name: "Luna", species: "cat" }], start: "2026-08-25", end: "",
      assignedResourceIds: [zone.id], notes: "", estimate: 450, status: "confirmed",
    };
    const booking = installExecutionBookingFixture(state, ari, bookingDraft, "be3-regression-daycare-intake-one");
    const attendance = state.listPrototypeDaycareAttendances(ari, { date: "2026-08-25" }).find((item) => item.bookingId === booking.bookingId);
    assert.ok(attendance);
    const accessRecord = {
      id: "prototype-access-bf11-intake", fallbackCode: "BF11INTAKE", petSlug: "demo-luna",
      businessId: ari.businessId, branchId: ari.branchId, purpose: "Daycare", scope: ["basicIdentity"],
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      status: "active", consentStatus: "owner-consented", requester: null, decisionAt: null, revokedAt: null, events: [],
    };
    sharing.updateTemporaryAccess(accessRecord);
    const intake = state.createOrResumeBusinessIntake(accessRecord, ari, { daycareAttendanceId: attendance.daycareAttendanceId });
    assert.ok(intake);
    assert.equal(intake.customerId, attendance.customerId);
    assert.equal(intake.petRelationshipId, attendance.petId);
    assert.equal(state.createOrResumeBusinessIntake(accessRecord, ari, { daycareAttendanceId: attendance.daycareAttendanceId }).id, intake.id);
    assert.equal(state.createOrResumeBusinessIntake(accessRecord, thonglor, { daycareAttendanceId: attendance.daycareAttendanceId }), null);
    assert.equal(state.confirmPrototypeCheckIn(intake.id, thonglor).ok, false);
    // Simulate arrivals restored after the Intake screen was opened. The
    // execution write must recheck current occupancy, not the earlier plan.
    const beforeArrivals = storage.get(state.BUSINESS_STORAGE_KEY);
    const arrivalStore = JSON.parse(beforeArrivals);
    for (let index = 0; index < zone.capacity; index += 1) {
      const arrivalId = `bf11-concurrent-arrival-${index}`;
      arrivalStore.daycareAttendances[arrivalId] = {
        ...attendance, daycareAttendanceId: arrivalId, petId: `bf11-arrival-pet-${index}`,
        bookingId: `bf11-arrival-booking-${index}`, status: "active", checkedInAt: new Date().toISOString(),
      };
    }
    storage.set(state.BUSINESS_STORAGE_KEY, JSON.stringify(arrivalStore));
    assert.equal(state.getPrototypeDaycareZoneAvailability(ari, zone.id, "2026-08-25").remaining, 0);
    assert.equal(state.confirmPrototypeCheckIn(intake.id, ari).ok, false, "Intake may not overfill a zone that became full");
    assert.equal(state.transitionPrototypeDaycareAttendance(attendance.daycareAttendanceId, "checked-in", ari).reason, "capacity");
    assert.equal(state.readBusinessIntake(intake.id).checkInState, "draft");
    assert.equal(state.readPrototypeDaycareAttendance(attendance.daycareAttendanceId).status, "booked");
    storage.set(state.BUSINESS_STORAGE_KEY, beforeArrivals);
    const completed = state.confirmPrototypeCheckIn(intake.id, ari);
    assert.equal(completed.ok, true, JSON.stringify(completed));
    assert.equal(state.readPrototypeDaycareAttendance(attendance.daycareAttendanceId).intakeId, intake.id);
    assert.equal(state.readPrototypeDaycareAttendance(attendance.daycareAttendanceId).status, "checked-in");
    assert.equal(state.confirmPrototypeCheckIn(intake.id, ari).duplicate, true);
    assert.equal(state.listPrototypeDaycareAttendances(ari, { date: "2026-08-25" }).filter((item) => item.bookingId === booking.bookingId).length, 1);

    const secondBooking = installExecutionBookingFixture(state, ari, { ...bookingDraft, start: "2026-08-26" }, "be3-regression-daycare-intake-two");
    const secondAttendance = state.listPrototypeDaycareAttendances(ari, { date: "2026-08-26" }).find((item) => item.bookingId === secondBooking.bookingId);
    const secondIntake = state.createOrResumeBusinessIntake(accessRecord, ari, { daycareAttendanceId: secondAttendance.daycareAttendanceId });
    assert.notEqual(secondIntake.id, intake.id);
    assert.equal(state.readBusinessIntake(intake.id).daycareAttendanceId, attendance.daycareAttendanceId, "another explicit target cannot overwrite the completed Intake");
    sharing.updateTemporaryAccess({ ...accessRecord, status: "revoked", revokedAt: new Date().toISOString() });
    assert.equal(state.confirmPrototypeCheckIn(secondIntake.id, ari).ok, false);
    assert.equal(state.readPrototypeDaycareAttendance(secondAttendance.daycareAttendanceId).status, "booked");
  });
});

test("BF12 CRM derives segments, balances, next actions, and timeline from shared records without new truth", async () => {
  await withBusinessStateTest(async ({ state, vite, storage }) => {
    const crm = await vite.ssrLoadModule("/app/business/customers/crmPresentation.ts");
    const inbox = await vite.ssrLoadModule("/app/_prototype/inboxState.ts");
    const ari = state.getDemoBusinessContext("whisker-ari-frontdesk");
    const onnut = state.getDemoBusinessContext("paw-partner-onnut");
    const customer = state.readPrototypeCustomer("booking-contact-nalin");
    const dataset = {
      bookings: state.listPrototypeBookings(null, { includeCancelled: true }),
      serviceRecords: state.listPrototypeServiceRecords(null),
      charges: state.listPrototypeCharges(null), payments: state.listPrototypePayments(null),
      conversations: [...inbox.listPrototypeConversations(ari.businessId), ...inbox.listPrototypeConversations(onnut.businessId)],
    };
    const storageBefore = [...storage.entries()];
    const base = crm.deriveCustomerCrmProfile(customer, dataset, "2026-08-18T18:00:00.000Z");
    const customerRecords = dataset.serviceRecords.filter((record) => record.customerId === customer.id && record.businessId === customer.businessId);
    assert.equal(base.visitCount, new Set(customerRecords.map((record) => record.bookingId)).size);
    assert.equal(base.outstandingBalance, dataset.charges.filter((charge) => charge.customerId === customer.id && charge.businessId === customer.businessId)
      .reduce((total, charge) => total + state.getPrototypeChargeBalance(charge, dataset.payments).remaining, 0));
    assert.equal(base.nextAction.kind, "billing");
    assert.equal(crm.customerMatchesCrmSegment(base, "grooming"), true);
    assert.equal(crm.customerMatchesCrmSegment(base, "all"), true);
    assert.deepEqual([...storage.entries()], storageBefore, "deriving CRM never persists a CRM profile");

    assert.ok(customerRecords.length > 0);
    const visit = customerRecords[0];
    const history = {
      ...dataset, bookings: [], charges: [], payments: [],
      serviceRecords: [
        { ...visit, bookingId: "bf12-visit-1", serviceRecordId: "bf12-service-1", completedAt: "2026-08-17T12:00:00.000Z" },
        { ...visit, bookingId: "bf12-visit-1", serviceRecordId: "bf12-service-other-pet", petId: "another-pet", completedAt: "2026-08-17T12:00:00.000Z" },
        { ...visit, bookingId: "bf12-visit-2", serviceRecordId: "bf12-service-2", serviceModule: "daycare", completedAt: "2026-08-18T12:00:00.000Z" },
        { ...visit, businessId: onnut.businessId, bookingId: "foreign-visit", serviceRecordId: "foreign-service", completedAt: "2026-08-19T12:00:00.000Z" },
      ],
    };
    const regular = crm.deriveCustomerCrmProfile(customer, history, "2026-08-19T12:00:00.000Z");
    assert.equal(regular.visitCount, 2, "two Pets on one Booking count as one visit");
    assert.equal(regular.lifecycle, "regular");
    assert.equal(regular.returned, true);
    assert.equal(crm.customerMatchesCrmSegment(regular, "regular"), true);
    assert.equal(crm.customerMatchesCrmSegment(regular, "daycare"), true);
    assert.equal(crm.customerMatchesCrmSegment(regular, "no-next-booking"), true);
    assert.equal(regular.nextAction.kind, "booking");
    const inactive = crm.deriveCustomerCrmProfile(customer, history, "2026-10-15T12:00:00.000Z");
    assert.equal(inactive.lifecycle, "inactive");
    assert.equal(inactive.daysSinceLastVisit, 58);
    assert.equal(crm.customerMatchesCrmSegment(inactive, "inactive"), true);
    const upcoming = dataset.bookings.find((booking) => booking.customer.id === customer.id && booking.businessId === customer.businessId);
    const active = crm.deriveCustomerCrmProfile(customer, {
      ...history, serviceRecords: [], bookings: [
        { ...upcoming, bookingId: "cancelled-future", start: "2026-10-16", status: "cancelled" },
        { ...upcoming, bookingId: "next-future", start: "2026-10-17", status: "confirmed" },
      ],
    }, "2026-10-15T12:00:00.000Z");
    assert.equal(active.lifecycle, "active");
    assert.equal(active.nextBooking.bookingId, "next-future");
    assert.equal(active.nextAction.kind, "prepare");
    assert.equal(crm.customerMatchesCrmSegment(active, "new"), true);
    const empty = { bookings: [], serviceRecords: [], charges: [], payments: [], conversations: [] };
    assert.equal(crm.deriveCustomerCrmProfile(customer, empty).nextAction.kind, "booking");
    assert.equal(crm.deriveCustomerCrmProfile(customer, { ...empty, conversations: dataset.conversations }).nextAction.kind, "message");

    const charge = dataset.charges.find((item) => item.customerId === customer.id && item.businessId === customer.businessId && state.getPrototypeChargeBalance(item, dataset.payments).remaining > 0);
    const remaining = state.getPrototypeChargeBalance(charge, dataset.payments).remaining;
    const payment = state.recordPrototypePayment({ chargeId: charge.chargeId, context: state.getDemoBusinessContextForBranch(charge.businessId, charge.branchId), amount: remaining, method: "cash", requestKey: "bf12-derived-balance" });
    assert.equal(payment.ok, true);
    const refreshed = { ...dataset, payments: state.listPrototypePayments(null) };
    const afterPayment = crm.deriveCustomerCrmProfile(customer, refreshed, "2026-08-18T18:00:00.000Z");
    assert.equal(afterPayment.outstandingBalance, base.outstandingBalance - remaining);
    assert.equal(afterPayment.visitCount, base.visitCount);
    const timeline = crm.deriveCustomerTimeline({ ...customer, businessNote: "PRIVATE-CRM-NOTE" }, refreshed);
    assert.deepEqual([...new Set(timeline.map((item) => item.kind))].sort(), ["booking", "message", "payment", "service"]);
    assert.equal(new Set(timeline.map((item) => item.id)).size, timeline.length);
    assert.equal(timeline.some((item) => item.id === `payment-${payment.payment.paymentId}`), true);
    assert.equal(timeline.every((item, index) => index === 0 || timeline[index - 1].at >= item.at), true);
    assert.equal(timeline.every((item) => item.href.startsWith("/business/") || item.href === "#customer-service-history-title"), true);
    assert.doesNotMatch(JSON.stringify(timeline), /PRIVATE-CRM-NOTE|booking-contact-onnut|foreign-service/);
    assert.equal(crm.deriveCustomerTimeline(customer, history).some((item) => item.id === "service-foreign-service"), false);
    assert.equal([...storage.keys()].some((key) => /crm|retention/.test(key)), false);
    assert.equal(crm.CUSTOMER_CRM_SEGMENTS.length, 8);
  });
});

test("BF12 uses one date-level upcoming rule across CRM, customer list, detail, and pet cards", async () => {
  const [customers, customerDetail, crmSource] = await Promise.all([
    readFile(new URL("business/customers/CustomersScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/crmPresentation.ts", appRoot), "utf8"),
  ]);
  assert.match(customers, /deriveCustomerCrmReferenceAt\(customers, crmDataset\)/);
  assert.match(customers, /const nextBooking = crmProfile\.nextBooking/);
  assert.match(customerDetail, /listPrototypeCustomers\(context\)/);
  assert.match(customerDetail, /listPrototypeCustomerFixtures\(context\)/);
  assert.match(customerDetail, /deriveCustomerCrmReferenceAt\(crmCustomers, crmDataset\)/);
  assert.match(customerDetail, /deriveCustomerUpcomingBookings\(customer, crmDataset, referenceAt\)/);
  assert.match(customerDetail, /upcomingBookings\.find\(\(booking\) => booking\.pets\.some/);
  assert.match(customerDetail, /upcomingBookings\.slice\(0, 3\)\.map/);
  assert.match(crmSource, /const nextBooking = deriveCustomerUpcomingBookings\(customer, dataset, referenceAt\)\[0\]/);
  assert.doesNotMatch(customers + customerDetail, /bookingOccursAfterDemoStart|nextPetBooking|nextCustomerBooking/);

  await withBusinessStateTest(async ({ state, vite, storage }) => {
    const crm = await vite.ssrLoadModule("/app/business/customers/crmPresentation.ts");
    const customer = state.readPrototypeCustomer("booking-contact-onnut-aom");
    const booking = state.listPrototypeBookings(null).find((item) => item.bookingId === "booking-fixture-onnut-daycare-full");
    const [pudding, maple] = booking.pets;
    const recordTemplate = state.listPrototypeServiceRecords(null)[0];
    const currentBooking = { ...booking, bookingId: "current-daycare", start: "2026-09-03", status: "arrived" };
    const completedBooking = { ...booking, bookingId: "completed-daycare", start: "2026-09-03", pets: [maple] };
    const completedRecord = {
      ...recordTemplate,
      serviceRecordId: "completed-maple",
      bookingId: currentBooking.bookingId,
      businessId: booking.businessId,
      branchId: booking.branchId,
      customerId: customer.id,
      petId: maple.id,
      serviceModule: "daycare",
      completedAt: "2026-09-03T18:00:00.000Z",
    };
    const dataset = {
      bookings: [
        { ...booking, bookingId: "later-future", start: "2026-09-06" },
        { ...booking, bookingId: "cancelled-future", start: "2026-09-04", status: "cancelled" },
        { ...booking, bookingId: "historical-unfinished", start: "2026-08-18" },
        completedBooking,
        currentBooking,
        { ...booking, bookingId: "next-future", start: "2026-09-04" },
      ],
      serviceRecords: [
        completedRecord,
        { ...completedRecord, serviceRecordId: "completed-one-pet-booking", bookingId: completedBooking.bookingId },
        { ...completedRecord, serviceRecordId: "foreign-business", businessId: "another-business", petId: pudding.id },
        { ...completedRecord, serviceRecordId: "foreign-customer", customerId: "another-customer", petId: pudding.id },
        { ...completedRecord, serviceRecordId: "foreign-branch", branchId: "another-branch", petId: pudding.id },
        { ...completedRecord, serviceRecordId: "other-service", serviceModule: "hotel", petId: pudding.id },
      ],
      charges: [], payments: [], conversations: [],
    };
    const originalDataset = JSON.stringify(dataset);
    const storageBefore = [...storage.entries()];
    const referenceAt = crm.deriveCustomerCrmReferenceAt([customer], dataset);
    assert.equal(referenceAt, completedRecord.completedAt);
    const upcoming = crm.deriveCustomerUpcomingBookings(customer, dataset, referenceAt);
    assert.deepEqual(upcoming.map((item) => item.bookingId), ["current-daycare", "next-future", "later-future"]);
    assert.deepEqual(upcoming[0].pets.map((pet) => pet.id), [pudding.id], "a completed Pet leaves a multi-Pet Booking without hiding the unfinished sibling");
    assert.equal(upcoming.find((item) => item.pets.some((pet) => pet.id === maple.id)).bookingId, "next-future", "the completed Pet's next label skips its old attendance");
    const profile = crm.deriveCustomerCrmProfile(customer, dataset, referenceAt);
    assert.deepEqual(profile.nextBooking, upcoming[0]);
    assert.equal(JSON.stringify(dataset), originalDataset, "upcoming projections never mutate shared Bookings or Service Records");
    assert.deepEqual([...storage.entries()], storageBefore);

    const fullyCompleted = {
      ...dataset,
      serviceRecords: [...dataset.serviceRecords, { ...completedRecord, serviceRecordId: "completed-pudding", petId: pudding.id }],
    };
    assert.equal(crm.deriveCustomerCrmProfile(customer, fullyCompleted, referenceAt).nextBooking.bookingId, "next-future");
    const noFuture = { ...fullyCompleted, bookings: fullyCompleted.bookings.filter((item) => item.start <= "2026-09-03") };
    assert.deepEqual(crm.deriveCustomerUpcomingBookings(customer, noFuture, referenceAt), []);
    assert.equal(crm.deriveCustomerCrmProfile(customer, noFuture, referenceAt).nextBooking, null);
    assert.equal(crm.customerMatchesCrmSegment(crm.deriveCustomerCrmProfile(customer, noFuture, referenceAt), "no-next-booking"), true);

    const sameDayAppointment = { ...currentBooking, bookingId: "unresolved-same-day", timeModel: "appointment", start: "2026-09-03T09:00", end: "2026-09-03T10:00" };
    assert.equal(crm.deriveCustomerUpcomingBookings(customer, { ...dataset, bookings: [sameDayAppointment], serviceRecords: [] }, referenceAt).length, 1, "CRM's data watermark does not treat unresolved same-day work as elapsed wall-clock time");
  });
});

test("keeps typography, Business tokens, reduced motion, logo, and icon rules visible in source", async () => {
  const [layout, css, businessCss, packageJson, icons, brandMark, catPaw, catPawPattern, guardianSource, previewSource] = await Promise.all([
    readFile(new URL("layout.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("_components/icons.tsx", appRoot), "utf8"),
    readFile(new URL("_components/BrandMark.tsx", appRoot), "utf8"),
    readFile(new URL("../docs/assets/archived/catpaw.svg", import.meta.url), "utf8"),
    readFile(new URL("../public/catpaw-pattern.svg", import.meta.url), "utf8"),
    readFile(new URL("_components/business-landing/GuardianEntrySection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/HomePetPreview.tsx", appRoot), "utf8"),
  ]);

  assert.match(css, /Noto Sans Thai/);
  assert.match(css, /--font-meaw:\s*"Noto Sans Thai"/);
  assert.match(css, /font-family:\s*"LINE Seed Sans TH"/);
  assert.match(css, /font-display:\s*swap/);
  assert.match(css, /--font-meaw-business:\s*"LINE Seed Sans TH"/);
  assert.doesNotMatch(css, /FC Minimal|Anuphan/);
  assert.match(css, /--color-meaw-business-background:\s*#fffdf9/i);
  assert.match(css, /--color-meaw-business-foreground:\s*#2b2b2b/i);
  assert.match(css, /--color-meaw-business-border:\s*#ece8df/i);
  assert.match(css, /--color-meaw-business-primary:\s*#f4c95d/i);
  assert.match(css, /--color-meaw-business-primary-hover:\s*#d7b152/i);
  assert.match(css, /--color-meaw-business-primary-foreground:\s*#3d2b00/i);
  assert.match(css, /--color-meaw-business-coral:\s*#ff9b85/i);
  assert.match(css, /--color-meaw-business-mint:\s*#5fcfa8/i);
  assert.match(css, /--color-meaw-business-sky:\s*#6fb1e0/i);
  assert.match(css, /--color-meaw-business-grape:\s*#b79bdb/i);
  assert.match(css, /--ease-meaw-premium:\s*cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(layout, /import "\.\/business-design-system\.css"/);
  assert.match(businessCss, /LIGHT \/ WARM WHITE ONLY/);
  assert.match(businessCss, /font-synthesis:\s*none/);
  assert.match(businessCss, /--radius-control:\s*0\.5rem/);
  assert.match(businessCss, /--radius-button:\s*0\.625rem/);
  assert.match(businessCss, /--radius-card:\s*1\.25rem/);
  assert.match(businessCss, /--type-body:\s*1rem/);
  assert.match(businessCss, /--duration-fast:\s*180ms/);
  assert.match(businessCss, /--duration-base:\s*220ms/);
  assert.match(businessCss, /--duration-slow:\s*300ms/);
  assert.match(businessCss, /business-skeleton-shimmer/);
  assert.match(businessCss, /backdrop-filter:\s*blur/);
  assert.match(businessCss, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(businessCss, /\[data-(?:portal-)?theme=['"]dark['"]\]/i);
  assert.doesNotMatch(businessCss, /#[0-9a-fA-F]{3,8}|rgba?\(/);
  assert.match(css, /Sriracha/);
  assert.match(css, /@theme static/);
  assert.match(css, /--color-meaw-rose-500/);
  assert.match(css, /--color-meaw-rose-950/);
  assert.match(css, /--color-meaw-primary:\s*var\(--color-meaw-rose-500\)/);
  assert.match(css, /--background-image-meaw-brand/);
  assert.match(css, /\.passport-stage::before\s*\{/);
  assert.match(css, /background-image: url\("\/catpaw-pattern\.svg"\)/);
  assert.match(css, /\.passport-showcase::before\s*\{[\s\S]*?background-image: url\("\/catpaw-pattern\.svg"\)/);
  assert.match(css, /\.taped-note::after\s*\{/);
  assert.equal((catPaw.match(/<path\s/g) ?? []).length, 5);
  assert.match(catPaw, /viewBox="0 0 100 100"/);
  assert.match(catPaw, /fill="#ffb5c6"/);
  assert.match(catPaw, /<\/svg>/);
  assert.match(catPawPattern, /viewBox="0 0 64 64"/);
  assert.match(catPawPattern, /<path/);
  assert.match(guardianSource, /<PawPrint/);
  assert.match(previewSource, /<PawPrint/);
  assert.match(icons, /LuPawPrint/);
  assert.match(icons, /export const PawPrint/);
  assert.doesNotMatch(icons, /CatPawGlyph/);
  assert.match(css, /\.brand__logo\s*\{/);
  assert.match(brandMark, /src="\/logo\.svg"/);
  assert.doesNotMatch(brandMark, /PawPrint/);
  assert.match(css, /\.button--primary\s*\{[\s\S]*?@apply bg-meaw-primary text-meaw-ink-900;/);
  assert.match(css, /--text-meaw-display:/);
  assert.match(css, /--text-meaw-h1:/);
  assert.match(css, /--text-meaw-h2:/);
  assert.match(css, /@apply text-meaw-display/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.quick-passport\.is-flipped \.quick-passport__inner[\s\S]*?transform:\s*none !important/);
  assert.match(css, /\.passport-flip\.is-flipped \.passport-flip__back[\s\S]*?opacity:\s*1/);
  assert.doesNotMatch(css, /@view-transition|::view-transition-(?:old|new)\(root\)|meaw-page-(?:in|out)/);
  assert.match(css, /meaw-pop-in/);
  assert.match(css, /meaw-icon-hop/);
  assert.match(packageJson, /react-icons/);
  assert.doesNotMatch(packageJson, /@phosphor-icons\/react/);
  assert.match(icons, /from "react-icons\/lu"/);
  assert.doesNotMatch(icons, /@phosphor-icons/);
  assert.match(packageJson, /qrcode\.react/);
  assert.match(layout, /lang="th"/);

  assert.match(css, /--text-meaw-display:\s*clamp\(2\.5rem,/);
  assert.match(css, /--text-meaw-h1:\s*clamp\(2rem,/);
  assert.match(css, /--text-meaw-h2:\s*clamp\(1\.75rem,/);
  assert.match(css, /--text-meaw-h3:\s*1\.5rem/);
  assert.match(css, /--text-meaw-badge:\s*0\.875rem/);
  assert.match(css, /--radius-meaw-sm:\s*0\.75rem/);
  assert.match(css, /--radius-meaw-md:\s*1rem/);
  assert.match(css, /--radius-meaw-lg:\s*1\.5rem/);
  assert.match(css, /--radius-meaw-xl:\s*2rem/);
  assert.match(css, /--radius-meaw-2xl:\s*2\.5rem/);
  assert.match(css, /@media \(max-width:\s*1023px\)/);
  assert.match(css, /@media \(max-width:\s*767px\)/);

  const themeBlock = css.match(/@theme static \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(themeBlock.length > 0);
  const componentCss = css.replace(themeBlock, "");
  assert.doesNotMatch(componentCss, /#[0-9a-fA-F]{3,8}|rgba?\(/);
});

test("keeps the requested Business interaction and component refinements explicit", async () => {
  const [
    frame,
    calendar,
    viewControl,
    identityFields,
    bookingEditor,
    hotelFields,
    grooming,
    groomingCard,
    customers,
    inboxList,
    inboxPane,
    inboxComposer,
    inboxTimeline,
    customerDetail,
    searchField,
    businessCss,
  ] = await Promise.all([
    readFile(new URL("business/_components/BusinessPortalFrame.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarViewControl.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingIdentityFields.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/HotelBookingFields.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingOperations.tsx", appRoot), "utf8"),
    readFile(new URL("business/grooming/GroomingJobCard.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomersScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationList.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/ConversationPane.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageComposer.tsx", appRoot), "utf8"),
    readFile(new URL("business/inbox/MessageTimeline.tsx", appRoot), "utf8"),
    readFile(new URL("business/customers/CustomerDetailScreen.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessSearchField.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.match(frame, /key=\{pathname\}[\s\S]*?business-route-stage/);
  assert.match(businessCss, /@keyframes business-route-enter/);
  assert.match(businessCss, /@keyframes business-section-enter/);
  assert.match(calendar, /key === "z"/);
  assert.match(calendar, /focusCalendarDate/);
  assert.match(calendar, /scrollIntoView/);
  assert.match(calendar, /data-calendar-keyboard/);
  assert.match(viewControl, /CALENDAR_VIEW_OPTIONS/);
  assert.match(viewControl, /BusinessSegmentedControl/);
  assert.match(identityFields, /role="combobox"/);
  assert.match(identityFields, /พิมพ์ชื่อลูกค้า/);
  assert.match(identityFields, /BusinessPetAvatar/);
  assert.match(bookingEditor, /showAutomaticAvailability/);
  assert.match(bookingEditor, /automatic=\{showAutomaticAvailability\}/);
  assert.doesNotMatch(hotelFields, /วันเช็กเอาต์ไม่นับเป็นคืนพัก/);
  assert.doesNotMatch(grooming, /grooming-toolbar__search|grooming-board-hint/);
  assert.match(grooming, /elementFromPoint/);
  assert.match(grooming, /data-grooming-drop-lane/);
  assert.match(groomingCard, /grooming-job-card--\$\{job\.status\}/);
  assert.match(businessCss, /\.grooming-job-card--in-service[\s\S]*?background:/);
  assert.match(searchField, /forwardRef/);
  assert.match(customers, /BusinessSearchField/);
  assert.match(inboxList, /BusinessSearchField/);
  assert.doesNotMatch(inboxPane + inboxComposer, /ส่งข้อความในเบราว์เซอร์นี้แล้ว/);
  assert.doesNotMatch(inboxTimeline, /ในเบราว์เซอร์/);
  assert.match(customerDetail, /customer-detail-icon-action--edit/);
  assert.match(customerDetail, /customer-pets-heading-actions/);
  assert.match(businessCss, /\.business-inbox \.add-service-request[\s\S]*?inset: 50% auto auto 50%/);
  assert.match(calendar, /<span>เพิ่มการจอง<\/span>/);
  assert.match(bookingEditor, /ทบทวนการจอง/);
  assert.match(businessCss, /\.business-signature-sweep\s*\{[\s\S]*?color: var\(--primary-foreground\);[\s\S]*?background: var\(--primary\);/);
  assert.match(businessCss, /\.business-signature-sweep > \*\s*\{[\s\S]*?transition: color 1000ms cubic-bezier\(0\.86, 0, 0\.07, 1\);/);
  assert.match(businessCss, /\.business-signature-sweep::after,\s*\.business-signature-sweep::before/);
  assert.match(businessCss, /\.business-signature-sweep::before\s*\{[\s\S]*?background: var\(--foreground\);/);
  assert.match(businessCss, /\.business-signature-sweep:hover::after,[\s\S]*?left: calc\(0% - 10px\)/);
});

test("promotes navigation, data, feedback, modal, progress, skeleton, and signature patterns into shared Business components", async () => {
  const [segmented, navigation, table, feedback, modal, calendarView, bookingItem, navigationUsage, loading, businessCss] = await Promise.all([
    readFile(new URL("business/_components/BusinessSegmentedControl.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigationPrimitives.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessDataTable.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessFeedback.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessModal.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/CalendarViewControl.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingItem.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/loading.tsx", appRoot), "utf8"),
    readFile(businessCssUrl, "utf8"),
  ]);

  assert.match(segmented, /role="tablist"/);
  assert.match(segmented, /role="tab"/);
  assert.match(segmented, /aria-selected/);
  assert.match(segmented, /ArrowLeft/);
  assert.match(segmented, /ArrowRight/);
  assert.match(calendarView, /BusinessSegmentedControl/);
  assert.match(bookingItem, /booking-status-label/);
  assert.match(bookingItem, /bookingStatusLabel\(status\)/);
  assert.doesNotMatch(bookingItem, /booking-status--|StatusIcon/);
  assert.match(navigation, /BusinessBreadcrumbs/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /BusinessSidebarSectionHeader/);
  assert.match(navigationUsage, /BusinessSidebarSectionHeader title="งานบริการ"/);
  assert.match(table, /<table/);
  assert.match(table, /<caption className="sr-only"/);
  assert.match(feedback, /BusinessAlert/);
  assert.match(feedback, /BusinessProgress/);
  assert.match(feedback, /BusinessSkeleton/);
  assert.match(feedback, /CheckCircle/);
  assert.match(feedback, /TriangleAlert/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /event\.key !== "Tab"/);
  assert.match(loading, /BusinessProgress/);
  assert.match(loading, /BusinessSkeleton/);
  assert.match(businessCss, /--segmented-bg:/);
  assert.match(businessCss, /\.business-data-table/);
  assert.match(businessCss, /\.business-alert--critical/);
  assert.match(businessCss, /\.business-modal__backdrop/);
  assert.match(businessCss, /\.business-progress--indeterminate/);
  assert.match(businessCss, /\.business-signature-sweep/);
  assert.match(businessCss, /\.business-signature-rainbow/);
});

test("keeps raw color values out of page and component source", async () => {
  const entries = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const sourceFiles = entries
    .filter((entry) => entry.isFile() && /\.(?:tsx|ts)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

  for (const file of sourceFiles) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /#[0-9a-fA-F]{3,8}|rgba?\(/, `raw color in ${file}`);
  }
});

test("contains no Emoji or Dingbat UI characters in app source", async () => {
  const entries = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const sourceFiles = entries
    .filter((entry) => entry.isFile() && /\.(?:css|tsx|ts)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

  const forbidden = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (const file of sourceFiles) {
    const content = await readFile(file, "utf8");
    assert.equal(forbidden.test(content), false, `forbidden UI character in ${file}`);
  }

  assert.ok(sourceFiles.length > 0);
});
import { businessFixtureHtml } from "./business-render-fixture.mjs";
