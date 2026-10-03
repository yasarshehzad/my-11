import React, { useState } from 'react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
        onClick={() => onClose(false)}
      />

      {/* Modal Container */}
      <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl relative z-10 space-y-5 animate-card-deal">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-900">
          <h3 className="text-md font-display font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
            ⚽ How to Play MY DRAFTED XI
          </h3>
          <button
            onClick={() => onClose(false)}
            className="text-slate-500 hover:text-foreground text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body / Steps */}
        <div className="text-xs text-slate-350 space-y-4 font-semibold leading-relaxed">
          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">1</span>
            <div>
              <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Set Your Strategy</h4>
              <p className="text-[11px] text-slate-400 font-medium">Choose your team formation and match league. Toggle <b>Draft IQ Mode</b> to test your memory without seeing player stats!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">2</span>
            <div>
              <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Draft the Ultimate Squad</h4>
              <p className="text-[11px] text-slate-400 font-medium">Select players for each position. Link players of the same <b>nationality</b>, <b>club</b>, or <b>era</b> to boost Chemistry & performance!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">3</span>
            <div>
              <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Simulate & Win</h4>
              <p className="text-[11px] text-slate-400 font-medium">Simulate a full 38-game league season. Win matches based on your ratings and chemistry to climb the standings!</p>
            </div>
          </div>
        </div>

        {/* Don't show again and Action Footer */}
        <div className="pt-3 border-t border-slate-900 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-900 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Don't show this popup again</span>
          </label>
          <button
            onClick={() => onClose(dontShowAgain)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow hover:from-emerald-400 hover:to-teal-400 cursor-pointer text-center"
          >
            Let's Go! ➔
          </button>
        </div>
      </div>
    </div>
  );
}
