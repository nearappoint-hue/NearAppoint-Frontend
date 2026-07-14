# vercel.json — why your deploys were failing

## What broke

The old `vercel.json` declared THREE cron jobs:

```
/api/cron/expire-holds     ✓ exists
/api/cron/mark-no-shows    ✗ DOES NOT EXIST
/api/cron/send-reminders   ✗ DOES NOT EXIST
```

Vercel refuses to deploy when `crons` points at a route that isn't there:

> The pattern `/api/cron/mark-no-shows` defined in `crons` doesn't match any
> Serverless Function.

**No production deployment → nearappoint.com has nothing to serve → 404.**

That's why the landing page was live before and isn't now. `vercel.json` didn't
exist then. I added it, and it killed every deploy since. My mistake — I wrote
the config for routes I hadn't built yet.

## Second problem

The old schedules were `* * * * *` — every minute.

**Vercel's Hobby plan allows one cron invocation per day.** Anything more
frequent is rejected. So even with the right paths, it still wouldn't deploy.

## What this file does now

One cron. One route — the one that actually exists. Once a day, at 03:00 UTC
(08:00 PKT — salons are closed).

## Why daily is fine

`expire-holds` releases `pending_payment` appointments whose 10-minute window
elapsed.

It is DELIBERATELY not load-bearing. Availability queries also filter on
`hold_expires_at`, so slots still show correctly as free whether or not this
cron has run. A dead cron leaves tidy-up undone; it does NOT corrupt anything.

(That was a Muddarris lesson: a cron that is load-bearing for correctness is a
cron that will eventually cost you a Saturday.)

Right now there are no bookings at all, so this cron does nothing either way.

## Honestly, you could just delete this file

You don't need cron until Feature 4. Deleting `vercel.json` is a perfectly good
fix and removes a thing that can break your deploys for zero current benefit.

I'm giving you the working version instead of no version because you'll want it
soon, and because a file that exists and works is easier to reason about than a
file you deleted and forgot about.

## When Feature 4 adds the other crons

Add them back here at the same time you add the routes — never before:

```json
{ "path": "/api/cron/mark-no-shows",  "schedule": "*/5 * * * *" },
{ "path": "/api/cron/send-reminders", "schedule": "*/10 * * * *" }
```

Those frequencies need **Vercel Pro**. On Hobby they will fail the deploy again.
