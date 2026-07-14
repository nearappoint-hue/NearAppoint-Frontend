# Database

## Just run this

**`SCHEMA.sql`** — the whole database, one file, top to bottom.

Supabase → **SQL Editor** → **New query** → paste the entire file → **Run**.

That is the complete setup. There is nothing else.

Then run the **verification queries at the bottom of the file (§17)**. If any
of them returns the wrong number, stop.

The most important one:

```sql
select conname from pg_constraint
where conname in ('no_staff_double_booking','no_resource_double_booking');
```

**Must return 2 rows.** If it returns 0, two customers can book the same
stylist at the same time, and everything else here is decoration.

---

## `migrations-split/`

The same schema, split into 8 numbered files. These exist for local development
(`supabase db reset`) and for the CI test job. **You do not need to run them** —
`SCHEMA.sql` already contains everything they do, in the right order, with the
conflicts between them resolved.

## `tests/`

Four pgTAP suites. All four block a merge in CI.

| Test | Asserts |
|---|---|
| `001_no_double_booking` | The database refuses a second booking on the same stylist at the same time |
| `002_tenant_isolation` | Salon A cannot read one row of Salon B's customers |
| `003_safety_gates` | Botox/fillers/PRP stay disabled; an unverified clinic cannot be listed |
| `004_entitlements` | Trial is 30 days; multi-branch is refused without Enterprise |
