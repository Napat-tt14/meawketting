import { createClient } from "@supabase/supabase-js";
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key || new URL(url).protocol !== "https:") throw Error("SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY are required.");
const bucket = "business-media", options = { public: false, fileSizeLimit: 10485760, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] };
const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
const existing = await storage.getBucket(bucket);
const result = existing.data ? await storage.updateBucket(bucket, options) : await storage.createBucket(bucket, options);
if (result.error) throw Error("Private bucket provisioning failed. Check project configuration and server key.");
console.log("Private business-media bucket configured; no browser storage policies are installed.");
