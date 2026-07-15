import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How NearAppoint collects, uses, and protects your information — the phone number, name, and booking details you share when you use the app.',
};

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          NearAppoint is an appointment booking marketplace and business operating system for
          Pakistan, operated by <strong>Axiom Fintech Solutions</strong>, based in Lahore. In this
          policy, &ldquo;we&rdquo; and &ldquo;NearAppoint&rdquo; mean that company, and
          &ldquo;you&rdquo; means anyone who uses the app — whether you&apos;re a customer booking an
          appointment or a business running its calendar with us.
        </p>
        <p>
          This is written in plain language on purpose. If anything here is unclear, ask us rather
          than guess.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <h3>If you&apos;re a customer</h3>
        <ul>
          <li>Your name and phone number, so a business can recognise your booking.</li>
          <li>
            Your email address, if you sign in with Google — we use it to identify your account and
            send booking confirmations.
          </li>
          <li>
            Your booking history: which business you booked, the service, the date and time, and any
            review you choose to leave.
          </li>
        </ul>
        <h3>If you&apos;re a business</h3>
        <ul>
          <li>
            Your business name, category, address, working hours, services, prices, and staff you
            add.
          </li>
          <li>Your login email and the account details of the person who signs up.</li>
          <li>
            For aesthetic clinics only: your medical registration number, which we verify before your
            listing can appear in search.
          </li>
          <li>Your subscription and billing records.</li>
        </ul>
        <h3>Automatically</h3>
        <p>
          Basic technical information every website receives — your device type, browser, and a
          session cookie that keeps you signed in. We do not run third-party advertising trackers.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use your information',
    body: (
      <>
        <p>We use what we collect only to run the service you asked for:</p>
        <ul>
          <li>To create your account and keep you signed in.</li>
          <li>To let businesses see and manage the appointments you book with them.</li>
          <li>
            To send reminders and confirmations over WhatsApp, SMS, or email so you don&apos;t miss
            or forget an appointment.
          </li>
          <li>To show your reviews publicly on a business profile — without your phone number.</li>
          <li>To bill businesses for their subscription and keep the required records.</li>
          <li>To detect fraud, prevent abuse, and keep the platform safe.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information to anyone, and we do not use your
          data to target you with ads.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'When we share it',
    body: (
      <>
        <p>Your information is shared only in these situations:</p>
        <ul>
          <li>
            <strong>With the business you book.</strong> When you book an appointment, that business
            sees your name, phone number, and the service you booked — they need it to serve you.
          </li>
          <li>
            <strong>With the services that run NearAppoint.</strong> We use trusted providers to host
            data, send messages, and process payments (see the next section). They only handle your
            data to do their job for us.
          </li>
          <li>
            <strong>When the law requires it.</strong> If a valid legal request obliges us to
            disclose information, we comply — no more than necessary.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'processors',
    title: 'The services we rely on',
    body: (
      <>
        <p>NearAppoint is built on a small set of infrastructure providers:</p>
        <ul>
          <li>
            <strong>Supabase</strong> stores the database and files, hosted in the Singapore region
            for the lowest latency to Pakistan.
          </li>
          <li>
            <strong>Vercel</strong> serves the application.
          </li>
          <li>
            <strong>Meta (WhatsApp) and an SMS provider</strong> deliver your appointment reminders.
          </li>
          <li>
            <strong>A payment processor</strong> handles business subscription payments. We never see
            or store full card details.
          </li>
        </ul>
        <p>
          Because some of these providers operate outside Pakistan, your information may be processed
          abroad. We only work with providers that protect it to a comparable standard.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>
        We keep your information for as long as your account is active. If you close your account, we
        delete or anonymise your personal data within a reasonable period, except where we&apos;re
        required to keep certain records — for example, billing records a business needs for tax.
        Reviews you left may remain visible but detached from your identifying details.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>You can, at any time:</p>
        <ul>
          <li>Ask us what personal data we hold about you.</li>
          <li>Ask us to correct anything that&apos;s wrong.</li>
          <li>Ask us to delete your account and data.</li>
          <li>Withdraw consent to reminders (though you may then miss appointment updates).</li>
        </ul>
        <p>
          Email <a href="mailto:privacy@nearappoint.com">privacy@nearappoint.com</a> and we&apos;ll
          act on your request.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Keeping it safe',
    body: (
      <p>
        Access to the database is restricted to the server layer and protected by row-level security,
        so one business can never see another&apos;s data, and one customer can never see
        another&apos;s. No system is perfectly secure, but we treat your phone number and booking
        history as information worth protecting properly.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        NearAppoint is not intended for anyone under 18. We don&apos;t knowingly collect information
        from children. If you believe a child has given us their information, contact us and
        we&apos;ll remove it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change how we handle your information, we&apos;ll update this page and the date at the
        top. For significant changes, we&apos;ll tell you in the app.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="15 July 2026"
      lede="NearAppoint runs on trust. This page explains, in plain terms, exactly what information we collect, why, who sees it, and the control you have over it."
      sections={sections}
    />
  );
}
