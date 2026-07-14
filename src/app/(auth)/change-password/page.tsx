'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/auth';

/**
 * Business accounts are created BY US. We choose the first password and we say
 * it out loud in her shop.
 *
 * She changes it before she can do anything else — so we are not sitting on a
 * working key to her business, her revenue and her entire customer list.
 *
 * Middleware forces every route here until must_change_password is false.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== pw2)    { setError('The two passwords don\u2019t match.'); return; }

    setLoading(true);
    const { error: err } = await auth.updatePassword(pw);
    if (err) { setError(err.message); setLoading(false); return; }

    // Clear the flag server-side, then go to work.
    await fetch('/api/v1/account/password-changed', { method: 'POST' });
    router.push('/today');
    router.refresh();
  };

  return (
    <>
      <div className="mb-5 grid size-12 place-items-center rounded-lg bg-brand-tint text-brand">
        <KeyRound className="size-6" />
      </div>

      <h1 className="mb-2.5 text-[clamp(1.8rem,2.8vw,2.2rem)]">Set your password</h1>
      <p className="mb-7 text-[0.97rem] leading-snug text-muted">
        We set a temporary password when we created your account. Choose your own
        now — nobody at NearAppoint will know it.
      </p>

      <form onSubmit={submit}>
        <div className="mb-4">
          <label htmlFor="pw" className="mb-2 block font-display text-[0.85rem] font-bold">
            New password
          </label>
          <Input id="pw" type="password" autoComplete="new-password" required
            value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
        </div>

        <div className="mb-5">
          <label htmlFor="pw2" className="mb-2 block font-display text-[0.85rem] font-bold">
            Confirm password
          </label>
          <Input id="pw2" type="password" autoComplete="new-password" required
            value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" />
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.87rem] leading-snug text-red-700">
            <AlertCircle className="mt-0.5 size-[15px] flex-none" />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={loading}>
          Save and continue
        </Button>
      </form>
    </>
  );
}
