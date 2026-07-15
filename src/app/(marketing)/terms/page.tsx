import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The agreement between you and NearAppoint — how bookings work, what businesses and customers are responsible for, and the rules that keep the marketplace fair.',
};

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'The agreement',
    body: (
      <>
        <p>
          These terms are the agreement between you and <strong>Axiom Fintech Solutions</strong>{' '}
          (&ldquo;NearAppoint&rdquo;, &ldquo;we&rdquo;), which operates the NearAppoint app and
          website. By creating an account or booking through NearAppoint, you accept these terms.
        </p>
        <p>If you don&apos;t agree with them, please don&apos;t use the service.</p>
      </>
    ),
  },
  {
    id: 'what-we-do',
    title: 'What NearAppoint does — and doesn’t do',
    body: (
      <>
        <p>
          NearAppoint connects customers with local service businesses — salons, beauty parlours,
          nail studios, wellness centres, mehndi studios, and aesthetic clinics — and gives those
          businesses the tools to manage their appointments.
        </p>
        <p>
          We are the platform, not the service provider. The actual service you book — a haircut, a
          treatment, a session — is provided by the business, not by NearAppoint. We don&apos;t
          control the quality, pricing, or conduct of any business, and we&apos;re not a party to what
          happens at your appointment.
        </p>
      </>
    ),
  },
  {
    id: 'your-account',
    title: 'Your account',
    body: (
      <>
        <p>
          You&apos;re responsible for the accuracy of the details you give us and for what happens
          under your account. Customers sign in with Google; businesses sign in with an email and
          password. Keep your login secure and tell us if you think someone else has access.
        </p>
        <p>You must be at least 18 to use NearAppoint.</p>
      </>
    ),
  },
  {
    id: 'bookings',
    title: 'Bookings',
    body: (
      <>
        <p>
          When you book, you&apos;re asking a business to hold a time for you, and you&apos;re
          expected to show up. There is <strong>no booking fee</strong> — booking is free.
        </p>
        <p>
          To keep appointments reliable for everyone, NearAppoint keeps a reliability record based on
          whether customers attend the appointments they book. Repeatedly booking and not showing up
          may affect your ability to book ahead.
        </p>
        <p>
          Any payment for the actual service is made to the business directly, on their terms.
          NearAppoint does not collect that payment.
        </p>
      </>
    ),
  },
  {
    id: 'business-terms',
    title: 'If you run a business on NearAppoint',
    body: (
      <>
        <p>By listing your business, you agree that:</p>
        <ul>
          <li>The information you publish — services, prices, hours, staff — is accurate and yours to publish.</li>
          <li>You&apos;ll honour the appointments customers book, or give reasonable notice if you can&apos;t.</li>
          <li>You&apos;ll treat customers&apos; personal details as confidential and use them only to serve the booking.</li>
          <li>
            If you&apos;re an aesthetic clinic, you hold valid medical registration, which we verify
            before your listing goes live.
          </li>
          <li>You&apos;ll comply with the laws that apply to your trade in Pakistan.</li>
        </ul>
        <p>
          Your subscription, billing, and cancellation are covered by our{' '}
          <a href="/refunds">Refund &amp; Cancellation Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: 'reviews',
    title: 'Reviews and content',
    body: (
      <p>
        Customers can review businesses after an appointment. Reviews must be honest and about a real
        experience. We may remove content that is abusive, fake, unlawful, or violates someone&apos;s
        privacy. Your review appears publicly with your first name, never your phone number.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Don&apos;t use NearAppoint to:</p>
        <ul>
          <li>Post false, misleading, or fraudulent listings or reviews.</li>
          <li>Harass, threaten, or harm another user or business.</li>
          <li>Scrape, copy, or disrupt the platform, or try to break its security.</li>
          <li>Book appointments you have no intention of attending.</li>
        </ul>
        <p>We may suspend or remove any account that breaks these rules.</p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability of the service',
    body: (
      <p>
        We work to keep NearAppoint running reliably, but we can&apos;t promise it will always be
        available or error-free. We may update, change, or pause features as the product grows.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility',
    body: (
      <p>
        Because NearAppoint is a platform and not the provider of your appointment, we&apos;re not
        responsible for the service a business delivers, for disputes between you and a business, or
        for losses arising from those. To the extent the law allows, our liability to you is limited.
        Nothing in these terms removes rights you have under Pakistani consumer law that cannot be
        waived.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Ending your account',
    body: (
      <p>
        You can close your account at any time. We may suspend or close an account that breaks these
        terms or the law. If your account ends, the relevant parts of these terms — like reviews
        already posted and outstanding obligations — continue to apply.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of Pakistan, and the courts of Lahore have jurisdiction
        over any dispute. We&apos;d always rather resolve things by talking first — email{' '}
        <a href="mailto:hello@nearappoint.com">hello@nearappoint.com</a>.
      </p>
    ),
  },
  {
    id: 'updates',
    title: 'Changes to these terms',
    body: (
      <p>
        As NearAppoint grows, these terms may change. We&apos;ll update this page and the date at the
        top, and for major changes we&apos;ll notify you in the app. Continuing to use NearAppoint
        after a change means you accept the updated terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="15 July 2026"
      lede="The rules of the road for NearAppoint — what you can expect from us, and what we ask of customers and businesses to keep the marketplace fair and reliable."
      sections={sections}
    />
  );
}
