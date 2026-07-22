import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/account",
        "/api/",
        "/products/add",
        "/products/lifecycle",
        "/claim",
        "/compare",
        "/family",
        "/energy",
        "/iot-hub",
        "/smart-devices",
        "/buying-assistant",
        "/payment",
      ],
    },
    sitemap: "https://quickscanz.com/sitemap.xml",
  };
}
