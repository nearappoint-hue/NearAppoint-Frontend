import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'The short version: NearAppoint uses the cookies it needs to keep you signed in, and nothing that tracks you across the web.',
};

const sections: LegalSection[] = [
  {
    id: 'summary',
    title: 'The short version',
    body: (
      <p>
        NearAppoint uses only the cookies it needs to work — mainly to keep you signed in. We
        don&apos;t use advertising cookies, and we don&apos;t let anyone follow you around the web.
        This page explains what&apos;s actually stored on your device.
      </p>
    ),
  },
  {
    id: 'what-is-a-cookie',
    title: 'What a cookie is',
    body: (
      <p>
        A cookie is a small piece of text a website stores in your browser so it can remember
        something between page loads — like the fact that you&apos;re signed in. Some are essential
        for a site to function; others are used to track behaviour. We use the first kind.
      </p>
    ),
  },
  {
    id: 'what-we-use',
    title: 'What we use',
    body: (
      <>
        <h3>Essential cookies</h3>
        <p>
          These keep NearAppoint working and can&apos;t be switched off in the app. They include the
          session cookie that keeps you signed in after you log in, and a security token that
          protects your account from cross-site attacks. Without them, you&apos;d have to sign in on
          every page.
        </p>
        <h3>Preference cookies</h3>
        <p>
          If we remember a simple choice you make — for example, dismissing a banner — we store it
          locally so we don&apos;t nag you again. Nothing here identifies you.
        </p>
        <h3>What we don&apos;t use</h3>
        <p>
          No advertising cookies, no cross-site trackers, no selling of your browsing data. If that
          ever changes, we&apos;ll update this page and ask for your consent first.
        </p>
      </>
    ),
  },
  {
    id: 'managing',
    title: 'Managing cookies',
    body: (
      <p>
        You can clear or block cookies in your browser settings at any time. If you block the
        essential ones, though, you won&apos;t be able to stay signed in to NearAppoint.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        If we start using new kinds of cookies, we&apos;ll update this policy and the date at the top.
        See our <a href="/privacy">Privacy Policy</a> for the fuller picture of how we handle your
        information.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="15 July 2026"
      lede="A short, honest account of the cookies NearAppoint stores on your device — the ones that keep you signed in, and the ones we deliberately don't use."
      sections={sections}
    />
  );
}
