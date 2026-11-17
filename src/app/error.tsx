'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { IconAlert, IconRefresh, IconHome } from '../components/career/GameIcons';

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppErrorBoundary]', error);
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
              Recovery Mode
            </span>
            <h1 className="text-lg font-display font-black text-[#0b1536] uppercase">
              Something went wrong
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your local saves and campaign history remain intact in browser storage. Try reloading the screen or return home.
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
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="office-subcard py-2.5 px-4 rounded-xl font-display font-bold text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 border border-slate-200"
          >
            <IconHome className="w-3.5 h-3.5" />
            <span>Main Menu</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
