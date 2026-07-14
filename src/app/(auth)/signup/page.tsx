'use client';
import * as React from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { GoogleIcon } from '@/features/auth/components/google-icon';

/**
 * CUSTOMER SIGNUP. Google, one button, nothing else.
 *
 * There is NO self-serve business signup, deliberately:
 *
 *   - Every business is met, seen and onboarded by a human.
 *   - No junk listings.
 *   - No aesthetic clinic quietly signing itself up and listing Botox.
 *
 * The manual onboarding IS the verification gate. It doesn't scale past ~50
 * businesses, and that is a very good problem to have later.
 */
export default function SignupPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await auth.signInWithGoogle('/home');
    if (err) {
      setError(err.message);
      setLoading(false);
    }
    // Success = a redirect to Google. Nothing more happens here.
  };

  return (
    <>
      <h1 className="mb-2.5 text-[clamp(1.8rem,2.8vw,2.2rem)]">Create your account</h1>
      <p className="mb-8 text-[0.97rem] leading-snug text-muted">
        Book appointments at salons and parlors near you. Free, always.
      </p>

      <Button size="lg" block variant="secondary" loading={loading} onClick={() => void signIn()}>
        <GoogleIcon /> Continue with Google
      </Button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.87rem] leading-snug text-red-700">
          <AlertCircle className="mt-0.5 size-[15px] flex-none" />
          {error}
        </div>
      )}

      <p className="mt-6 text-center text-[0.92rem] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-display font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-line bg-soft p-4">
        <p className="text-[0.85rem] leading-relaxed text-muted">
          <b className="font-display font-bold text-ink">Own a business?</b><br />
          We onboard every business personally — we come to you, set it up, and
          show you how it works.{' '}
          <a href="mailto:hello@nearappoint.com" className="font-semibold text-brand hover:underline">
            Get in touch
          </a>
          .
        </p>
      </div>

      <p className="mt-6 text-center text-[0.79rem] leading-relaxed text-faint">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{' '}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </>
  );
}
