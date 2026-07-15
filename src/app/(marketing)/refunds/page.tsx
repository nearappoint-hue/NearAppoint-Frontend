import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'How NearAppoint subscriptions, trials, cancellations, and refunds work — and why customers never pay a booking fee.',
};

const sections: LegalSection[] = [
  {
    id: 'who-pays',
    title: 'Who pays what',
    body: (
      <>
        <p>Two very different things, so let&apos;s be clear up front:</p>
        <ul>
          <li>
            <strong>Customers pay nothing to NearAppoint.</strong> Booking is free — there is no
            booking fee. Any payment for your actual appointment is made to the business, on their
            terms, not to us. This policy doesn&apos;t govern that payment; take refund questions
            about a service to the business you booked.
          </li>
          <li>
            <strong>Businesses pay a subscription.</strong> Everything below is about that
            subscription.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'trial',
    title: 'The free trial',
    body: (
      <p>
        Every new business starts on a <strong>30-day free trial</strong> with no card required and
        no charge. You can use the Business OS fully during the trial. If you don&apos;t continue,
        nothing is billed — the trial simply ends.
      </p>
    ),
  },
  {
    id: 'billing',
    title: 'How subscriptions are billed',
    body: (
      <>
        <p>
          Paid plans — Starter, Business, and Enterprise — are billed in advance for the period you
          choose, monthly or annually, in Pakistani Rupees. Your plan renews automatically at the end
          of each period until you cancel.
        </p>
        <p>We&apos;ll always show the price clearly before you subscribe.</p>
      </>
    ),
  },
  {
    id: 'cancelling',
    title: 'Cancelling',
    body: (
      <>
        <p>
          You can cancel your subscription at any time from your account settings. When you cancel:
        </p>
        <ul>
          <li>Your plan stays active until the end of the period you&apos;ve already paid for.</li>
          <li>You won&apos;t be billed again after that.</li>
          <li>Your data stays available to you until the period ends, so you can export it.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'refunds',
    title: 'Refunds',
    body: (
      <>
        <p>
          Because you get a full 30-day trial before paying anything, we generally don&apos;t refund
          a subscription period that has already started — cancelling stops the next renewal rather
          than refunding the current one.
        </p>
        <p>We will, however, refund you in fair cases, including:</p>
        <ul>
          <li>You were charged after cancelling, or charged twice for the same period.</li>
          <li>A billing error on our side.</li>
          <li>
            A prolonged outage that stopped you using a plan you paid for, where we couldn&apos;t
            put it right.
          </li>
        </ul>
        <p>
          If you think you&apos;re owed a refund, email{' '}
          <a href="mailto:billing@nearappoint.com">billing@nearappoint.com</a> within 14 days of the
          charge and we&apos;ll look into it properly.
        </p>
      </>
    ),
  },
  {
    id: 'how-refunds-are-paid',
    title: 'How refunds are paid',
    body: (
      <p>
        Approved refunds are returned to the original payment method through our payment processor.
        Depending on your bank, it can take a few working days to appear.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy as our plans evolve. Changes apply to future billing periods, never
        retroactively, and we&apos;ll update the date at the top. This policy sits alongside our{' '}
        <a href="/terms">Terms of Service</a>.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      updated="15 July 2026"
      lede="Customers never pay us a booking fee. Businesses get a 30-day free trial before a single rupee is charged. Here's exactly how subscriptions, cancellations, and refunds work."
      sections={sections}
    />
  );
}
