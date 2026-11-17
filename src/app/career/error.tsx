'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { IconAlert, IconRefresh, IconHome } from '../../components/career/GameIcons';

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
      <div className="office-floating-card max-w-md w-full bg-white border border-rose-200 rounded-3xl p-6 space-y-4 shadow-xl text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <IconAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-display font-black uppercase tracking-wider text-rose-600 block">
              Career Hub Recovery
            </span>
            <h1 className="text-lg font-display font-black text-[#0b1536] uppercase">
              Unable to render Career view
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your career saves in localStorage have not been erased. Reload this view or head back to the Career Save Vault to export a backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="office-action-btn-primary py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Reload Career</span>
          </button>
          <Link
            href="/career"
            className="office-subcard py-2.5 px-4 rounded-xl font-display font-bold text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 border border-slate-200"
          >
            <IconHome className="w-3.5 h-3.5" />
            <span>Career Save Slots</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
