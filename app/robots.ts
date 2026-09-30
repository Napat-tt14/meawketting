import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/business/", "/my-pets", "/create-passport", "/activity", "/passports", "/qr-preview", "/temporary-access/", "/safety/"] },
    sitemap: "https://meawketting.com/sitemap.xml",
  };
}
