import React from 'react';
import { FormationType } from '../types/game';

interface FormationSelectionProps {
  formation: FormationType | null;
  selectedLeague: string;
  draftIQMode: boolean;
  onSelectFormation: (form: FormationType) => void;
  onSelectLeague: (league: string) => void;
  onToggleDraftIQMode: () => void;
  onConfirmTactics: () => void;
}

export function FormationSelection({
  formation,
  selectedLeague,
  draftIQMode,
  onSelectFormation,
  onSelectLeague,
  onToggleDraftIQMode,
  onConfirmTactics,
}: FormationSelectionProps) {
  const formations: { type: FormationType; label: string; desc: string }[] = [
    { type: '4-3-3', label: '4 - 3 - 3', desc: 'Wingers & Balanced Midfield' },
    { type: '4-4-2', label: '4 - 4 - 2', desc: 'Traditional Flat Four & Twin Strikers' },
    { type: '3-5-2', label: '3 - 5 - 2', desc: 'Overloaded Midfield & Defensive Shield' },
    { type: '4-2-3-1', label: '4 - 2 - 3 - 1', desc: 'Double Pivot & Attacking Playmakers' },
  ];

  const leaguesList = [
    { id: 'english', name: 'English Premier League', flag: '🇬🇧', desc: 'The most intense, high-rated league in the world.', avgRating: 81 },
    { id: 'spanish', name: 'La Liga', flag: '🇪🇸', desc: 'Tactical and technical football dominated by giants.', avgRating: 78 },
    { id: 'german', name: 'Bundesliga', flag: '🇩🇪', desc: 'High-pressing, fast-paced attacking spectacles.', avgRating: 77 },
    { id: 'italian', name: 'Serie A', flag: '🇮🇹', desc: 'Catenaccio heritage with robust tactical defensive units.', avgRating: 78 },
    { id: 'french', name: 'Ligue 1', flag: '🇫🇷', desc: 'Physical, explosive counters and rising superstars.', avgRating: 76 },
  ];

  return (
    <div className={`flex flex-col items-center justify-center min-h-[75vh] px-4 sm:px-6 py-8 space-y-6 w-full max-w-full overflow-hidden ${formation ? 'pb-24 md:pb-8' : ''}`}>
      <div className="text-center">
        <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight leading-none mb-2">
           Tactical Settings
        </h2>
        <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase leading-none">
          Configure your campaign and layout to begin drafting
        </p>
      </div>

      {/* League Selector */}
      <div className="w-full max-w-md space-y-3">
        <div className="text-center sm:text-left">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Select Competition League
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {leaguesList.map((lg) => {
            const active = selectedLeague === lg.id;
            return (
              <button
                key={lg.id}
                onClick={() => onSelectLeague(lg.id)}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-center gap-3.5 cursor-pointer relative active:scale-99 ${
                  active
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-450 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'border-slate-900 bg-slate-950/40 text-slate-350 hover:border-slate-800 hover:bg-slate-900/40'
                }`}
              >
                <span className="text-2xl">{lg.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-display font-black uppercase tracking-wide leading-none">
                      {lg.name}
                    </h4>
                    <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase leading-none font-display border ${
                      active ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      OVR ~{lg.avgRating}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate leading-none">
                    {lg.desc}
                  </p>
                </div>
                {active && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Draft IQ Mode Toggle */}
      <div className="w-full max-w-md p-4 rounded-2xl glass border border-slate-900 flex justify-between items-center gap-4 select-none">
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-display font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 leading-none">
            🧠 Draft IQ Mode
          </h4>
          <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
            Hide ratings & stats during drafting. Rely on your football knowledge to build chemistry and reveal scores at the end!
          </p>
        </div>
        <button
          onClick={onToggleDraftIQMode}
          className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer flex-shrink-0 relative ${
            draftIQMode ? 'bg-emerald-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-300 ${
              draftIQMode ? 'translate-x-5.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="w-full max-w-md h-[1.5px] bg-slate-900/60" />

      <div className="w-full max-w-md space-y-3">
        <div className="text-center sm:text-left">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Choose Formation Layout
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {formations.map((f) => {
            const active = formation === f.type;
            return (
              <button
                key={f.type}
                onClick={() => onSelectFormation(f.type)}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-300 group active:scale-98 cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/30'
                    : 'border-slate-900 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center w-full leading-none">
                  <span className={`text-base font-display font-black transition-colors ${active ? 'text-emerald-450' : 'text-foreground group-hover:text-emerald-450'}`}>
                    {f.label}
                  </span>
                  <span className="text-[8px] font-extrabold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 font-display">
                    {f.type}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-tight font-semibold">
                  {f.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky proceed button */}
      {formation && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center animate-card-deal">
          <button
            onClick={onConfirmTactics}
            className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center animate-pulse"
          >
            Confirm & Start Draft ➔
          </button>
        </div>
      )}
    </div>
  );
}
