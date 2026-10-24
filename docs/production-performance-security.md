# Production performance and security

## Vercel runtime

Vercel manages function provisioning and scaling. `vercel.json` pins server
functions to `arn1` (Stockholm), near Turso's `eu-north-1` database region.
Static assets and cacheable responses continue to use Vercel's distributed
edge network; the application does not create replicas or split database data.

## Caching and Turso queries

- Public catalogue and review responses use shared-cache headers with
  stale-while-revalidate.
- Product, article, category, and source repositories retain their existing ISR
  and Next.js Data Cache windows. Mutations continue to invalidate the
  corresponding tags.
- Turso has expression indexes for commonly filtered and sorted JSON fields.
  The adapter uses fixed SQL expressions for these allow-listed fields and
  parameterized JSON paths and values for other fields.
- No additional database, cache vendor, or paid observability service is used.

## Request protection

- Configure `IP_HASH_SALT` as a private environment variable in every Vercel
  environment; use a random value of at least 32 characters and never expose it
  with a `NEXT_PUBLIC_` prefix.
- Public write endpoints, sign-in, product lookup, image-upload signing,
  outbound click tracking, and admin product-purge requests/confirmations use
  hashed-IP limits. When Turso is selected, limits are atomic and shared
  between serverless instances; storage failures fail closed and return `503`
  rather than silently bypassing protection.
- Raw IPs are not stored in the rate-limit table. Expired buckets are removed
  during writes. Denials and storage errors are emitted as structured Vercel
  runtime log events without logging tokens or request bodies.
- Vercel BotID Basic is checked on sign-in and selected write/lookup routes.
  Only verified bots are rejected; read-only pages and search-engine crawling
  are not challenged. Deep Analysis is intentionally not enabled.
- Existing authentication, admin-role checks, CSRF verification, validation,
  and security headers remain in place.

Vercel's managed edge DDoS protection is provided by the platform. Firewall/WAF
rules are account-level settings rather than repository configuration; review
and enable suitable managed rules in the Vercel project dashboard, starting in
monitor/log mode and avoiding broad challenges on localized pages, static
assets, and public GET APIs. Plan availability is controlled by Vercel.

## Images and costs

The project keeps `next/image` unoptimized to avoid Vercel image-transformation
usage. Existing product image URLs remain on their current sources/CDNs; no
third-party images are bulk-copied or transformed. The account has no local
Cloudinary configuration, so durable image transformation/storage is deferred
until an existing storage plan and permitted image sources are confirmed.
Static site images already stored in `public/` continue to be served through
Vercel's CDN.

## Operational checks

- Review Vercel function logs for `rate_limit_block`,
  `rate_limit_store_misconfigured`, and `rate_limit_storage_error`.
- Review Vercel Firewall and deployment dashboards for managed DDoS/WAF events,
  function duration, and request volume.
- Use a staging deployment for load tests. Do not run unbounded load tests
  against production or raise database request limits without checking the
  Turso quota first.
- BotID Basic is free on supported Vercel plans. Do not enable paid Deep
  Analysis without explicit approval.
