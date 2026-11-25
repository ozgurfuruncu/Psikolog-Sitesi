import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow:
        process.env.REVIEW_MODE === "true" || process.env.PRODUCTION_LEGAL_APPROVED !== "true"
          ? "/"
          : ["/panel/", "/yonetim/", "/api/"],
    },
  };
}
