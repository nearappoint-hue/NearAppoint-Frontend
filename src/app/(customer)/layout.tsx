import { Nav } from '@/components/marketing/nav';
import { Footer } from '@/components/marketing/footer';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
    </>
  );
}
