import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Everything outside the landing page needs sign-in (and redirects to it), so only the API is off limits. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
