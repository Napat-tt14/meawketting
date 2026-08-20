import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const appRoot = new URL("../app/", import.meta.url);
const manualUrl = new URL("../docs/.htmlmanual/manual.html", import.meta.url);
const validationUrl = new URL("../docs/VALIDATION.md", import.meta.url);
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

test("renders the Index as the Business Operating Platform landing page", async () => {
  const html = await htmlFor("/");
  const hero = html.match(/<section class="business-homepage-hero[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(html, /ทุกงานของร้านสัตว์เลี้ยง[\s\S]*จัดการง่ายในที่เดียว/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /เข้าสู่ระบบสำหรับธุรกิจ/);
  assert.match(html, /href="\/business\/login"/);
  assert.match(html, /href="\/my-pets"/);
  assert.match(html, /href="\/create-passport"/);
  assert.match(html, /logo\.svg/);
  assert.match(html, /Whisker Rest/);
  assert.match(html, /ธุรกิจเดียว หลายบริการ/);
  assert.match(html, /อาบน้ำ \/ ตัดขน/);
  assert.match(html, /โรงแรมสัตว์เลี้ยง/);
  assert.match(html, /Daycare/);
  assert.match(html, /งานสำคัญของร้าน เชื่อมกันในระบบเดียว/);
  assert.match(html, /Mochi/);
  assert.match(html, /ข้อมูลของน้องยังอยู่ภายใต้การควบคุมของเจ้าของ/);
  assert.match(html, /เป็นเจ้าของสัตว์เลี้ยง\?/);
  assert.match(html, /Pet Passport/);
  assert.match(html, /ภาพรวมงานประจำวัน · Whisker Rest/);
  assert.match(html, /งานถัดไป[s\S]*Mochi/);
  assert.doesNotMatch(html, /ข้อมูลจำลอง|ในเครื่อง|กำลังพัฒนา|ต้นแบบ|ทิศทางผลิตภัณฑ์|repository|Product prototype/i);
  assert.match(hero, /href="\/business\/login"[\s\S]*เข้าสู่ระบบสำหรับธุรกิจ/);
  assert.match(hero, /href="#business-core"[\s\S]*ดูว่าระบบช่วยอะไรได้บ้าง/);
  assert.doesNotMatch(hero, /href="\/create-passport"|สร้าง Pet Passport/);
});

test("keeps the Business-first homepage honest, linked, responsive, and Yellow-primary", async () => {
  const [html, css, pageSource, headerSource, heroSource, coreSource, workflowSource, closingSource] = await Promise.all([
    htmlFor("/"),
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessCoreSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessWorkflowSection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessClosingSection.tsx", appRoot), "utf8"),
  ]);
  const landingSource = pageSource + heroSource + coreSource + workflowSource + closingSource;
  const homepageCss = css.slice(css.indexOf("Business-first root homepage — 2026-08-20"));

  assert.match(pageSource, /<BusinessLandingHero \/>[\s\S]*<BusinessCoreSection \/>[\s\S]*<BusinessClosingSection \/>/);
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
  assert.match(headerSource, /href="\/login"/);
  assert.match(headerSource, /href="\/business\/login"/);
  for (const id of ["business-core", "services", "guardian"]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(css, /--color-meaw-business-primary:\s*var\(--color-meaw-yellow-400\)/);
  assert.match(css, /--color-meaw-business-primary-foreground:\s*var\(--color-meaw-ink-950\)/);
  assert.match(css, /\.business-portal \.button--business,[\s\S]*?background:\s*var\(--color-meaw-business-action\)[\s\S]*?color:\s*var\(--color-meaw-business-action-foreground\)/);
  assert.doesNotMatch(homepageCss, /teal/i);
  assert.match(homepageCss, /\.business-homepage\s*\{[\s\S]*?overflow-x:\s*clip/);
  assert.match(homepageCss, /grid-template-columns:\s*minmax\(0, \.98fr\) minmax\(0, 1\.02fr\)/);
  assert.match(homepageCss, /@media \(max-width: 1023px\)/);
  assert.match(homepageCss, /@media \(max-width: 767px\)/);
  assert.match(homepageCss, /@media \(max-width: 430px\)/);
  assert.match(homepageCss, /@media \(max-width: 359px\)/);
  assert.match(homepageCss, /prefers-reduced-motion:\s*reduce/);
});

test("keeps landing imagery photographic and compact at desktop", async () => {
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

  assert.deepEqual(assets, ["pet-business-hero-photo.png", "pet-business-hero-wide.png", "pet-business-services-photo.png", "pet-business-workflow-photo.png"]);
  assert.match(heroSource, /pet-business-hero-wide\.png/);
  assert.match(servicesSource, /pet-business-services-photo\.png/);
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
  assert.match(appHeaderSource, /showLogin=\{variant !== "auth"\}/);
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

test("renders PUB-004 through Login as one bounded prototype flow", async () => {
  const [previewHtml, loginHtml, successResponse, claimResponse, authResponse, previewSource, loginSource, googleSource, contextSource, passportSource] = await Promise.all([
    htmlFor("/create-passport/preview"),
    htmlFor("/login"),
    render("/create-passport/success"),
    render("/create-passport/claim"),
    render("/create-passport/auth/google"),
    readFile(new URL("create-passport/preview/PassportPreviewStep.tsx", appRoot), "utf8"),
    readFile(new URL("login/LoginScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_components/GoogleAuthButton.tsx", appRoot), "utf8"),
    readFile(new URL("create-passport/DraftPassportContext.tsx", appRoot), "utf8"),
    readFile(new URL("_components/PassportCard.tsx", appRoot), "utf8"),
  ]);

  assert.match(previewHtml, /เลือก Passport ให้น้อง/);
  assert.doesNotMatch(previewHtml, /create-progress|Photo\s*Info\s*Preview/);
  assert.doesNotMatch(previewHtml, />DRAFT<|แก้ไขรูป|แก้ไขชื่อหรือชนิดสัตว์|บันทึกเป็นภาพ 4:5/);
  assert.match(loginHtml, /เข้าสู่ระบบ Meawketting/);
  assert.equal(successResponse.status, 307);
  assert.equal(successResponse.headers.get("location"), "/my-pets/claimed-local");
  assert.equal(claimResponse.status, 404);
  assert.equal(authResponse.status, 404);

  assert.match(previewSource, /passportStyles\.map/);
  assert.equal((previewSource.match(/<PassportCard\b/g) ?? []).length, 1);
  assert.match(previewSource, /passport-style-selector__grid/);
  assert.match(previewSource, /<GoogleAuthButton/);
  assert.match(previewSource, /className="preview-google-action"/);
  assert.match(previewSource, /บันทึกภาพ/);
  assert.match(previewSource, /router\.push\("\/login\?returnTo=/);
  assert.match(previewSource, /returnTo=%2Fmy-pets%2Fclaimed-local/);
  assert.match(loginSource, /<GoogleAuthButton/);
  assert.match(googleSource, /ดำเนินการต่อด้วย Google/);
  assert.match(loginSource, /prototypeClaimed: true/);
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
  assert.match(hero, /ทุกงานของร้านสัตว์เลี้ยง/);
  assert.doesNotMatch(hero, /Today|Sessions|Customers|Documents|Team|Settings/);
});

test("keeps Business Login visually separate while reusing the Google behavior primitive", async () => {
  const [html, businessLogin, consumerLogin, googleButton] = await Promise.all([
    htmlFor("/business/login"),
    readFile(new URL("business/login/BusinessLoginScreen.tsx", appRoot), "utf8"),
    readFile(new URL("login/LoginScreen.tsx", appRoot), "utf8"),
    readFile(new URL("_components/GoogleAuthButton.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /เข้าสู่ระบบสำหรับร้าน/);
  assert.match(html, /ดำเนินการต่อด้วยบัญชีของคุณ/);
  assert.match(businessLogin, /requested\?\.startsWith\("\/business\/"\)/);
  assert.match(businessLogin, /: "\/business\/home"/);
  assert.match(businessLogin, /บัญชีบุคคลเดียวสามารถเป็นทั้งผู้ดูแลสัตว์และสมาชิกของร้านได้/);
  assert.match(businessLogin, /<GoogleAuthButton/);
  assert.match(consumerLogin, /<GoogleAuthButton/);
  assert.match(googleButton, /ดำเนินการต่อด้วย Google/);
  assert.doesNotMatch(businessLogin, /DRAFT_PASSPORT_STORAGE_KEY|prototypeClaimed/);
});

test("renders Business Home as a priority-first local prototype with booking-derived work", async () => {
  const [html, source, state] = await Promise.all([
    htmlFor("/business/home"),
    readFile(new URL("business/home/BusinessHome.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);

  assert.match(html, /Whisker Rest Demo/);
  assert.match(html, /สาขาอารีย์/);
  assert.match(html, /สิ่งที่ต้องจัดการ/);
  assert.match(html, /งานถัดไป/);
  assert.match(html, /อาบน้ำ \/ ตัดขน/);
  assert.match(html, /โรงแรม/);
  assert.match(html, /รายรับวันนี้/);
  assert.match(html, /ข้อมูลตัวอย่าง/);
  assert.match(html, /href="\/business\/scan"/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(source, /getEnabledBusinessModules\(context\)/);
  assert.match(source, /enabledModules\.map/);
  assert.match(source, /listPrototypeBookings\(context/);
  assert.match(source, /bookingsToday/);
  assert.match(state, /"whisker-ari-frontdesk": \["grooming", "hotel"\]/);
  assert.match(state, /"whisker-thonglor-frontdesk": \["grooming"\]/);
  assert.match(state, /"paw-partner-onnut": \["hotel", "daycare"\]/);
  assert.match(source, /DEMO \/ MOCK · ยังไม่มีระบบการเงินจริง/);
  assert.doesNotMatch(state, /nextWork:\s*\[/);
});

test("builds one Branch-aware Business shell with a live Calendar and no fake module routes", async () => {
  const [layout, frame, desktopNav, mobileNav, model, header, menu, state] = await Promise.all([
    readFile(new URL("business/layout.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessPortalFrame.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessMobileNavigation.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/businessNavigationModel.ts", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessHeader.tsx", appRoot), "utf8"),
    readFile(new URL("business/_components/BusinessUserMenu.tsx", appRoot), "utf8"),
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
  assert.match(desktopNav + mobileNav, /aria-disabled="true"/);
  assert.match(desktopNav + mobileNav, /disabled/);
  assert.match(model, /BUSINESS_CALENDAR_DESTINATION/);
  assert.match(model, /href:\s*"\/business\/calendar"/);
  assert.doesNotMatch(desktopNav + mobileNav + model, /\/business\/(?:customers|inbox|grooming|hotel|daycare|finance|reports|team|settings)/);
  for (const label of ["ปฏิทิน", "ลูกค้าและสัตว์เลี้ยง", "ข้อความ", "การเงิน", "รายงาน", "ทีม", "ตั้งค่า"]) {
    assert.match(model, new RegExp(label));
  }
  assert.match(desktopNav, /getEnabledBusinessModules\(context\)/);
  assert.match(mobileNav, /getEnabledBusinessModules\(context\)/);
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
  assert.equal((source.match(/business-mobile-navigation__item(?!-)/g) ?? []).length, 5);
  assert.match(source, /<Link[\s\S]*?BUSINESS_CALENDAR_DESTINATION\.href/);
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
  assert.match(switcher, /aria-label="เปลี่ยนร้านและสาขาตัวอย่าง"/);
  assert.match(switcher, /DEMO_BUSINESS_CONTEXTS\.map/);
  assert.match(hook, /meawketting:business-state/);
  assert.match(hook, /writeActiveBusinessContext/);
  assert.match(scanner, /meawketting:business-state/);
  assert.match(intake, /readActiveBusinessContext/);
  assert.match(intake, /evaluateTemporaryAccess\(access, activeContext\.businessId, activeContext\.branchId\)/);
  assert.match(state, /whisker-thonglor-frontdesk/);
  assert.match(fixtures, /whisker-thonglor/);
});

test("renders BF-2 Business Calendar as a live local planning route", async () => {
  const [html, page, calendar, editor, state] = await Promise.all([
    htmlFor("/business/calendar"),
    readFile(new URL("business/calendar/page.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BusinessCalendar.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);

  assert.match(html, /<h1[^>]*>ปฏิทิน<\/h1>/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /เพิ่มการจอง/);
  assert.match(html, /Mochi/);
  assert.match(html, /เข้าพักโรงแรม/);
  assert.match(html, /href="\/business\/calendar"/);
  assert.match(page, /BusinessCalendar/);
  assert.match(calendar, /CalendarWeekView/);
  assert.match(calendar, /CalendarAgenda/);
  assert.match(calendar, /listPrototypeBookings/);
  assert.match(calendar, /includeCancelled: true/);
  assert.match(editor, /role="dialog"/);
  assert.match(editor, /aria-modal="true"/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /event\.key !== "Tab"/);
  assert.match(state, /BOOKING_DEMO_DATE = "2026-08-18"/);
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
  assert.match(hotel, /พื้นที่พักที่ต้องใช้/);
  assert.match(daycare, /วันที่ใช้บริการ/);
  assert.match(daycare, /โซนดูแล/);
});

test("checks Branch services, resources, capacity, and duplicate confirmation before Booking save", async () => {
  const [state, editor, availability] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("business/calendar/AvailabilityStatus.tsx", appRoot), "utf8"),
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
  assert.match(state, /savePrototypeBooking\(draft/);
  assert.match(editor, /evaluatePrototypeBookingAvailability\(draft, context\)/);
  assert.match(editor, /สาขาที่กำลังใช้งานเปลี่ยนแล้ว/);
  assert.match(availability, /เปลี่ยนเวลา/);
  assert.match(availability, /เปลี่ยนตัวเลือก/);
  assert.match(availability, /เปลี่ยนวันที่/);
});

test("supports local Booking create, edit, cancellation history, and safe recovery UI", async () => {
  const [state, editor, css] = await Promise.all([
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readFile(new URL("business/calendar/BookingEditor.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(state, /bookings: Record<string, PrototypeBooking>/);
  assert.match(state, /savePrototypeBooking/);
  assert.match(state, /cancelPrototypeBooking/);
  assert.match(state, /cancelledAt/);
  assert.match(state, /duplicate: true/);
  assert.match(editor, /ยืนยันการจอง/);
  assert.match(editor, /บันทึกการเปลี่ยนแปลง/);
  assert.match(editor, /ยกเลิกการจอง/);
  assert.match(editor, /ยืนยันยกเลิกการจอง/);
  assert.match(editor, /การจองนี้ยกเลิกแล้ว/);
  assert.match(editor, /ต้นแบบนี้เริ่มจากการจอง 1 ตัวต่อครั้ง/);
  assert.match(css, /booking-editor__backdrop/);
  assert.match(css, /booking-editor-enter 220ms/);
  assert.match(css, /booking-editor-mobile-enter/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?booking-editor/);
});

test("adds only the shared Calendar route and keeps module operations absent", async () => {
  const routes = await readdir(appRoot, { recursive: true, withFileTypes: true });
  const routePaths = routes
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => entry.parentPath.replaceAll("\\", "/"));

  assert.equal(routePaths.some((path) => /business\/calendar$/.test(path)), true);
  assert.equal(routePaths.some((path) => /business\/(?:bookings|grooming|hotel|daycare|customers|inbox|finance|reports|team|settings)(?:\/|$)/.test(path)), false);
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
    htmlFor("/business/scan"),
    readFile(new URL("business/scan/BusinessScanner.tsx", appRoot), "utf8"),
    readFile(new URL("_components/SiteHeader.tsx", appRoot), "utf8"),
    readFile(new URL("_components/business-landing/BusinessLandingHero.tsx", appRoot), "utf8"),
  ]);

  assert.match(html, /สแกน QR เพื่อรับน้องเข้าร้าน/);
  assert.match(html, /QR ชั่วคราวสำหรับร้าน/);
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /BarcodeDetector/);
  assert.match(source, /กรอกรหัสใต้ QR/);
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

test("reuses the Phase D access contract and Business fixtures for Phase E", async () => {
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
  assert.match(scanner, /evaluateTemporaryAccess/);
  assert.doesNotMatch(businessState, /const BUSINESS_FIXTURES/);
  assert.doesNotMatch(businessState, /jwt|encrypt|database|supabase/i);
});

test("shows only allowed Phase D scope and invents no health facts in Intake", async () => {
  const source = await readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8");
  assert.match(source, /ข้อมูลที่ร้านนี้ได้รับ/);
  assert.match(source, /ข้อมูลที่ร้านไม่ได้รับ/);
  assert.match(source, /access\.scope\.includes\("photo"\)/);
  assert.match(source, /access\.scope\.includes\("passportReference"\)/);
  assert.match(source, /ยา ภูมิแพ้ วัคซีน ประวัติสุขภาพ และเอกสาร — ไม่มีอยู่ในแบบจำลองการอนุญาตนี้/);
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
  assert.match(source, /ข้อมูลส่วนนี้เป็นบันทึกของร้าน และไม่แก้ Pet Passport ของน้อง/);
  assert.match(source, /เสนอแก้ไขข้อมูล/);
  assert.match(source, /ข้อมูลต้นฉบับของน้องยังไม่เปลี่ยน/);
  assert.match(businessState, /correctionSuggestion/);
  assert.match(businessState, /submitCorrectionSuggestion/);
  assert.doesNotMatch(businessState, /PROTOTYPE_DRAFT_STORAGE_KEY|writeClaimedPrototypePet/);
  assert.doesNotMatch(petState, /businessNote|correctionSuggestion|belongings/);
});

test("supports awaiting consent, approval, and mid-flow access interruption", async () => {
  const [source, businessState] = await Promise.all([
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
  ]);
  assert.match(source, /รอเจ้าของอนุมัติ/);
  assert.match(source, /ข้อมูลของน้องยังถูกซ่อน/);
  assert.match(source, /ต้นแบบนี้ไม่แจ้งเตือนแบบทันที/);
  assert.match(source, /จำลองว่าเจ้าของอนุมัติ/);
  assert.match(source, /สิทธิ์เข้าถึงหมดอายุแล้ว/);
  assert.match(source, /เจ้าของยกเลิกสิทธิ์แล้ว/);
  assert.match(source, /แบบร่างการรับเข้ายังอยู่/);
  assert.match(businessState, /approveOwnerDecisionPrototype/);
  assert.match(businessState, /setPrototypeAccessInterruption/);
});

test("revalidates and de-duplicates receiving then stops before Service Session UI", async () => {
  const [source, businessState, routes] = await Promise.all([
    readFile(new URL("business/intake/[intakeId]/BusinessIntake.tsx", appRoot), "utf8"),
    readFile(new URL("_prototype/businessState.ts", appRoot), "utf8"),
    readdir(appRoot, { recursive: true, withFileTypes: true }),
  ]);
  assert.match(source, /ตรวจทานก่อนรับเข้า/);
  assert.match(source, /ยืนยันรับเข้า/);
  assert.match(source, /aria-busy=\{submitting\}/);
  assert.match(source, /รับเข้าเรียบร้อย/);
  assert.match(source, /ขั้นตอนรับเข้าเสร็จสมบูรณ์/);
  assert.match(source, /เป็นเลขในเครื่องนี้เท่านั้น ไม่ใช่เลขงานบริการจริง/);
  assert.match(businessState, /record\.checkInState === "checked-in"/);
  assert.match(businessState, /evaluateTemporaryAccess\(access, record\.businessId, record\.branchId\)/);
  assert.match(businessState, /prototypeSessionReference/);
  const routeFiles = routes.filter((entry) => entry.isFile() && entry.name === "page.tsx").map((entry) => entry.parentPath.replaceAll("\\", "/"));
  assert.equal(routeFiles.some((path) => /business\/sessions|careproof/i.test(path)), false);
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

test("keeps the derived manual aligned with the canonical hybrid Business architecture", async () => {
  const [html, validation] = await Promise.all([
    readFile(manualUrl, "utf8"),
    readFile(validationUrl, "utf8"),
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

  assert.match(html, /Person → Business → Branch → Enabled Service Modules/);
  assert.match(overviewPanel, /Business-first homepage/);
  assert.match(overviewPanel, /\/business\/login/);
  assert.match(overviewPanel, /Guardian.*secondary|secondary.*Guardian/i);
  assert.match(modelPanel, /Customer/);
  assert.match(modelPanel, /Visit \/ Order/);
  assert.match(modelPanel, /Service Job/);
  assert.match(modelPanel, /Conversation/);
  assert.match(modelPanel, /Charge/);
  assert.match(modelPanel, /Payment/);
  assert.match(modelPanel, /Consent \/ Access Grant/);
  assert.equal((corePanel.match(/class="capability"/g) ?? []).length, 12);
  assert.match(corePanel, /Home \/ Today/);
  assert.match(corePanel, /\/business\/home/);
  assert.match(corePanel, /Branch-aware/);
  assert.match(corePanel, /Inbox/);
  assert.match(corePanel, /Billing/);
  assert.match(modulePanel, /Grooming \/ Bathing/);
  assert.match(modulePanel, /Hotel \/ Boarding/);
  assert.match(modulePanel, /Daycare/);
  assert.match(modulePanel, /Room × Date/);
  assert.equal((scenarioPanel.match(/class="scenario"/g) ?? []).length, 5);
  assert.match(scenarioPanel, /Hotel \+ Grooming/);
  assert.match(scenarioPanel, /Branch transfer/);

  assert.match(html, /Noto Sans Thai/);
  assert.match(designPanel, /WARM OPERATIONAL CLARITY/);
  assert.match(designPanel, /Warm Golden Yellow/);
  assert.match(designPanel, /Dark Ink/);
  assert.match(designPanel, /ภาพถ่ายจริง/);
  assert.match(designPanel, /ไม่โหลด <code>public\/images\/cats<\/code>/);
  assert.doesNotMatch(designPanel, /Deep Teal/);
  assert.match(designPanel, /16px/);
  assert.match(designPanel, /180–300ms/);
  assert.match(roadmapPanel, /Shared Business Intake Engine/);
  assert.match(roadmapPanel, /BF-1/);
  assert.match(roadmapPanel, /BF-3/);
  assert.match(roadmapPanel, /NOT started|not the automatic next step/);

  assert.match(validation, /# Validation/);
  assert.match(validation, /57 tests, 57 passed/);
  assert.match(validation, /24 route entries|23 route entries/);
  assert.match(validation, /Broken relative Markdown links/);
  assert.match(validation, /Stale legacy references/);
  assert.match(validation, /Shared Business Intake Engine/);
  assert.doesNotMatch(html, /143 legacy|Page ID|OPS-\d{3}|docs\/ux-ui/i);
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html), false);
});

test("keeps typography, reduced motion, logo, and icon rules visible in source", async () => {
  const [layout, css, packageJson, icons, brandMark, catPaw, catPawPattern, guardianSource, previewSource] = await Promise.all([
    readFile(new URL("layout.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("_components/icons.tsx", appRoot), "utf8"),
    readFile(new URL("_components/BrandMark.tsx", appRoot), "utf8"),
    readFile(new URL("../public/catpaw.svg", import.meta.url), "utf8"),
    readFile(new URL("../public/catpaw-pattern.svg", import.meta.url), "utf8"),
    readFile(new URL("_components/business-landing/GuardianEntrySection.tsx", appRoot), "utf8"),
    readFile(new URL("_components/HomePetPreview.tsx", appRoot), "utf8"),
  ]);

  assert.match(css, /Noto Sans Thai/);
  assert.match(css, /--font-meaw:\s*"Noto Sans Thai"/);
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
  assert.match(css, /@view-transition/);
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
