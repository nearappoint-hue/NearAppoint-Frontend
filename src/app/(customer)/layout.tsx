import { CustomerFooter } from '@/components/customer/customer-footer';

/**
 * The customer shell. WARM.
 *
 * The nav is rendered by each PAGE, not here — /home wires the header's search
 * box to its own state, and two search boxes would be two sources of truth for
 * the same question.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-warm">
      <main className="flex-1">{children}</main>
      <CustomerFooter />
    </div>
  );
}
