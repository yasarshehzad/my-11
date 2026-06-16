import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 sm:p-12">
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center my-8 glass rounded-3xl p-8 border border-slate-900 shadow-2xl space-y-6">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight border-b border-slate-900 pb-4">
          Contact Us
        </h1>
        
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Support & Feedback
        </p>

        <div className="text-sm text-slate-355 space-y-4 leading-relaxed font-semibold">
          <p>
            Do you have questions, feedback, player season requests, or bug reports? We'd love to hear from you!
          </p>
          <p>
            You can reach us at our support channel:
          </p>
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 w-fit">
            <span className="text-emerald-400 font-display font-bold">info@my-11.com</span>
          </div>
          <p>
            Since we do not collect your personal data or email addresses on this site, emailing us directly is the best way to get support.
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
