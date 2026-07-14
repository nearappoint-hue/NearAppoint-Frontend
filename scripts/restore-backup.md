# Restoring a backup

Read this **now**, while nothing is wrong. Do not read it for the first time
at 11pm on a Saturday with a salon owner on the phone.

---

## 1. Get the backup

GitHub → **Actions** → **Database Backup** → pick a run → download the artifact.

You get:
```
full.dump.gpg     schema + data, encrypted
schema.sql.gpg    structure only, encrypted
CHECKSUMS.txt
```

## 2. Verify it wasn't tampered with

```bash
sha256sum -c CHECKSUMS.txt
```

## 3. Decrypt

```bash
gpg --decrypt --output full.dump full.dump.gpg
# passphrase = BACKUP_ENCRYPTION_KEY
```

## 4. RESTORE TO A NEW PROJECT FIRST. NOT OVER PRODUCTION.

**Never restore straight over a live database.** If the backup turns out to be
older or more broken than you thought, you have now destroyed the only good
copy — the live one.

Create a fresh Supabase project. Restore into that. Look at it. *Then* decide.

```bash
pg_restore \
  --dbname="postgresql://postgres:[PASSWORD]@db.[NEW-PROJECT].supabase.co:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  full.dump
```

## 5. Check the thing that matters

```sql
select conname from pg_constraint
 where conname in ('no_staff_double_booking','no_resource_double_booking')
   and contype = 'x';
```

**Must return 2 rows.**

If it returns 0, this restore has silently removed the only guarantee the
product makes. Two customers can now book the same stylist at the same time,
and nothing will tell you — until it happens, on a Saturday, in front of a
customer.

The backup workflow already tests this on every run. Test it again anyway.
It costs you ten seconds.

---

## What the backup does NOT cover

`pg_dump` gets the `public` schema. It does **not** get:

| Not backed up | What that means |
|---|---|
| **`auth.users`** | Supabase manages this. A restore gives you appointments that reference users who no longer exist. |
| **Storage buckets** | Gallery photos, CNIC scans, verification documents. Gone. |
| **Edge Functions, secrets, RLS-adjacent config** | Re-apply by hand. |

So this is a **data backup, not a disaster-recovery plan.**

For real DR: turn on **Supabase's own PITR** (Point-In-Time Recovery — a paid
add-on). It covers `auth`, storage and the whole cluster, and it can roll back
to any second, not just to last night.

**This workflow is your cheap daily safety net and your schema-drift detector.
PITR is your actual insurance.** Get PITR before you have paying customers.
