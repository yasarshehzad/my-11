import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 sm:p-12">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 glass rounded-3xl p-8 border border-slate-900 shadow-2xl space-y-6">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight border-b border-slate-900 pb-4">
          Terms of Service
        </h1>
        
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Last Updated: June 15, 2026
        </p>

        <div className="text-sm text-slate-350 space-y-4 leading-relaxed font-semibold">
          <p>
            Welcome to <strong>Drafted XI</strong>. By accessing or playing our game, you agree to these Terms of Service.
          </p>
          <p>
            <strong>Fair Play:</strong> Drafted XI is a free, casual web game made for football fans. It is strictly for entertainment purposes.
          </p>
          <p>
            <strong>Intellectual Property & Disclaimer:</strong> All player names, seasons, and references are historical and educational in nature. This is an unofficial game and is not affiliated with, endorsed by, or representing any official football club, league, player, rights holder, or governing body. No real badges, logos, or copyrighted assets are used in the application.
          </p>
          <p>
            <strong>Limitation of Liability:</strong> The game is provided "as is" without any warranties. We are not responsible for any local browser storage data clearing or browser incompatibility.
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
