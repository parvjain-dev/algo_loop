/**
 * The public address of the site, for the sitemap and link previews.
 * Set NEXT_PUBLIC_SITE_URL to override; on Vercel the production domain is used automatically.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
