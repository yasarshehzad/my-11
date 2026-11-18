'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { IconAlert, IconRefresh, IconHome } from '../../components/career/GameIcons';
import { Button, Eyebrow } from '../../components/ui';

export default function CareerRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CareerErrorBoundary]', error);
  }, [error]);

  return (
    <main className="min-h-screen my11-canvas flex items-center justify-center p-4">
      <div className="office-floating-card max-w-md w-full rounded-xl p-6 space-y-4 text-left">
        <div className="flex items-start gap-3">
          <IconAlert className="w-5 h-5 mt-5 text-rose-600 shrink-0" />
          <div className="space-y-1 min-w-0">
            <Eyebrow>Career recovery</Eyebrow>
            <h1 className="text-lg font-display font-semibold text-[var(--ink-primary)]">
              Unable to show the career view
            </h1>
            <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
              Your career saves are still stored in this browser. Reload this view, or go back to the save slots to export a backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" onClick={() => reset()}>
            <IconRefresh className="w-4 h-4" />
            <span>Reload career</span>
          </Button>
          <Link
            href="/career"
            className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg font-semibold text-sm bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] transition-colors"
          >
            <IconHome className="w-4 h-4" />
            <span>Career save slots</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
