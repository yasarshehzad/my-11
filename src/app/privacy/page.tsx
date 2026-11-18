import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowLeft } from '@/components/career/GameIcons';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for MY-11. We respect your privacy and do not collect, store, or sell personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen my11-canvas font-sans flex flex-col p-4 sm:p-12 safe-pb">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 office-floating-card rounded-xl p-6 sm:p-10 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--ink-primary)] border-b border-[var(--border-subtle)] pb-4">
          Privacy policy
        </h1>
        
        <p className="text-xs text-[var(--ink-muted)]">
          Effective date: June 15, 2026
        </p>

        <div className="text-sm text-[var(--ink-secondary)] space-y-4 leading-relaxed">
          <p>
            Your privacy is extremely important to us. At <strong className="text-[var(--ink-primary)]">MY-11</strong>, we do not collect, store, or sell any personal data.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Local storage:</strong> The game uses local storage on your browser strictly to store your gameplay stats, campaign history, personal records, streak count, and daily challenge progress. This data remains on your device and is never uploaded to any external servers.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Cookies:</strong> We do not use third-party cookies or tracking scripts.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Third-party analytics:</strong> This site uses privacy-conscious placeholder analytics hooks to help us understand gameplay patterns. No personal identifying information (PII) is captured.
          </p>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg font-semibold text-sm bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] transition-colors"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
