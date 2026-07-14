# Environment variables

## Vercel — Settings → Environment Variables

Tick **Production + Preview + Development** on every one.
Then **Redeploy** — env changes do not apply to an existing build.

### Client (8 vars total) — shipped to the browser

| Name | Value | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` | Supabase → Settings → API → **anon public** |
| `NEXT_PUBLIC_SITE_URL` | `https://www.nearappoint.com` | your domain |

### Server — never leaves the server

| Name | Value | Where to get it |
|---|---|---|
| `SUPABASE_URL` | same as above | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | same as above | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` | Supabase → Settings → API → **service_role secret** |
| `BOOKING_FEE_PKR` | `150` | your decision |
| `CRON_SECRET` | any 32+ random chars | make one up. `openssl rand -hex 32` |

**That's the 8 you need to deploy.** Everything below is for later features.

---

## ⚠️ The one that can end you

`SUPABASE_SERVICE_ROLE_KEY` **bypasses row-level security completely.**

If it ever gets a `NEXT_PUBLIC_` prefix, it is shipped to every visitor's
browser, and anyone can download every salon's customer list — thousands of
women's names, phone numbers, and the times they'll be at a known address.

**There is no `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. There never will be.**
CI fails the build if one appears.

---

## Later (not needed to deploy today)

| Name | When | Why |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | **Before Feature 3** | Rate limiting. Without it the OTP endpoint is unprotected, and every abuse is an SMS you pay for. Free tier is enough. |
| `UPSTASH_REDIS_REST_TOKEN` | Before Feature 3 | ↑ |
| `WHATSAPP_PHONE_NUMBER_ID` | Feature 3 | **Apply NOW — 5–10 business day approval, on the critical path.** |
| `WHATSAPP_ACCESS_TOKEN` | Feature 3 | ↑ |
| `SAFEPAY_API_KEY` | Phase 2 | You already have this from Muddarris. New merchant account for NearAppoint. |
| `SAFEPAY_SECRET_KEY` | Phase 2 | ↑ |
| `SAFEPAY_WEBHOOK_SECRET` | Phase 2 | ↑ |

---

# GitHub — Settings → Secrets and variables → Actions

Needed for the backup and drift-detection workflows.

| Secret | Value | Where |
|---|---|---|
| `SUPABASE_DB_URL` | `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres` | Supabase → Settings → Database → **Connection string** → **URI**. Use the **Session pooler** (port 5432), not the transaction pooler — `pg_dump` needs a session. |
| `BACKUP_ENCRYPTION_KEY` | any long random passphrase | Make one up. **Store it somewhere that is not GitHub.** If you lose it, every backup is permanently unreadable. |

---

# Verify

```
https://your-app.vercel.app/api/health
```

```json
{
  "ok": true,
  "checks": {
    "env": { "ok": true },
    "database": { "ok": true },
    "double_booking_guard": { "ok": true }
  }
}
```

**If `double_booking_guard` is false, stop.** The app cannot see the exclusion
constraints, which means two customers can book the same slot.
