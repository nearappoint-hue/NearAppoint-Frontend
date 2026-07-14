import { CustomerNav } from '@/components/customer/customer-nav';

/**
 * The customer shell. WARM.
 *
 * Different from the Business OS on purpose. The dashboard is a tool she uses
 * for eight hours and it should get out of the way. This has about four seconds
 * to feel trustworthy and inviting to someone who has never heard of us.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm">
      <CustomerNav />
      <main className="min-h-[70vh]">{children}</main>

      <footer className="mt-20 border-t border-warm-line/50 py-8">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-[0.85rem] text-warm-faint">
          <span>© 2026 NearAppoint · Made in Lahore</span>
          <nav className="flex gap-5">
            <a href="/privacy" className="hover:text-warm-ink">Privacy</a>
            <a href="/terms" className="hover:text-warm-ink">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
