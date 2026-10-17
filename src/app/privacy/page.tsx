import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for MY-11. We respect your privacy and do not collect, store, or sell personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen my11-canvas font-sans flex flex-col p-6 sm:p-12 safe-pb">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 office-floating-card rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        <h1 className="text-3xl sm:text-4xl font-display font-black text-[#0b1536] uppercase tracking-tight border-b border-[var(--office-divider)] pb-4">
          Privacy Policy
        </h1>
        
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Effective Date: June 15, 2026
        </p>

        <div className="text-sm text-slate-600 space-y-4 leading-relaxed font-medium">
          <p>
            Your privacy is extremely important to us. At <strong className="text-[#0b1536]">MY-11</strong>, we do not collect, store, or sell any personal data.
          </p>
          <p>
            <strong className="text-[#0b1536]">Local Storage:</strong> The game uses local storage on your browser strictly to store your gameplay stats, campaign history, personal records, streak count, and daily challenge progress. This data remains on your device and is never uploaded to any external servers.
          </p>
          <p>
            <strong className="text-[#0b1536]">Cookies:</strong> We do not use third-party cookies or tracking scripts.
          </p>
          <p>
            <strong className="text-[#0b1536]">Third-Party Analytics:</strong> This site uses privacy-conscious placeholder analytics hooks to help us understand gameplay patterns. No personal identifying information (PII) is captured.
          </p>
        </div>

        <div className="pt-4 border-t border-[var(--office-divider)]">
          <Link
            href="/"
            className="inline-block py-3.5 px-6 rounded-2xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer text-center"
          >
            ➔ Return to Main Game
          </Link>
        </div>
      </main>
    </div>
  );
}
