import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChallengeTemplate, StreakStats, PersonalBests, ChallengeTarget } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { listSaveSlots, loadCareerSave } from '../career/saves';
import { CareerSaveFile, SaveSlotMeta } from '../career/types';
import { ENGLISH_TOP_FLIGHT_CLUBS_2026_27, getEffectiveClubName } from '../career/clubs';

export interface HomeScreenProps {
  streakStats: StreakStats;
  personalBests?: PersonalBests;
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  onStartDraft: () => void;
  onPlayDailyChallenge: () => void;
  onRandomDraft?: () => void;
  onViewHistory?: () => void;
  incomingChallenge?: ChallengeTarget | null;
  onAcceptChallenge?: (target: ChallengeTarget) => void;
  onDismissChallenge?: () => void;
  onSelectCareerMode?: () => void;
}

const PROMOTED_2026_27_IDS = new Set([
  'coventry_sky_blues',
  'suffolk_tractors',
  'humberside_tigers',
]);

function formatBudgetCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '£0M';
  const millions = Math.round(amount / 1_000_000);
  return `£${millions}M`;
}

export function HomeScreen({
  streakStats,
  personalBests = {},
  todayChallenge,
  dailyStatus,
  onStartDraft,
  onPlayDailyChallenge,
  onRandomDraft,
  onViewHistory,
  incomingChallenge,
  onAcceptChallenge,
  onDismissChallenge,
  onSelectCareerMode,
}: HomeScreenProps) {
  const [careerSlots, setCareerSlots] = useState<SaveSlotMeta[]>([]);
  const [activeFullSave, setActiveFullSave] = useState<CareerSaveFile | null>(null);
  const [showAllClubs, setShowAllClubs] = useState(false);

  useEffect(() => {
    try {
      const slots = listSaveSlots();
      setCareerSlots(slots);
      const firstActive = slots.find((s) => !s.isEmpty);
      if (firstActive) {
        setActiveFullSave(loadCareerSave(firstActive.slotId));
      } else {
        setActiveFullSave(null);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const activeSlot = careerSlots.find((s) => !s.isEmpty);
  const activeCareerSave = activeSlot?.save;
  const activeSlotId = activeSlot?.slotId;
  const occupiedSlotsCount = careerSlots.filter((s) => !s.isEmpty).length;

  const activeStanding = useMemo(() => {
    if (!activeFullSave?.standings || !activeFullSave?.club) return null;
    const index = activeFullSave.standings.findIndex((s) => s.clubId === activeFullSave.club.id);
    if (index < 0) return null;
    return {
      position: index + 1,
      row: activeFullSave.standings[index],
    };
  }, [activeFullSave]);

  const sorted2026Clubs = useMemo(() => {
    return [...ENGLISH_TOP_FLIGHT_CLUBS_2026_27].sort((a, b) =>
      getEffectiveClubName(a).localeCompare(getEffectiveClubName(b))
    );
  }, []);

  const displayedQuickClubs = useMemo(() => {
    if (showAllClubs) return sorted2026Clubs;
    const promoted = sorted2026Clubs.filter((c) => PROMOTED_2026_27_IDS.has(c.id));
    const established = sorted2026Clubs.filter((c) => !PROMOTED_2026_27_IDS.has(c.id));
    const combined = [...promoted, ...established.slice(0, 5)];
    return combined.sort((a, b) => getEffectiveClubName(a).localeCompare(getEffectiveClubName(b)));
  }, [showAllClubs, sorted2026Clubs]);

  const dockTiles = [
    {
      title: 'Tactics & Pitch',
      tag: 'XI Ready',
      photo: '/images/photo_stadium_bowl.jpg',
      href: activeSlotId ? `/career/play?slot=${activeSlotId}` : '/career',
    },
    {
      title: 'Club Selection',
      tag: '20 Clubs A-Z',
      photo: '/images/photo_dressing_room.jpg',
      href: '/career/setup?slot=slot_1',
    },
    {
      title: 'Transfer Hub',
      tag: 'Scouts Live',
      photo: '/images/photo_boardroom_pitch.jpg',
      href: activeSlotId ? `/career/play?slot=${activeSlotId}` : '/career',
    },
    {
      title: '6 Cup Tournaments',
      tag: 'Silverware',
      photo: '/images/photo_training_pitch.jpg',
      href: activeSlotId ? `/career/play?slot=${activeSlotId}` : '/career',
    },
  ];

  const primaryCareerHref = activeSlotId ? `/career/play?slot=${activeSlotId}` : '/career';

  return (
    <div className="flex flex-col w-full space-y-5 pb-8">
      {/* Incoming Challenge Invitation Banner */}
      {incomingChallenge && (
        <section
          aria-label="Challenge Invitation"
          className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-3.5 sm:p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-900 tracking-wider bg-amber-200/70 px-2 py-0.5 rounded">
                Incoming Challenge
              </span>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800">
                {(incomingChallenge.draftMode || 'classic').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-900 font-medium">
              Target: <strong className="text-amber-900 font-bold">{incomingChallenge.targetWins} Wins</strong>
              {incomingChallenge.targetPoints !== undefined ? ` (${incomingChallenge.targetPoints} pts)` : ''}
              {' '}using {incomingChallenge.formation || 'any formation'}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onAcceptChallenge?.(incomingChallenge)}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-display font-bold text-xs cursor-pointer transition-colors"
            >
              Accept Challenge
            </button>
            <button
              type="button"
              onClick={onDismissChallenge}
              className="py-2 px-3 rounded-xl bg-white border border-amber-300 text-zinc-700 hover:text-zinc-900 text-xs font-semibold cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* Hero Split: Mobile-First Stacked -> Desktop 12-Col */}
      <section aria-label="Career Launchpad" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Stadium Tunnel Photo Card */}
        <article className="lg:col-span-7 relative rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[340px] flex flex-col justify-between p-5 sm:p-7 text-white bg-[#1E2024] shadow-md border border-zinc-800/30">
          <img
            src="/images/hero_tunnel_stadium.jpg"
            alt="Sunlit championship stadium tunnel looking onto green pitch"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(95deg, rgba(24,24,27,0.90) 0%, rgba(24,24,27,0.68) 52%, rgba(24,24,27,0.22) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/65 border border-white/20 text-[11px] font-semibold text-zinc-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>2026/27 Season Verified</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-mono font-semibold text-zinc-100">
              {occupiedSlotsCount}/3 Saves
            </span>
          </div>

          <div className="relative z-10 max-w-xl mt-6 space-y-3 text-left">
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight leading-[1.08] text-white">
              Own the Touchline. Build Your Dynasty.
            </h1>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
              Take control across 38-match seasons, deadline-day transfers, 25-man squad rules, and six domestic &amp; European cups.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {activeCareerSave && activeSlotId ? (
                <Link
                  href={primaryCareerHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm text-zinc-950 shadow-md transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)',
                    border: '1px solid #B45309',
                  }}
                >
                  <span>Continue {activeCareerSave.clubName}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              ) : onSelectCareerMode ? (
                <button
                  type="button"
                  onClick={onSelectCareerMode}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm text-zinc-950 shadow-md cursor-pointer transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)',
                    border: '1px solid #B45309',
                  }}
                >
                  <span>Enter Career Mode</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <Link
                  href="/career/setup?slot=slot_1"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm text-zinc-950 shadow-md transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)',
                    border: '1px solid #B45309',
                  }}
                >
                  <span>Start New Career</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              )}

              <Link
                href="/career"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-xs font-display font-semibold text-xs sm:text-sm text-white transition-colors"
              >
                Save Slots
              </Link>
            </div>
          </div>
        </article>

        {/* Right Double-Bezel Active Save / Career Card */}
        <aside className="lg:col-span-5 rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 flex flex-col shadow-xs">
          <div
            data-force-white="true"
            className="rounded-t-xl p-4"
            style={{ backgroundColor: '#1E2024', color: '#FFFFFF', borderBottom: '2px solid #D97706' }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 mb-2.5">
              <span>{activeCareerSave ? 'Active Save Slot' : 'Career Mode Ready'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-[10px]">
                {activeCareerSave ? `Season ${activeCareerSave.seasonNumber}` : '2026/27'}
              </span>
            </div>

            {activeCareerSave ? (
              <div className="flex items-center gap-3">
                <div
                  data-force-white="true"
                  className="w-11 h-11 rounded-xl border border-white/25 flex items-center justify-center font-display font-extrabold text-xs text-white shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${activeCareerSave.clubPrimaryColor}, ${activeCareerSave.clubSecondaryColor})`,
                  }}
                >
                  {activeCareerSave.clubName.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-display font-bold text-base text-white truncate">
                    {activeCareerSave.clubName}
                  </div>
                  <div className="text-[11px] text-zinc-300 truncate">
                    Manager: {activeCareerSave.managerName} ({activeCareerSave.currentDate})
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-left">
                <div className="font-display font-bold text-base text-white">
                  Choose Any Top-Flight Club
                </div>
                <div className="text-[11px] text-zinc-300">
                  Updated 2026/27 squads including Coventry, Hull &amp; Ipswich
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-b-xl p-4 flex-1 flex flex-col justify-between gap-3 text-left">
            {activeCareerSave ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-500">Transfer Budget</div>
                    <div className="font-display font-bold text-base text-zinc-900 font-mono">
                      {formatBudgetCompact(activeCareerSave.budget)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-500">
                      {activeStanding ? 'League Position' : 'Squad Size'}
                    </div>
                    <div className="font-display font-bold text-base text-zinc-900 font-mono">
                      {activeStanding
                        ? `#${activeStanding.position} (${activeStanding.row.won}W-${activeStanding.row.drawn}D)`
                        : `${activeCareerSave.squadSize} Players`}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/career/play?slot=${activeSlotId}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs text-center transition-colors"
                  >
                    Open Manager&apos;s Office
                  </Link>
                  <Link
                    href="/career/setup?slot=slot_1"
                    className="py-2.5 px-3.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-800 font-display font-bold text-xs text-center transition-colors"
                  >
                    New
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-500">Databases</div>
                    <div className="font-display font-bold text-sm text-zinc-900">26/27, 25/26, 24/25</div>
                  </div>
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-500">Competitions</div>
                    <div className="font-display font-bold text-sm text-zinc-900">20 Clubs &amp; 6 Cups</div>
                  </div>
                </div>
                <Link
                  href="/career/setup?slot=slot_1"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs text-center transition-colors"
                >
                  Quick Club Setup
                </Link>
              </>
            )}
          </div>
        </aside>
      </section>

      {/* Compact Touchline Command Dock (Game-First Mobile 2x2 -> Desktop 4-Col) */}
      <section aria-label="Touchline Command Dock" className="space-y-2 text-left">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-sm font-display font-bold text-zinc-900">
            Touchline Command Dock
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">Quick Jump</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {dockTiles.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href}
              className="group rounded-xl bg-[#E8E6E1] border border-zinc-300/70 p-1 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="bg-white rounded-lg p-2 sm:p-2.5 flex items-center gap-2.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 border border-[#E2DFD9]">
                  <img src={tile.photo} alt={tile.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-xs sm:text-[13px] text-zinc-900 truncate">
                    {tile.title}
                  </div>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-[#F7F6F3] border border-[#E2DFD9] font-mono text-[9.5px] font-semibold text-zinc-600">
                    {tile.tag}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-md bg-[#F7F6F3] border border-[#E2DFD9] flex items-center justify-center text-amber-600 shrink-0 hidden sm:flex">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Direct 2026/27 Top-Flight Club Quick-Picker */}
      <section className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 text-left">
        <div className="bg-white rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-bold text-zinc-900">
                2026/27 Top-Flight Clubs (A–Z)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Includes promoted Coventry Sky Blues, Hull, and Ipswich. Tap any club to start.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllClubs((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-[11px] font-display font-bold text-zinc-800 cursor-pointer transition-colors"
            >
              {showAllClubs ? 'Show Featured 8' : `View All ${sorted2026Clubs.length}`}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {displayedQuickClubs.map((club) => {
              const isPromoted26 = PROMOTED_2026_27_IDS.has(club.id);
              return (
                <Link
                  key={club.id}
                  href={`/career/setup?slot=slot_1&club=${club.id}`}
                  className="group rounded-xl border border-[#E2DFD9] bg-[#F7F6F3] hover:bg-white hover:border-amber-500/70 transition-all overflow-hidden text-left"
                >
                  <div
                    className="h-1 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${club.primaryColor}, ${club.secondaryColor})`,
                    }}
                  />
                  <div className="p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-zinc-700 bg-white border border-[#E2DFD9] px-1.5 py-0.5 rounded">
                        {club.shortName}
                      </span>
                      {isPromoted26 ? (
                        <span className="font-mono text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          26/27 UP
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-semibold text-zinc-600">
                          {formatBudgetCompact(club.startingBudget)}
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-xs text-zinc-900 group-hover:text-amber-700 truncate">
                      {getEffectiveClubName(club)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secondary Deck: Draft Mode, Daily Scenario & Quick Formats */}
      <section aria-label="Quick Draft Modes" className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
        <article className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 flex flex-col">
          <div className="bg-white rounded-xl p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F6F3] text-zinc-700 border border-[#E2DFD9]">
                  11 Rounds
                </span>
                <span className="font-mono text-[10px] font-semibold text-zinc-500">Classic Draft</span>
              </div>
              <h2 className="text-sm font-display font-bold text-zinc-900">11-Pick Matchday Draft</h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Pick a tactical shape, draft 11 stars across eras, and simulate a full 38-match campaign.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartDraft}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs cursor-pointer transition-colors"
            >
              Play Tactical Draft
            </button>
          </div>
        </article>

        <article className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 flex flex-col">
          <div className="bg-white rounded-xl p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                    dailyStatus.completed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {dailyStatus.completed ? 'Completed Today' : 'Daily Scenario'}
                </span>
                <span className="font-mono text-[10px] font-semibold text-zinc-500">
                  Streak {streakStats.currentDailyStreak}d
                </span>
              </div>
              <h2 className="text-sm font-display font-bold text-zinc-900">
                {todayChallenge ? todayChallenge.title : 'Daily Scenario Challenge'}
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {todayChallenge
                  ? todayChallenge.description
                  : 'Complete today’s squad-building constraint to extend your daily streak.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onPlayDailyChallenge}
              className="w-full py-2.5 px-4 rounded-xl font-display font-bold text-xs text-zinc-950 cursor-pointer transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)',
                border: '1px solid #B45309',
              }}
            >
              {dailyStatus.completed ? 'Replay Daily Draft' : 'Play Daily Scenario'}
            </button>
          </div>
        </article>

        <article className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 flex flex-col">
          <div className="bg-white rounded-xl p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F6F3] text-zinc-700 border border-[#E2DFD9]">
                  Instant Sim
                </span>
                <span className="font-mono text-[10px] font-semibold text-zinc-500">Auto XI</span>
              </div>
              <h2 className="text-sm font-display font-bold text-zinc-900">Random XI &amp; Records</h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Generate a balanced surprise XI for fast 38-game runs, or inspect past draft campaigns.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRandomDraft || onStartDraft}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs cursor-pointer transition-colors"
              >
                Random XI
              </button>
              <button
                type="button"
                onClick={onViewHistory}
                className="py-2.5 px-3.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-800 font-display font-bold text-xs cursor-pointer transition-colors"
              >
                History
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* Bottom Clubhouse Records Strip */}
      <section aria-label="Clubhouse Records" className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1">
        <div className="bg-white rounded-xl p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
          <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
            <div className="text-[10px] font-semibold text-zinc-500">Draft Campaigns</div>
            <div className="text-base font-display font-bold text-zinc-900 font-mono mt-0.5">
              {streakStats.gamesPlayed || 0}
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
            <div className="text-[10px] font-semibold text-zinc-500">Best Draft Wins</div>
            <div className="text-base font-display font-bold text-emerald-700 font-mono mt-0.5">
              {personalBests.overall?.bestWins ?? 0}
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
            <div className="text-[10px] font-semibold text-zinc-500">Best Points</div>
            <div className="text-base font-display font-bold text-zinc-900 font-mono mt-0.5">
              {personalBests.overall?.bestPoints ?? streakStats.bestPoints ?? 0}
            </div>
          </div>
          <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
            <div className="text-[10px] font-semibold text-zinc-500">Highest Squad</div>
            <div className="text-base font-display font-bold text-amber-700 font-mono mt-0.5">
              {personalBests.overall?.bestSquadRating ?? 0}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
