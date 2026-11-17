import React from 'react';
import { FormationType, DraftModifier, QUICK_DRAFT_TIMER_SECONDS } from '../types/game';
import { IconClock, IconBolt, IconSparkles, IconArrowRight } from './career/GameIcons';

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
  const formations: { type: FormationType; desc: string }[] = [
    { type: '4-3-3', desc: 'Wingers' },
    { type: '4-4-2', desc: 'Twin strikers' },
    { type: '3-5-2', desc: 'Packed midfield' },
    { type: '4-2-3-1', desc: 'Double pivot' },
  ];

  const leaguesList = [
    { id: 'english', name: 'English Premier League', code: 'ENG', avgRating: 81 },
    { id: 'spanish', name: 'La Liga', code: 'ESP', avgRating: 78 },
    { id: 'german', name: 'Bundesliga', code: 'GER', avgRating: 77 },
    { id: 'italian', name: 'Serie A', code: 'ITA', avgRating: 78 },
    { id: 'french', name: 'Ligue 1', code: 'FRA', avgRating: 76 },
  ];
  const activeLeague = leaguesList.find((lg) => lg.id === selectedLeague);

  const paceModes = [
    { id: 'classic' as const, label: 'Classic', note: 'No clock' },
    { id: 'quick' as const, label: 'Quick', note: `${QUICK_DRAFT_TIMER_SECONDS}s timer` },
    { id: 'mystery' as const, label: 'Mystery', note: '3 blind picks' },
  ];

  const sectionLabel = 'text-[10px] font-black text-[var(--office-text-muted)] uppercase tracking-widest font-display px-1';
  const tileBase = 'rounded-xl transition-colors duration-200 cursor-pointer active:scale-[0.99] min-h-[44px]';
  const tileOn = 'border-2 border-amber-600 bg-amber-50/40';
  const tileOff = 'office-subcard hover:border-indigo-200';

  const switchRow = (label: string, hint: string, on: boolean, onToggle: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="w-full min-h-[44px] py-2 flex items-center justify-between gap-3 text-left cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-display font-black uppercase tracking-wide text-[var(--office-text-primary)]">
          {label}
        </span>
        <span className="block text-[11px] text-[var(--office-text-secondary)] font-medium">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${on ? 'bg-[#1d5eff]' : 'bg-slate-300'}`}
      >
        <span
          className={`block bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center px-2 sm:px-4 py-3 sm:py-5 w-full max-w-xl mx-auto overflow-hidden">
      <div className="office-floating-card w-full rounded-[28px] p-4 sm:p-6 shadow-xl space-y-4">
        <h2 className="text-xl sm:text-2xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight leading-none text-center">
          Draft Setup
        </h2>

        {/* Formation */}
        <div className="w-full space-y-1.5">
          <div className={sectionLabel}>Formation</div>
          <div className="grid grid-cols-2 gap-2 w-full">
            {formations.map((f) => {
              const active = formation === f.type;
              return (
                <button
                  key={f.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectFormation(f.type)}
                  className={`${tileBase} w-full px-3 py-2 text-left ${active ? tileOn : tileOff}`}
                >
                  <span className={`block text-base font-display font-black leading-tight ${
                    active ? 'text-[#1d5eff]' : 'text-[var(--office-text-primary)]'
                  }`}>
                    {f.type}
                  </span>
                  <span className="block text-[11px] text-[var(--office-text-secondary)] font-medium">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* League */}
        <div className="w-full space-y-1.5">
          <div className={`${sectionLabel} flex justify-between gap-2`}>
            <span>League</span>
            {activeLeague && (
              <span className="normal-case tracking-normal font-sans font-semibold text-[11px] text-[var(--office-text-secondary)] truncate">
                {activeLeague.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {leaguesList.map((lg) => {
              const active = selectedLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${lg.name}, average rating ${lg.avgRating}`}
                  onClick={() => onSelectLeague(lg.id)}
                  className={`${tileBase} px-1 py-1.5 text-center ${active ? tileOn : tileOff}`}
                >
                  <span className={`block font-display font-black text-xs tracking-wide ${
                    active ? 'text-[#1d5eff]' : 'text-[var(--office-text-primary)]'
                  }`}>
                    {lg.code}
                  </span>
                  <span className="block text-[10px] font-mono font-bold text-[var(--office-text-secondary)]">
                    {lg.avgRating} avg
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Draft pace */}
        <div className="w-full space-y-1.5">
          <div className={sectionLabel}>Pace</div>
          <div className="grid grid-cols-3 gap-1.5">
            {paceModes.map((mode) => {
              const active = draftModifier === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectDraftModifier?.(mode.id)}
                  className={`${tileBase} px-2 py-1.5 text-center ${active ? tileOn : tileOff}`}
                >
                  <span className={`flex items-center justify-center gap-1 font-display font-black text-xs uppercase tracking-wide ${
                    active ? 'text-[#1d5eff]' : 'text-[var(--office-text-primary)]'
                  }`}>
                    {mode.id === 'classic' ? (
                      <IconClock className="w-3.5 h-3.5 shrink-0" />
                    ) : mode.id === 'quick' ? (
                      <IconBolt className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <IconSparkles className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {mode.label}
                  </span>
                  <span className="block text-[10px] font-semibold text-[var(--office-text-secondary)]">{mode.note}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="w-full divide-y divide-[var(--office-divider)] border-y border-[var(--office-divider)]">
          {switchRow('Draft IQ', 'Scouting tips and chemistry hints', draftIQMode, onToggleDraftIQMode)}
          {onToggleFreeSearch &&
            switchRow('Free Search', 'Pick any player from the database', freeSearchEnabled, onToggleFreeSearch)}
        </div>

        <button
          type="button"
          onClick={onConfirmTactics}
          disabled={!formation}
          className="office-play-match-btn w-full py-3.5 px-6 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-lg transition-transform active:scale-[0.99] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{formation ? 'Start Draft' : 'Choose a Formation'}</span>
          {formation && <IconArrowRight className="w-4 h-4 shrink-0" />}
        </button>
      </div>
    </div>
  );
}
