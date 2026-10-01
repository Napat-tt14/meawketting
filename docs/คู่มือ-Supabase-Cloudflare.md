# คู่มือ Supabase และ Cloudflare สำหรับเจ้าของโปรเจกต์

อัปเดต 1 ตุลาคม 2026 — เชื่อม Supabase กับ Worker เว็บจริง `meawketting` บน <https://meawketting.com> และทดสอบ Google/LINE Login จริงแล้ว

**ผลตรวจล่าสุด:** Cloudflare build `4cebcba2-e820-4fe2-a318-9a804ce7586f` ของ commit `356d67e` build/deploy สำเร็จ พร้อม binding Hyperdrive และทดสอบ Google กับ LINE Login บนเว็บจริงผ่านทั้งสองรายการ: กลับจากผู้ให้บริการผ่าน Supabase และเปิดแบบฟอร์มข้อมูลร้านที่ `/business/register` ได้ ปัญหา PostgreSQL CA ที่ทำให้ callback เด้งกลับ Login แก้แล้ว บัญชีที่ทดสอบยังไม่ผูกกับร้าน จึงยังไม่ได้สร้างร้านหรือทดสอบเข้า dashboard ของร้านจริง LINE Channel ยังเป็น **Developing** ใช้ได้เฉพาะ Admin/Tester

แนวทางแก้: Cloudflare Hyperdrive ใช้บัญชี `meawketting_production`, ใบรับรองสาธารณะ `scripts/certs/supabase-prod-ca-2021.crt`, SSL mode `verify-full`, ปิด query cache และผูก `HYPERDRIVE` กับ Worker โค้ดจะใช้ connectionString จาก binding แทน `DATABASE_URL` การเชื่อมจาก Hyperdrive ไป Supabase ตรวจ TLS ที่ Hyperdrive; socket ภายในจาก Worker ไป binding จัดการโดย Cloudflare ไม่ปิด TLS ของฐานข้อมูลโดยตรง อ้างอิง [Hyperdrive SSL certificates](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/), [Postgres.js configuration](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/)

ตรวจ production build, typecheck และ production tests 7/7 ผ่าน โค้ด runtime/Auth/registration ผ่านชุดทดสอบ PostgreSQL แยก 16/16 ก่อน deploy ไฟล์ชั่วคราวที่ใช้ส่งรหัสให้ Cloudflare ถูกลบแล้ว ไม่เก็บรหัสใน Git

Hyperdrive ID `ce743e399bc94e67a5b525a679f556bf` อยู่ใน `vite.config.ts` เฉพาะ production build; origin คือ `db.mgieoxfeqvcklhzxqnnl.supabase.co:5432`, database `postgres`, user `meawketting_production` และ CA ID `f8416f6b-5bf7-4d02-81ac-3d1ccf817af2` รหัสจริงเก็บใน Cloudflare เท่านั้น หากเปลี่ยนรหัส ให้เข้า **Storage & databases → Hyperdrive → meawketting-production** แล้วแก้ origin credentials พร้อม Secret `DATABASE_URL` ใน Worker ให้ตรงกัน

## Google และ LINE Login บนเว็บจริง

- Cloudflare → **Workers & Pages** → **meawketting** → **Settings** → **Variables and Secrets**: ใช้ Secrets `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` อย่าใส่รหัสจริงใน Git
- `DATABASE_URL` เว็บจริงใช้บัญชี `meawketting_production` ผ่าน transaction pooler พอร์ต `6543` บัญชีนี้รับสิทธิ์แอปจาก `meawketting_runtime` แต่มีรหัสแยกจากเว็บทดลอง ไม่มีสิทธิ์ผู้ดูแล/สร้างฐานข้อมูล/สร้าง role/ข้าม RLS และอ่าน migration ledger ไม่ได้
- ค่าที่ไม่ใช่รหัสลับอยู่ใน `vite.config.ts`: Auth mode `supabase`, environment `production`, fixtures `off`, origin `https://meawketting.com` และ binding `API_RATE_LIMITER` การ push `main` จะ build และ deploy อัตโนมัติผ่าน Cloudflare
- Supabase → **Authentication** → **Sign In / Providers**: Google ใช้ Google Client ID/Secret ส่วน `custom:line` ใช้ LINE Channel ID/Secret รหัสของผู้ให้บริการอยู่ใน Supabase ไม่ต้องใส่ Google/LINE Client Secret ใน Worker
- Google Cloud → OAuth Web client → **Authorized redirect URIs** และ LINE Developers → **Meawketting Business** → **LINE Login** → **Callback URL** ใช้ `https://mgieoxfeqvcklhzxqnnl.supabase.co/auth/v1/callback` เหมือนกัน
- Supabase → **Authentication** → **URL Configuration**: Site URL `https://meawketting.com`, Redirect URL `https://meawketting.com/api/auth/google/callback` ทั้ง Google และ LINE ใช้ callback ของแอปเส้นทางเดียวกัน
- LINE ใช้ scopes `openid profile` และอนุญาตบัญชีไม่มีอีเมลใน Supabase หาก Channel ยังเป็น **Developing** จะล็อกอินได้เฉพาะ Admin/Tester; การเปิดให้ทุกคนใช้ต้อง Publish Channel หลังตรวจ flow เสร็จ
- เปิด `/business/login` แล้วกดผู้ให้บริการ บัญชีใหม่ไป `/business/register` เพื่อยืนยันข้อมูลร้าน บัญชีที่ผูกกับร้านและมีสิทธิ์แล้วไป `/business/home` การล็อกอินเพียงอย่างเดียวยังไม่สร้างร้าน

หากเปลี่ยนโดเมน ให้แก้ origin ใน `vite.config.ts` และ Redirect URL ใน Supabase แล้ว push `main` หากหมุนรหัสบัญชี `meawketting_production` ให้ผู้ดูแลแก้รหัส role ในฐานข้อมูล, Secret `DATABASE_URL` ของ Worker `meawketting` และรหัส origin connection ของ Hyperdrive ให้ตรงกันเมื่อผูก Hyperdrive แล้ว การเปลี่ยนรหัสหลัก `postgres` หรือรหัสเว็บทดลองไม่เปลี่ยนรหัสเว็บจริงโดยอัตโนมัติ

การอัปโหลดสื่อเป็นการตั้งค่าแยกจาก Login และต้องมี `SUPABASE_SERVICE_ROLE_KEY` ใน Worker ด้วย ส่วน LINE Official Account/Messaging API ไม่ใช่ LINE Login

## บันทึกการตั้งค่าฐานข้อมูลและเว็บทดลอง ณ 27 กันยายน 2026

- รัน migration ฐานข้อมูล 4 ไฟล์แล้ว มีตารางแอป, ระบบเชื่อมผู้ใช้, ข้อมูลสื่อ และการสมัครร้าน
- สร้างบัญชีฐานข้อมูล `meawketting_runtime` สำหรับ Worker พร้อมสิทธิ์เฉพาะตารางแอปและ RLS policy สำหรับบัญชีนี้ Worker ไม่ใช้รหัส `postgres`
- ตั้ง `business-media` เป็น private bucket
- Deploy Worker ทดลองและใส่ Secrets 4 ตัวแล้ว: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- ทดสอบ Google Login จริงบน `http://localhost:3000` แล้ว: กลับจาก Google ผ่าน Supabase เข้า callback ของเว็บ และเปิดแบบฟอร์มสมัครร้านสำหรับบัญชีใหม่ได้
- Worker ทดลองยังไม่ยืนยันว่าจบ flow ได้เหมือน local; อย่าใช้ผลทดสอบ local เป็นหลักฐานว่าเว็บที่ deploy ผ่านแล้ว และยังไม่ได้ Push โค้ดล่าสุดขึ้น Git
- ตรวจ migration ซ้ำแล้วโดยไม่พบไฟล์ค้าง: public มีตารางแอป 68 ตารางและ RLS 69 ตาราง; `meawketting_runtime` อ่านตารางแอปได้ แต่ไม่มีสิทธิ์ผู้ดูแลและอ่าน migration ledger ไม่ได้
- Backend tests ผ่าน 85/85 และ API smoke ผ่าน 41 requests บน PostgreSQL ทดสอบแยก; การทดสอบเหล่านี้ไม่เพิ่มข้อมูลตัวอย่างใน Supabase จริง
- Supabase จริงยังไม่มีข้อมูลร้าน บุคคล หรือการจอง และบัญชี Google ยังไม่ผูกกับร้าน เมื่อกรอกและยืนยันหน้าสมัคร ระบบจึงจะสร้างร้าน/สาขาแรก แล้วจึงตั้งค่าบริการ เวลาเปิด ทีม และเริ่มจองได้

**ไม่ต้องพิมพ์ `db push` ตอนนี้** และอย่ารัน `db:seed:test` กับฐานข้อมูลนี้

ไฟล์ `wrangler.pilot.json` คือการตั้งค่า Worker ทดลองที่เครื่องนี้ใช้ deploy จริง จึงยังต้องเก็บไว้ แต่ถูก `.gitignore` ไม่ให้ขึ้น Git; ไฟล์ตัวอย่างที่ขึ้น Git คือ `wrangler.pilot.example.json` หากย้ายเครื่อง ให้คัดลอกไฟล์ตัวอย่างเป็น `wrangler.pilot.json` แล้วให้ผู้ดูแลใส่ชื่อ Worker และ URL ของเครื่องปลายทางให้ถูกก่อน deploy

## ทดลอง Google Login บนเครื่อง

ไฟล์ `.dev.vars` (ถูก `.gitignore`) เก็บค่าที่เว็บ local ใช้ ได้แก่ `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MEAWKETTING_PUBLIC_ORIGIN=http://localhost:3000` และ `MEAWKETTING_ENV=local` ตรวจและแก้ไฟล์นี้เมื่อหมุนรหัสฐานข้อมูลหรือ API key อย่าใส่ค่าจริงใน Git หรือไฟล์ตัวอย่าง

เปิด Terminal ที่ `F:\Meawketting` แล้วพิมพ์:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-supabase-local.ps1
```

เปิด <http://localhost:3000/business/login> แล้วกด Google บัญชีใหม่ที่ยังไม่ผูกกับร้านจะไปหน้า `business/register` โดย **ยังไม่สร้างร้านจนกว่าจะกรอกและยืนยันแบบฟอร์ม** ถ้าต้องการหยุดเว็บ กด `Ctrl+C` ใน Terminal เดิม Supabase อนุญาต callback `http://localhost:3000/api/auth/google/callback` ไว้แล้ว; Google Cloud ต้องมี callback ของ Supabase ตามหัวข้อ Google ด้านล่าง

## หากเปลี่ยนรหัสฐานข้อมูลหลัก

1. เข้า [Supabase Dashboard](https://supabase.com/dashboard/project/mgieoxfeqvcklhzxqnnl) → **Project Settings** → **Database** → **Reset database password** แล้วตั้งรหัสใหม่
2. Worker ใช้ `meawketting_runtime` คนละรหัส จึงไม่ต้องแก้ `DATABASE_URL` ใน Cloudflare เพียงเพราะเปลี่ยนรหัสหลัก แต่ local ตอนนี้ใช้รหัสหลักใน `.dev.vars`; ให้แก้ `DATABASE_URL` ในไฟล์นั้นด้วย
3. หากมี migration ใหม่ ให้เปิด Terminal ที่ `F:\Meawketting` แล้วพิมพ์ `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-supabase-migrations.ps1` สคริปต์จะถามรหัสใหม่แบบซ่อนตัวอักษร

## หากเปลี่ยน Supabase API key

1. เข้า Supabase → **Project Settings** → **API Keys** สร้าง/หมุน key ที่ต้องการ
2. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **meawketting-pilot** → **Settings** → **Variables and Secrets** → แก้ค่าแบบ **Secret** → **Deploy**
3. ถ้าเปลี่ยน **Secret key** (`sb_secret_...`) ให้แก้ตัวแปร Cloudflare ชื่อ `SUPABASE_SERVICE_ROLE_KEY` ถ้าเปลี่ยน **Publishable key** (`sb_publishable_...`) ให้แก้ `SUPABASE_PUBLISHABLE_KEY` ด้วย
4. หากเปลี่ยน Publishable key ต้องแก้ค่า `$publishableKey` ใน [สคริปต์ deploy](../scripts/deploy-supabase-pilot.ps1) ด้วย เพื่อไม่ให้ deploy ครั้งถัดไปใส่ key เก่ากลับเข้าไป

`SUPABASE_URL` คือ URL ของโปรเจกต์ ไม่ใช่รหัสผ่าน เปลี่ยนเฉพาะเมื่อย้ายไปโปรเจกต์ Supabase ใหม่ ซึ่งต้องวางแผนย้ายฐานข้อมูลและตั้งค่า Auth ใหม่ด้วย

## หากต้องหมุนรหัสบัญชีฐานข้อมูลที่ Worker ใช้ หรือ deploy ใหม่ทั้งชุด

ที่ Terminal ใน `F:\Meawketting` พิมพ์:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-supabase-pilot.ps1
```

ตอบรหัสฐานข้อมูลหลัก และ Secret key ของ Supabase ตาม prompt ที่ซ่อนตัวอักษร สคริปต์จะตั้งค่า bucket, หมุนรหัส `meawketting_runtime`, ตรวจการเชื่อมต่อ, build และ deploy Worker ทดลองพร้อม Secrets ใหม่ รหัสที่สร้างให้ Worker ไม่ถูกบันทึกในไฟล์โปรเจกต์ หาก pooler ยังจำรหัสเก่า สคริปต์จะรอลองใหม่ชั่วคราว

## หากเปลี่ยน Google Login หรือโดเมน

1. Supabase → **Authentication** → **Sign In / Providers** → **Google**: ใส่ Google Client ID และ Client Secret
2. ใน [Google Cloud Console](https://console.cloud.google.com/auth/clients) → **Google Auth Platform** → **Clients** → เลือก OAuth Web client → **Authorized redirect URIs**: ใช้ `https://mgieoxfeqvcklhzxqnnl.supabase.co/auth/v1/callback` (นี่คือ callback ของ Google ไป Supabase)
3. Supabase → **Authentication** → **URL Configuration**: คง **Site URL** ของเว็บจริงเป็น `https://meawketting.com` และใส่ `https://meawketting-pilot.ane049116049.workers.dev/api/auth/google/callback` ใน **Redirect URLs** (นี่คือ callback ของ Supabase กลับ Worker ทดลอง)
4. หากเปลี่ยนโดเมนทดลอง ให้แก้ `MEAWKETTING_PUBLIC_ORIGIN` ใน `wrangler.pilot.json`, เปลี่ยน Redirect URL ใน Supabase ให้ตรง และ deploy ใหม่
5. เปิด `/business/login` บนโดเมนทดลอง กด Google แล้วตรวจว่ากลับเข้าหน้าเว็บได้ หาก Google OAuth app อยู่ในโหมด Testing บัญชีที่จะลองต้องอยู่ในรายชื่อ Test users ของ Google

คู่มืออ้างอิง: [Supabase Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase reset database password](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB), [Cloudflare Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
