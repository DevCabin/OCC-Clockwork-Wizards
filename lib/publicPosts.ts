export const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const BAD_POST_PATTERNS = [
  /wp-global-styles/i,
  /\bcustom styles\b/i,
  /\bversion\s*:?\s*2\b/i,
  /var:preset/i,
  /\bis-layout\b/i,
  /\bwp-block\b/i,
  /\btheme-json\b/i,
] as const;

export function isAuthorizedCronRequest(authHeader: string | null, secret?: string): boolean {
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export function isVisiblePostStatus(status: string | null | undefined): boolean {
  return status === "published" || status === "ready";
}

export function isScheduledForPublicView(scheduledFor: string | null | undefined): boolean {
  if (!scheduledFor) return true;

  const scheduledTime = Date.parse(scheduledFor);
  if (!Number.isFinite(scheduledTime)) return true;

  return scheduledTime <= Date.now();
}

export function matchesBadPostPattern(post: {
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  body_md?: string | null;
}): boolean {
  const searchable = [
    post.title ?? "",
    post.slug ?? "",
    post.excerpt ?? "",
    post.body_md ?? "",
  ].join(" ");

  return BAD_POST_PATTERNS.some((pattern) => pattern.test(searchable));
}
