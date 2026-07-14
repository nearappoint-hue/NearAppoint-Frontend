'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/auth';
import { GoogleIcon } from '@/features/auth/components/google-icon';

/**
 * ONE login screen, TWO front doors.
 *
 *   Customers  -> Google
 *   Businesses -> email + password, which WE set when we onboarded them
 *
 * We do not ask "are you a customer or a business?" — the account already
 * knows. Middleware routes them. Asking would be a question the user shouldn't
 * have to answer about themselves.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const oauthError = params.get('error');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(oauthError);

  const google = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await auth.signInWithGoogle(next ?? '/home');
    if (err) { setError(err.message); setGoogleLoading(false); }
  };

  const password_ = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await auth.signInWithPassword(email, password);

    if (err) {
      setLoading(false);
      /**
       * Deliberately vague. "No account with that email" tells an attacker
       * which emails exist — that is how you enumerate every business on the
       * platform.
       */
      setError('That email and password don\u2019t match. Please try again.');
      return;
    }

    // Middleware decides where they belong. We just refresh.
    router.push(next ?? '/today');
    router.refresh();
  };

  return (
    <>
      <h1 className="mb-2.5 text-[clamp(1.8rem,2.8vw,2.2rem)]">Sign in</h1>
      <p className="mb-7 text-[0.97rem] leading-snug text-muted">
        Welcome back.
      </p>

      <Button size="lg" block variant="secondary" loading={googleLoading} onClick={() => void google()}>
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3.5 text-[0.82rem] text-faint">
        <span className="h-px flex-1 bg-line" />
        business account
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={password_}>
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block font-display text-[0.85rem] font-bold">
            Email
          </label>
          <Input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            aria-invalid={!!error}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="password" className="mb-2 block font-display text-[0.85rem] font-bold">
            Password
          </label>
          <Input
            id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-invalid={!!error}
          />
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.87rem] leading-snug text-red-700">
            <AlertCircle className="mt-0.5 size-[15px] flex-none" />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.92rem] text-muted">
        New here?{' '}
        <Link href="/signup" className="font-display font-bold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}
