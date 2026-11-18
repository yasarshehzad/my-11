import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowLeft } from '@/components/career/GameIcons';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for MY-11 football draft and career simulation game.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen my11-canvas font-sans flex flex-col p-4 sm:p-12 safe-pb">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 office-floating-card rounded-xl p-6 sm:p-10 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--ink-primary)] border-b border-[var(--border-subtle)] pb-4">
          Terms of service
        </h1>
        
        <p className="text-xs text-[var(--ink-muted)]">
          Last updated: June 15, 2026
        </p>

        <div className="text-sm text-[var(--ink-secondary)] space-y-4 leading-relaxed">
          <p>
            Welcome to <strong className="text-[var(--ink-primary)]">MY-11</strong>. By accessing or playing our game, you agree to these Terms of Service.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Fair play:</strong> MY-11 is a free, local-first web game made for football fans. It is strictly for entertainment purposes.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Intellectual property and disclaimer:</strong> All player names, seasons, and references are historical and educational in nature. This is an unofficial game and is not affiliated with, endorsed by, or representing any official football club, league, player, rights holder, or governing body. No real badges, logos, or copyrighted assets are used in the application.
          </p>
          <p>
            <strong className="text-[var(--ink-primary)]">Limitation of liability:</strong> The game is provided &ldquo;as is&rdquo; without any warranties. We are not responsible for any local browser storage data clearing or browser incompatibility.
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
