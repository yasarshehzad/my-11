import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for MY-11 football draft and career simulation game.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen my11-canvas font-sans flex flex-col p-6 sm:p-12 safe-pb">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 office-floating-card rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        <h1 className="text-3xl sm:text-4xl font-display font-black text-[#0b1536] uppercase tracking-tight border-b border-[var(--office-divider)] pb-4">
          Terms of Service
        </h1>
        
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Last Updated: June 15, 2026
        </p>

        <div className="text-sm text-slate-600 space-y-4 leading-relaxed font-medium">
          <p>
            Welcome to <strong className="text-[#0b1536]">MY-11</strong>. By accessing or playing our game, you agree to these Terms of Service.
          </p>
          <p>
            <strong className="text-[#0b1536]">Fair Play:</strong> MY-11 is a free, local-first web game made for football fans. It is strictly for entertainment purposes.
          </p>
          <p>
            <strong className="text-[#0b1536]">Intellectual Property & Disclaimer:</strong> All player names, seasons, and references are historical and educational in nature. This is an unofficial game and is not affiliated with, endorsed by, or representing any official football club, league, player, rights holder, or governing body. No real badges, logos, or copyrighted assets are used in the application.
          </p>
          <p>
            <strong className="text-[#0b1536]">Limitation of Liability:</strong> The game is provided "as is" without any warranties. We are not responsible for any local browser storage data clearing or browser incompatibility.
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
