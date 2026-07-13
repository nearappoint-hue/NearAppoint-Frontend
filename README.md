# NearAppoint — landing + auth

Static. No build step. Deploy as-is.

## Files
```
index.html    landing page (salon-focused)
login.html    sign in — phone + WhatsApp/SMS OTP
verify.html   OTP entry (6 boxes, paste, resend, SMS fallback)
signup.html   salon signup
styles.css    shared brand tokens + components

assets/logo-mark.svg       the mark, for light backgrounds
assets/logo-mark-dark.svg  the mark, for dark backgrounds (footer)
assets/favicon.svg         tight crop, no shadow
assets/logo-lockup.svg     horizontal mark + wordmark, for social/email/print
```

## About the logo
Redrawn as vector geometry — 2KB, sharp at any size, transparent clock face and
badge gap so it sits on any background.

The **site** uses `logo-mark.svg` plus live HTML text for "NearAppoint", so the
wordmark renders in Bricolage Grotesque (the real display face) rather than
being baked into the SVG. Change the wordmark in the HTML, not the SVG.

`logo-lockup.svg` is the standalone version for anywhere you can't use HTML —
social cards, email signatures, print. It falls back to a system geometric face
if Bricolage isn't installed on the viewer's machine.

**Dark backgrounds:** use `logo-mark-dark.svg`. The clock face is filled and the
badge inverts, because the standard mark's navy hands disappear on navy.

## Deploy
```bash
npx vercel --prod
```
Then point nearappoint.com at it in the Vercel dashboard.

## ⚠️ READ THIS BEFORE YOU GO LIVE

The landing page currently carries the numbers and testimonials from the Figma
design: 2,400+ businesses, 85,000+ customers, 320,000+ appointments, 18 cities,
and six named customer testimonials.

**None of that is true yet.** Publishing invented stats and invented customer
quotes with real-sounding names is false advertising, and it is the kind of thing
that gets screenshotted.

Two fixes, both easy:

1. **The stats** live in one place — the `STATS` object at the top of the
   `<script>` in `index.html`. Change them there and every instance updates.
2. **The testimonials** are hardcoded in the Testimonials section. Delete them,
   or replace them with real quotes you have permission to use.

Honest early-stage copy converts better than fake social proof anyway:
*"Launching in Lahore. Free for our first 20 salons."*

## Before you send any traffic
The forms currently only confirm in the UI. Wire these up:

- `index.html`  → salon early-access form + customer waitlist
- `login.html`  → POST /auth/otp/request
- `verify.html` → POST /auth/otp/verify  (currently ALWAYS fails, on purpose, so you can see the error state)
- `signup.html` → POST /auth/otp/request, create business only AFTER verify

Quickest path: a Supabase table + `supabase-js`, or Formspree for a day-one hack.

## Rate limits (do this server-side, day one)
OTP request is the most abusable endpoint you will ever ship. Every abuse costs
you money in SMS. **3 per hour per number, 10 per hour per IP, 5 verify attempts
per code then burn it.**
