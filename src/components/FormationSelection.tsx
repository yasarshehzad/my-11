import React from 'react';
import { FormationType, DraftModifier, ChallengeTemplate, QUICK_DRAFT_TIMER_SECONDS } from '../types/game';
import { IconArrowRight } from './career/GameIcons';
import { Button } from '@/components/ui';

interface FormationSelectionProps {
  formation: FormationType | null;
  selectedLeague: string;
  draftIQMode: boolean;
  draftModifier?: DraftModifier;
  freeSearchEnabled?: boolean;
  themeLabel?: string;
  dailyChallenge?: ChallengeTemplate | null;
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
  themeLabel = '',
  dailyChallenge = null,
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

  const sectionLabel = 'text-sm font-medium text-[var(--ink-primary)]';
  // One selected style for every group: tinted surface and a darker border.
  const tileBase = 'rounded-lg border transition-colors cursor-pointer min-h-11';
  const tileOn = 'border-[var(--ink-secondary)] bg-[var(--surface-elevated)]';
  const tileOff = 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)]';

  const switchRow = (label: string, hint: string, on: boolean, onToggle: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="w-full min-h-11 py-2 flex items-center justify-between gap-3 text-left cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--ink-primary)]">
          {label}
        </span>
        <span className="block text-xs text-[var(--ink-secondary)]">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${on ? 'bg-[#1d5eff]' : 'bg-[var(--border-crisp)]'}`}
      >
        <span
          className={`block bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center px-2 sm:px-4 py-3 sm:py-5 w-full max-w-xl mx-auto overflow-hidden">
      <div className="office-floating-card w-full rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-[var(--ink-primary)]">
          Draft setup
        </h2>
        {themeLabel && (
          <p className="text-xs font-medium text-emerald-800 bg-emerald-50 rounded-md px-2 py-1 inline-flex">
            Draft pool: {themeLabel}
          </p>
        )}
        {dailyChallenge && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left">
            <p className="text-xs font-medium text-emerald-800">Daily scenario</p>
            <p className="text-sm font-semibold text-[var(--ink-primary)] mt-0.5">{dailyChallenge.title}</p>
            <p className="text-xs text-[var(--ink-secondary)] mt-0.5 leading-relaxed">{dailyChallenge.description}</p>
          </div>
        )}

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
                  <span className="block text-base font-display font-semibold leading-tight text-[var(--ink-primary)]">
                    {f.type}
                  </span>
                  <span className="block text-xs text-[var(--ink-secondary)]">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* League */}
        <div className="w-full space-y-1.5">
          <div className={`${sectionLabel} flex justify-between items-baseline gap-2`}>
            <span>League</span>
            {activeLeague && (
              <span className="font-normal text-xs text-[var(--ink-secondary)] truncate">
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
                  <span className="block font-semibold text-sm text-[var(--ink-primary)]">
                    {lg.code}
                  </span>
                  <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
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
                  <span className="block font-semibold text-sm text-[var(--ink-primary)]">
                    {mode.label}
                  </span>
                  <span className="block text-xs text-[var(--ink-secondary)]">{mode.note}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="w-full divide-y divide-[var(--office-divider)] border-y border-[var(--office-divider)]">
          {switchRow('Draft IQ', 'Scouting tips and chemistry hints', draftIQMode, onToggleDraftIQMode)}
          {onToggleFreeSearch &&
            switchRow('Free search', 'Pick any player from the database', freeSearchEnabled, onToggleFreeSearch)}
        </div>

        <Button variant="primary" fullWidth onClick={onConfirmTactics} disabled={!formation}>
          <span>{formation ? 'Start draft' : 'Choose a formation'}</span>
          {formation && <IconArrowRight className="w-4 h-4 shrink-0" />}
        </Button>
      </div>
    </div>
  );
}
