import React from 'react';
import { FormationType, DraftModifier, QUICK_DRAFT_TIMER_SECONDS } from '../types/game';

interface FormationSelectionProps {
  formation: FormationType | null;
  selectedLeague: string;
  draftIQMode: boolean;
  draftModifier?: DraftModifier;
  freeSearchEnabled?: boolean;
  onSelectFormation: (form: FormationType) => void;
  onSelectLeague: (league: string) => void;
  onToggleDraftIQMode: () => void;
  onSelectDraftModifier?: (modifier: DraftModifier) => void;
  onToggleFreeSearch?: () => void;
  onConfirmTactics: () => void;
}

export function FormationSelection({
  formation,
  selectedLeague,
  draftIQMode,
  draftModifier = 'classic',
  freeSearchEnabled = false,
  onSelectFormation,
  onSelectLeague,
  onToggleDraftIQMode,
  onSelectDraftModifier,
  onToggleFreeSearch,
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
    <div className={`flex flex-col items-center justify-center px-2 sm:px-4 py-4 w-full max-w-xl mx-auto overflow-hidden ${formation ? 'pb-24 md:pb-6' : ''}`}>
      <div className="office-floating-card w-full rounded-[28px] p-5 sm:p-7 shadow-xl space-y-6">
        <header className="text-center space-y-1">
          <span className="text-3xl">📐</span>
          <h2 className="text-2xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight leading-none">
            Tactical Settings
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Configure your campaign league and formation to begin drafting
          </p>
        </header>

        {/* League Selector */}
        <div className="w-full space-y-2.5">
          <div className="text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 font-display">
              Select Competition League
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {leaguesList.map((lg) => {
              const active = selectedLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  onClick={() => onSelectLeague(lg.id)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer relative active:scale-99 ${
                    active
                      ? 'border-2 border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/30'
                      : 'office-subcard hover:border-slate-700/60'
                  }`}
                >
                  <span className="text-2xl">{lg.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-display font-black uppercase tracking-wide text-[var(--office-text-primary)]">
                        {lg.name}
                      </h4>
                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase office-subcard text-slate-300 font-mono">
                        OVR ~{lg.avgRating}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-none">
                      {lg.desc}
                    </p>
                  </div>
                  {active && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-md shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Draft Mode Selector */}
        <div className="w-full space-y-2.5">
          <div className="text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 font-display">
              Choose Draft Mode
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'classic' as const, label: 'Classic', icon: '⏱️', badge: 'Standard', desc: 'Standard strategic draft with full tactical intel and no clock.' },
              { id: 'quick' as const, label: 'Quick', icon: '⚡', badge: `${QUICK_DRAFT_TIMER_SECONDS}s Timer`, desc: `Fast-paced draft with ${QUICK_DRAFT_TIMER_SECONDS}s timer and auto-pick fallback.` },
              { id: 'mystery' as const, label: 'Mystery', icon: '❓', badge: '3 Blind', desc: '3 concealed rounds with scout clues and dramatic reveal.' },
            ]).map((mode) => {
              const active = draftModifier === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onSelectDraftModifier?.(mode.id)}
                  className={`p-2.5 rounded-2xl text-center transition-all duration-200 flex flex-col items-center justify-between gap-1 cursor-pointer relative active:scale-98 ${
                    active
                      ? 'border-2 border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/30'
                      : 'office-subcard hover:border-slate-700/60'
                  }`}
                >
                  <div className="text-xl leading-none">{mode.icon}</div>
                  <div className="font-display font-black text-xs uppercase tracking-wide text-[var(--office-text-primary)]">
                    {mode.label}
                  </div>
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase office-subcard text-slate-300 font-mono">
                    {mode.badge}
                  </span>
                  <p className="text-[8.5px] text-slate-400 line-clamp-2 leading-tight font-medium hidden sm:block mt-0.5">
                    {mode.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Draft IQ Mode Toggle */}
        <div className="w-full p-3.5 rounded-2xl office-subcard flex justify-between items-center gap-3 select-none">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-display font-black uppercase text-[var(--office-text-primary)] tracking-wider leading-tight">
              Tactical Scouting Intel (Draft IQ)
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium">
              Display live tactical scouting intel, prospective chemistry links, and positional fit.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDraftIQMode}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 relative ${
              draftIQMode ? 'bg-blue-600' : 'bg-slate-700'
            }`}
            aria-label="Toggle Tactical Scouting Intel"
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                draftIQMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Free Player Database Search Toggle */}
        {onToggleFreeSearch && (
          <div className="w-full p-3.5 rounded-2xl office-subcard flex justify-between items-center gap-3 select-none">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-display font-black uppercase text-[var(--office-text-primary)] tracking-wider leading-tight">
                Free Player Search
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium">
                Search and pick any player directly from the 340+ database instead of 3 choices.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleFreeSearch}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 relative ${
                freeSearchEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              aria-label="Toggle Free Player Search"
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                  freeSearchEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Formation Selection Grid */}
        <div className="w-full space-y-2.5">
          <div className="text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 font-display">
              Choose Formation Layout
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {formations.map((f) => {
              const active = formation === f.type;
              return (
                <button
                  key={f.type}
                  onClick={() => onSelectFormation(f.type)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 group active:scale-98 cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-2 border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/30'
                      : 'office-subcard hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex justify-between items-center w-full leading-none">
                    <span className={`text-sm sm:text-base font-display font-black ${active ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--office-text-primary)]'}`}>
                      {f.label}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 office-subcard px-1.5 py-0.5 rounded-full">
                      {f.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug font-medium">
                    {f.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm and Proceed Button */}
        {formation && (
          <div className="pt-2">
            <button
              onClick={onConfirmTactics}
              className="office-play-match-btn w-full py-3.5 px-6 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-xl"
            >
              Confirm &amp; Start Draft ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
