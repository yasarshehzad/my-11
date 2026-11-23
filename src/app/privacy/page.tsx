import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowLeft } from '@/components/career/GameIcons';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How MY-11 handles local saves, Google Analytics events and portable save codes.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen my11-canvas font-sans flex flex-col p-4 sm:p-12 safe-pb">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 office-floating-card rounded-xl p-6 sm:p-10 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--ink-primary)] border-b border-[var(--border-subtle)] pb-4">
          Privacy policy
        </h1>
        
        <p className="text-xs text-[var(--ink-muted)]">
          Effective date: November 23, 2026
        </p>

        <div className="text-sm text-[var(--ink-secondary)] space-y-4 leading-relaxed">
          <p>
            At <strong className="text-[var(--ink-primary)]">MY-11</strong>, we do not ask for an account, name, email address or payment details. The game is played as a guest.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Local storage:</strong> The game uses local storage and IndexedDB on your browser to store your gameplay stats, campaign history, personal records, streak count, daily challenge progress, manager level and career saves. This data remains on your device and is not uploaded to a MY-11 server. If you clear your browser storage, it is removed.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Analytics:</strong> We use Google Analytics 4 to understand which modes are played and where players stop. It records page views and gameplay events such as starting a draft, completing a season, opening a daily scenario, sharing a result and creating a career. We do not send names, email addresses or save contents. Google may process device and approximate location data under its own privacy policy.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Cookies:</strong> Google Analytics may set cookies. You can block them with your browser or an ad blocker; the game still works.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Save codes:</strong> If you create a portable save code, it contains your career data and is shown only to you. Anyone you give the code to can open that career, so keep it private.
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
