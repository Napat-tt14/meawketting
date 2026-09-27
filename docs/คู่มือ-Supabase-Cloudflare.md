# คู่มือ Supabase และ Cloudflare สำหรับเจ้าของโปรเจกต์

อัปเดต 27 กันยายน 2026 — โปรเจกต์ Supabase `mgieoxfeqvcklhzxqnnl` และ Worker ทดลอง `meawketting-pilot` ใช้งานอยู่ที่ <https://meawketting-pilot.ane049116049.workers.dev> ส่วน Worker เว็บจริงและโดเมน `meawketting.com` ไม่ได้เปลี่ยนในการตั้งค่าครั้งนี้

## ตอนนี้ตั้งค่าอะไรแล้ว

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
