import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 sm:p-12">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 glass rounded-3xl p-8 border border-slate-900 shadow-2xl space-y-6">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight border-b border-slate-900 pb-4">
          Privacy Policy
        </h1>
        
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Effective Date: June 15, 2026
        </p>

        <div className="text-sm text-slate-350 space-y-4 leading-relaxed font-semibold">
          <p>
            Your privacy is extremely important to us. At <strong>Drafted XI</strong>, we do not collect, store, or sell any personal data.
          </p>
          <p>
            <strong>Local Storage:</strong> The game uses local storage on your browser strictly to store your gameplay stats, streak count, and daily challenge progress. This data remains on your device and is never uploaded to any external servers.
          </p>
          <p>
            <strong>Cookies:</strong> We do not use third-party cookies or tracking scripts.
          </p>
          <p>
            <strong>Third-Party Analytics:</strong> This site uses placeholder analytics hooks to help us understand gameplay patterns. No personal identifying information (PII) is captured.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 transform active:scale-95 cursor-pointer text-center"
          >
            ➔ Return to Main Game
          </Link>
        </div>
      </main>
    </div>
  );
}
