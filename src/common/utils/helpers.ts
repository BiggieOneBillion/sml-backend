import { v4 as uuidv4 } from 'uuid';

// ── PII Masking ───────────────────────────────────────────────────────────────
/**
 * Mask an email for logging purposes.
 * "adebayo@gmail.com" → "a***@gmail.com"
 * Never log full emails — GDPR + data minimisation.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * Mask a phone number for logging.
 * "+2348012345678" → "+234***5678"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

// ── Slug Generation ───────────────────────────────────────────────────────────
/**
 * Generate a URL-safe slug from a title.
 * "EcoPlate Solutions!" → "ecoplate-solutions-a1b2c3"
 *
 * The random suffix prevents collisions when two ideas have the same title.
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .slice(0, 50);                   // max 50 chars for the base

  const suffix = uuidv4().split('-')[0]; // 8-char random suffix
  return `${base}-${suffix}`;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PrismaPageParams {
  skip: number;
  take: number;
}

/**
 * Convert page/limit to Prisma skip/take.
 */
export function toPrismaPage({ page, limit }: PaginationParams): PrismaPageParams {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100); // cap at 100
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

// ── Decimal / Money ───────────────────────────────────────────────────────────
/**
 * Convert a Prisma Decimal to a number for API responses.
 * Prisma returns Decimal objects; JSON.stringify needs them as numbers.
 *
 * NOTE: This is safe for display only. Never use floating-point numbers
 * for financial calculations — always use the Decimal type.
 */
export function decimalToNumber(value: { toNumber(): number } | null | undefined): number {
  return value?.toNumber() ?? 0;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

// ── Idempotency ───────────────────────────────────────────────────────────────
/**
 * Generate a deterministic idempotency key for investment transactions.
 * Same investor + same idea + same timestamp bucket → same key.
 * This prevents double-charge if the client retries within the same minute.
 */
export function generateIdempotencyKey(investorId: string, ideaId: string): string {
  const bucket = Math.floor(Date.now() / 60_000); // 1-minute bucket
  return `inv-${investorId}-${ideaId}-${bucket}`;
}
