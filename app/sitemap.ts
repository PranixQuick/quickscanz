import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://quickscanz.com";

  const urls: MetadataRoute.Sitemap = [
    { url: base,                           lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/about`,                lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/how-it-works`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy-policy`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Dynamically add individual product pages (non-demo only).
  // Graceful fallback: if DB is unreachable, static URLs are still returned.
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: products } = await sb
      .from("products")
      .select("id, updated_at")
      .eq("is_demo", false)
      .limit(5000);

    for (const p of products ?? []) {
      urls.push({
        url: `${base}/products/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // DB unreachable — static URLs still returned above
  }

  return urls;
}
