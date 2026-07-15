import 'server-only';
import { z } from 'zod';

/**
 * SERVER-ONLY environment.
 *
 * These are NOT prefixed NEXT_PUBLIC_, so Next never ships them to the browser.
 * `import 'server-only'` means a client component importing this file is a
 * BUILD ERROR — the secrets cannot leak even by accident.
 *
 * Client-side env lives in src/config/env.ts. The two files are separate on
 * purpose: it should be physically awkward to put a secret in the wrong one.
 */
const schema = z.object({
  SUPABASE_URL:              z.string().url(),
  SUPABASE_ANON_KEY:         z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  /**
   * TRANSACTIONAL EMAIL (Resend).
   *
   * Optional in the schema — but without it a customer books and receives
   * NOTHING. She has to trust a screen she saw for two seconds and remember a
   * time she was told once. That is not a missing feature; it is a broken
   * booking. Set this before you show the product to anyone.
   */
  RESEND_API_KEY:            z.string().optional(),
  EMAIL_FROM:                z.string().optional(),

  SAFEPAY_API_KEY:           z.string().optional(),
  SAFEPAY_SECRET_KEY:        z.string().optional(),
  SAFEPAY_WEBHOOK_SECRET:    z.string().optional(),

  WHATSAPP_PHONE_NUMBER_ID:  z.string().optional(),
  WHATSAPP_ACCESS_TOKEN:     z.string().optional(),

  CRON_SECRET:               z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  UPSTASH_REDIS_REST_URL:    z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN:  z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const r = schema.safeParse(process.env);
    if (!r.success) {
      const missing = r.error.issues.map(i => `   x  ${String(i.path[0])} — ${i.message}`).join('\n');
      throw new Error(
        '\n\n  NEARAPPOINT: SERVER ENVIRONMENT IS NOT CONFIGURED\n' +
        '  ================================================\n\n' + missing + '\n\n' +
        '  Vercel -> Settings -> Environment Variables.\n' +
        '  These are SERVER vars — do NOT prefix them NEXT_PUBLIC_.\n' +
        '  Anything prefixed NEXT_PUBLIC_ is shipped to the browser, and\n' +
        '  SUPABASE_SERVICE_ROLE_KEY bypasses row-level security entirely.\n',
      );
    }
    cached = r.data;
  }
  return cached;
}

/** Non-throwing. For /api/health. */
export function serverEnvReport(): { ok: boolean; missing: string[] } {
  const r = schema.safeParse(process.env);
  return r.success
    ? { ok: true, missing: [] }
    : { ok: false, missing: r.error.issues.map(i => String(i.path[0])) };
}
