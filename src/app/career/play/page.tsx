'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCareerSave, saveCareerSave, deleteCareerSave, exportCareerSaveAsJson, hydrateCareerSaveVault, isValidSlotId, ValidSlotId } from '../../../career/saves';
import { ensureCareerDatabaseLoaded, getCareerDatabaseLoadError } from '../../../career/databaseExpansion';
import {
  CareerSaveFile,
  CareerSettings,
  LeagueFixture,
  Club,
  CurrencyPreference,
  CupFixture,
  BoardConfidenceChange,
  CupTournament,
  ManagerMessage,
  MarketPlayer,
  CareerPlayer,
  ActionType,
} from '../../../career/types';
import { getEffectiveClubName, getAllClubs, getClubsWithUserClub } from '../../../career/clubs';
import { validateSettings } from '../../../career/settings';
import {
  formatCareerDate,
  formatCareerCurrency,
} from '../../../career/formatters';
import { getSavedTheme, saveTheme } from '../../../utils/storage';
import { isSfxEnabled, toggleSfxEnabled, playUiTap } from '../../../utils/soundEffects';
import { CareerErrorBoundary } from '../../../components/career/CareerErrorBoundary';
import { OfficeDeadlineHeroTakeover } from '../../../components/career/OfficeDeadlineHeroTakeover';
import {
  IconCheck,
  IconChevronDown,
  IconBarChart,
  IconTrophy,
  IconSave,
  IconMedkit,
  IconClose,
  IconHome,
  IconCrown,
  IconMedal,
  IconTrendingUp,
  IconVolumeOn,
  IconVolumeOff,
} from '../../../components/career/GameIcons';
import { SectionHeader, Eyebrow, Tag, Button, StatRow } from '@/components/ui';

function TabPanelFallback() {
  return (
    <div className="office-floating-card rounded-xl p-8 text-center text-sm text-[var(--ink-muted)]">
      Loading...
    </div>
  );
}

const SquadManagement = dynamic(
  () => import('../../../components/career/SquadManagement').then((m) => ({ default: m.SquadManagement })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const FixturesCalendar = dynamic(
  () => import('../../../components/career/FixturesCalendar').then((m) => ({ default: m.FixturesCalendar })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const LeagueTable = dynamic(
  () => import('../../../components/career/LeagueTable').then((m) => ({ default: m.LeagueTable })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const TournamentsHub = dynamic(
  () => import('../../../components/career/TournamentsHub').then((m) => ({ default: m.TournamentsHub })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const TransferHub = dynamic(
  () => import('../../../components/career/TransferHub').then((m) => ({ default: m.TransferHub })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const ClubLegacyView = dynamic(
  () => import('../../../components/career/ClubLegacyView').then((m) => ({ default: m.ClubLegacyView })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);
const CareerSettingsTab = dynamic(
  () => import('../../../components/career/CareerSettingsTab').then((m) => ({ default: m.CareerSettingsTab })),
  { ssr: false, loading: () => <TabPanelFallback /> }
);

const MatchDayModal = dynamic(
  () => import('../../../components/career/MatchDayModal').then((m) => ({ default: m.MatchDayModal })),
  { ssr: false }
);
const MatchOverviewModal = dynamic(
  () => import('../../../components/career/MatchOverviewModal').then((m) => ({ default: m.MatchOverviewModal })),
  { ssr: false }
);
const InstantMatchSummaryModal = dynamic(
  () => import('../../../components/career/InstantMatchSummaryModal').then((m) => ({ default: m.InstantMatchSummaryModal })),
  { ssr: false }
);
const InstantSimLoadingModal = dynamic(
  () => import('../../../components/career/InstantSimLoadingModal').then((m) => ({ default: m.InstantSimLoadingModal })),
  { ssr: false }
);
const CelebrationModal = dynamic(
  () => import('../../../components/career/CelebrationModal').then((m) => ({ default: m.CelebrationModal })),
  { ssr: false }
);
const PreseasonTourModal = dynamic(
  () => import('../../../components/career/PreseasonTourModal').then((m) => ({ default: m.PreseasonTourModal })),
  { ssr: false }
);
const FixtureReleaseModal = dynamic(
  () => import('../../../components/career/FixtureReleaseModal').then((m) => ({ default: m.FixtureReleaseModal })),
  { ssr: false }
);
const ChampionsLeagueDrawModal = dynamic(
  () => import('../../../components/career/ChampionsLeagueDrawModal').then((m) => ({ default: m.ChampionsLeagueDrawModal })),
  { ssr: false }
);
const PlayerComparisonModal = dynamic(
  () => import('../../../components/career/PlayerComparisonModal').then((m) => ({ default: m.PlayerComparisonModal })),
  { ssr: false }
);
const SquadRegistrationModal = dynamic(
  () => import('../../../components/career/SquadRegistrationModal').then((m) => ({ default: m.SquadRegistrationModal })),
  { ssr: false }
);

import { isSeasonComplete, advanceToNextSeason, getSeasonReviewSummary, SeasonReviewSummary } from '../../../career/seasons';
import {
  shouldShowPreseasonPrompt,
  applyPreseasonTourChoice,
  simulateAssistantPreseasonMatch,
} from '../../../career/preseason';
import { applyChampionsLeagueDraw, LeaguePhaseOpponent } from '../../../career/championsLeague';
import {
  applyMatchdayFinancials,
  processPayrollSettlement,
} from '../../../career/finance';
import { PreseasonTourId } from '../../../career/types';
import { getNextClubFixture, getNextScheduledMatch, getPreviousPlayedMatch, isDateInInternationalBreak, ScheduledMatch } from '../../../career/calendar';
import {
  simulateMatchFixture,
  advanceTimeSkip,
  TimeSkipTarget,
  resolveActiveUserMatchdaySquad,
  prepareSingleAiMatchdaySquad,
  simulateAiLeagueRoundWithSquads,
  applySingleMatchdayProgression,
} from '../../../career/sim';
import {
  getInjuryDurationReductionWeeks,
  getFitnessRecoveryModifier,
  getTrainingXpModifier,
} from '../../../career/infrastructure';
import { detectCelebrationEvent, CelebrationEvent } from '../../../career/celebrations';
import {
  CUP_IDS,
  findAnyClub,
  simulateKnockoutCupFixture,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  autoResolvePendingCupFixtures,
} from '../../../career/cups';

import {
  markMessageRead,
  markAllMessagesRead,
  getInitialInboxMessages,
  classifyInboxMessage,
  getManagerialAlerts,
  markMessageResolved,
  evaluateDressingRoomDynamics,
  resolveDressingRoomConfrontation,
} from '../../../career/inbox';
import { calculateStandings } from '../../../career/table';
import { formatCurrency } from '../../../career/finance';
import { getSeniorPlayerCount } from '../../../career/squad';
import {
  evaluateBoardConfidence,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
} from '../../../career/transfers';
import { updatePlayerForm, applyInSeasonMatchProgression } from '../../../career/formAndProgression';
import { applySimulatedMatchSquadImpact } from '../../../career/matchEngine';
import { updateTacticalFamiliarity, getInitialClubTactics } from '../../../career/tactics';
import { generatePostMatchPressConference } from '../../../career/pressConferences';
import {
  acceptManagerJobOffer,
  evaluateBoardUltimatumAndCarousel,
  generateEmergencyReboundOffers,
} from '../../../career/managerCareer';

type CareerTab = 'overview' | 'squad' | 'fixtures' | 'transfers' | 'table' | 'cups' | 'legacy' | 'settings';

function formatOrdinalRank(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatOfficeShortDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1] || 'Jan'} ${year}`;
}

function formatOfficeFixtureDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]} ${day} ${months[month - 1]} ${year}`;
}

function formatOfficeBudget(amount: number, currency: CurrencyPreference = 'GBP'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    const str = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sym}${str}M`;
  }
  if (amount >= 1_000) {
    return `${sym}${Math.round(amount / 1_000)}k`;
  }
  return `${sym}${amount}`;
}

function formatOfficeWageRoom(weeklyAmount: number, currency: CurrencyPreference = 'GBP'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  const safeWeekly = Math.max(0, weeklyAmount);
  if (safeWeekly >= 1_000_000) {
    const m = safeWeekly / 1_000_000;
    const str = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sym}${str}M/wk`;
  }
  const k = Math.round(safeWeekly / 1_000);
  return `${sym}${k}k/wk`;
}

function isClubStripedKit(club: Club, displayName: string): boolean {
  const lowerName = displayName.toLowerCase();
  const stripedIds = new Set([
    'newcastle',
    'tyneside',
    'tyneside_stripes',
    'brighton',
    'brighton_seagulls',
    'brentford',
    'west_london_bees',
    'southampton',
    'crystal_palace',
    'south_london_eagles',
    'sunderland',
    'wearside_red_white',
    'sheffield_utd',
    'ac_milan',
    'inter_milan',
    'juventus',
    'atletico_madrid',
    'barcelona',
  ]);
  return (
    stripedIds.has(club.id) ||
    lowerName.includes('stripe') ||
    lowerName.includes('tyneside') ||
    lowerName.includes('magpie') ||
    (club.primaryColor.toLowerCase() === '#111111' && club.secondaryColor.toLowerCase() === '#ffffff') ||
    (club.primaryColor.toLowerCase() === '#000000' && club.secondaryColor.toLowerCase() === '#ffffff')
  );
}

function getOfficeClub(clubId: string, fallback: Club): Club {
  const found = findAnyClub(clubId);
  if (found) {
    if (found.id === 'tyneside_stripes') {
      return { ...found, stadiumName: 'Riverside Park' };
    }
    return found;
  }
  if (clubId.toLowerCase() === 'seaside_town') {
    return {
      id: 'seaside_town',
      defaultName: 'Seaside Town',
      shortName: 'SEA',
      tier: 'mid',
      startingBudget: 35_000_000,
      wageBudgetWeekly: 1_200_000,
      primaryColor: '#1d5eff',
      secondaryColor: '#ffffff',
      stadiumName: 'Riverside Park',
      stadiumCapacity: 32000,
      reputation: 74,
    };
  }
  return fallback;
}

function OfficeClubJerseySvg({
  club,
  displayName,
  size = 'lg',
  uid,
  className = '',
}: {
  club: Club;
  displayName: string;
  size?: 'lg' | 'sm';
  uid: string;
  className?: string;
}) {
  const striped = isClubStripedKit(club, displayName);
  const primary = club.primaryColor || '#dc2626';
  const secondary = striped && (club.id === 'tyneside_stripes' || displayName.toLowerCase().includes('tyneside'))
    ? '#ffffff'
    : (club.secondaryColor || '#ffffff');
  const isLightPrimary =
    primary.toLowerCase() === '#ffffff' ||
    primary.toLowerCase() === '#f8fafc' ||
    primary.toLowerCase() === '#eab308' ||
    primary.toLowerCase() === '#fdb913';
  const trimColor = isLightPrimary ? '#1e293b' : '#ffffff';

  const clipId = `kit-clip-${uid}`;
  const shadeId = `kit-shade-${uid}`;
  const sheenId = `kit-sheen-${uid}`;
  const dropId = `kit-drop-${uid}`;
  const maskFadeId = `kit-fade-${uid}`;
  const maskId = `kit-mask-${uid}`;

  const shirtPath =
    'M 38 12 C 44 16, 52 18, 60 18 C 68 18, 76 16, 82 12 L 106 24 L 116 52 L 95 60 L 88 42 L 88 102 C 88 105, 85 107, 81 107 L 39 107 C 35 107, 32 105, 32 102 L 32 42 L 25 60 L 4 52 L 14 24 Z';

  if (size === 'sm') {
    return (
      <svg
        viewBox="0 0 120 114"
        className={`w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 drop-shadow-2xs ${className}`}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={shirtPath} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="120" height="114" fill={primary} />
          {striped && (
            <g fill={secondary}>
              <rect x="14" y="0" width="11" height="114" />
              <rect x="36" y="0" width="11" height="114" />
              <rect x="58" y="0" width="11" height="114" />
              <rect x="80" y="0" width="11" height="114" />
              <rect x="102" y="0" width="11" height="114" />
            </g>
          )}
        </g>
        <path
          d={shirtPath}
          fill="none"
          stroke="rgba(15,23,42,0.28)"
          strokeWidth="3.5"
        />
        <path
          d="M 42 13 Q 60 27 78 13"
          fill="none"
          stroke={trimColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 114"
      className={`w-[104px] h-[94px] sm:w-[116px] sm:h-[104px] select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shirtPath} />
        </clipPath>
        <linearGradient id={shadeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
          <stop offset="18%" stopColor="#000000" stopOpacity="0.06" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="68%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="85%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
        </linearGradient>
        <radialGradient id={sheenId} cx="46%" cy="32%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
        <linearGradient id={maskFadeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="82%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="120" height="114" fill={`url(#${maskFadeId})`} />
        </mask>
        <filter id={dropId} x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.24" />
        </filter>
      </defs>

      <g filter={`url(#${dropId})`} mask={`url(#${maskId})`}>
        <g clipPath={`url(#${clipId})`}>
          {/* Base Jersey Color */}
          <rect x="0" y="0" width="120" height="114" fill={primary} />

          {/* Vertical Stripes for Striped Clubs or Subtle Tonal Pinstripes for Solid Kits */}
          {striped ? (
            <g fill={secondary}>
              <rect x="4" y="0" width="10" height="114" />
              <rect x="24" y="0" width="11" height="114" />
              <rect x="45" y="0" width="10" height="114" />
              <rect x="65" y="0" width="10" height="114" />
              <rect x="85" y="0" width="11" height="114" />
              <rect x="106" y="0" width="10" height="114" />
            </g>
          ) : (
            <g opacity="0.11" fill="#000000">
              <rect x="38" y="0" width="3" height="114" />
              <rect x="49" y="0" width="3" height="114" />
              <rect x="60" y="0" width="3" height="114" />
              <rect x="71" y="0" width="3" height="114" />
              <rect x="82" y="0" width="3" height="114" />
            </g>
          )}

          {/* Sleeve Raglan Seams */}
          <path d="M 38 12 Q 33 28 32 42" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
          <path d="M 82 12 Q 87 28 88 42" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
          <path d="M 38 12 L 32 42" stroke="rgba(0,0,0,0.24)" strokeWidth="2" fill="none" />
          <path d="M 82 12 L 88 42" stroke="rgba(0,0,0,0.24)" strokeWidth="2" fill="none" />

          {/* Sleeve Cuffs with Dual Trim */}
          <path
            d="M 4 49 L 26 57 L 25 61 L 3 53 Z"
            fill={striped ? '#18181b' : trimColor}
          />
          <path
            d="M 5.5 45.5 L 27 53.5 L 26.2 55.5 L 4.8 47.5 Z"
            fill={striped ? '#f59e0b' : trimColor}
            opacity="0.9"
          />
          <path
            d="M 116 49 L 94 57 L 95 61 L 117 53 Z"
            fill={striped ? '#18181b' : trimColor}
          />
          <path
            d="M 114.5 45.5 L 93 53.5 L 93.8 55.5 L 115.2 47.5 Z"
            fill={striped ? '#f59e0b' : trimColor}
            opacity="0.9"
          />

          {/* 3D Cylindrical Shading & Specular Chest Sheen */}
          <rect x="0" y="0" width="120" height="114" fill={`url(#${shadeId})`} />
          <rect x="0" y="0" width="120" height="114" fill={`url(#${sheenId})`} />

          {/* Soft Fabric Drape Folds */}
          <path
            d="M 44 42 Q 47 75 41 104"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 74 45 Q 71 76 77 104"
            stroke="rgba(0,0,0,0.14)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Sculpted Crew/V Neck Collar */}
        <path
          d="M 38 11 Q 60 20 82 11 Q 78 24 60 25 Q 42 24 38 11 Z"
          fill="#1e293b"
        />
        <path
          d="M 37 11.5 Q 60 27 83 11.5"
          fill="none"
          stroke={striped ? '#18181b' : trimColor}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M 39.5 11 Q 60 24.5 80.5 11"
          fill="none"
          stroke={striped ? '#f59e0b' : primary}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Fictional Shield Badge on Left Chest */}
        <g transform="translate(67, 32)">
          <path
            d="M 0 0 L 13 0 L 13 8.5 C 13 14, 6.5 17.5, 6.5 17.5 C 6.5 17.5, 0 14, 0 8.5 Z"
            fill="#ffffff"
            stroke={striped ? '#d97706' : '#f1f5f9'}
            strokeWidth="1.4"
          />
          <path
            d="M 2 2 L 11 2 L 11 8 C 11 12, 6.5 14.8, 6.5 14.8 C 6.5 14.8, 2 12, 2 8 Z"
            fill={striped ? '#18181b' : primary}
          />
          <path
            d="M 2 6.5 L 6.5 3 L 11 6.5 L 6.5 12 Z"
            fill={striped ? '#f59e0b' : '#ffffff'}
            opacity="0.9"
          />
        </g>
      </g>
    </svg>
  );
}

function OfficeStadiumSceneSvg() {
  return (
    <div
      className="absolute inset-x-0 top-0 h-[212px] sm:h-[224px] rounded-xl pointer-events-none overflow-hidden select-none [mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%)]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 260"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="office-sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cce4fe" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#dff0ff" stopOpacity="0.92" />
            <stop offset="76%" stopColor="#ecf4fe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f1f6fe" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="office-top-header-veil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f4f8ff" stopOpacity="0.88" />
            <stop offset="65%" stopColor="#eff6ff" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="office-stand-left" x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.76" />
            <stop offset="55%" stopColor="#4338ca" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="office-stand-right" x1="100%" y1="0%" x2="0%" y2="40%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.76" />
            <stop offset="55%" stopColor="#4338ca" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="office-beam-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="45%" stopColor="#bae6fd" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="office-beam-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="45%" stopColor="#e9d5ff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="office-bottom-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f1f6fe" stopOpacity="0" />
            <stop offset="62%" stopColor="#f1f6fe" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#f1f6fe" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Sky Base */}
        <rect x="0" y="0" width="600" height="260" fill="url(#office-sky-grad)" />

        {/* Soft Billowy Daytime Clouds */}
        <g fill="#ffffff" opacity="0.92">
          <circle cx="210" cy="54" r="38" />
          <circle cx="255" cy="44" r="48" />
          <circle cx="305" cy="48" r="52" />
          <circle cx="355" cy="46" r="46" />
          <circle cx="398" cy="58" r="36" />
          <circle cx="150" cy="70" r="30" opacity="0.75" />
          <circle cx="450" cy="70" r="30" opacity="0.75" />
        </g>

        {/* Stadium Bowl, Roof Canopies & Grandstands (Shifted down to keep top metadata crisp) */}
        <g transform="translate(0, 22)">
          {/* Distant Center Stadium Bowl Tiers */}
          <path
            d="M 155 152 Q 300 124 445 152 L 465 196 L 135 196 Z"
            fill="#94a3b8"
            opacity="0.28"
          />
          <path
            d="M 170 148 Q 300 120 430 148"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            opacity="0.35"
          />
          <path
            d="M 162 164 Q 300 138 438 164"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            opacity="0.5"
          />

          {/* Left Stadium Roof Canopy & Steel Trusses */}
          <path d="M -10 24 L 185 72 L 162 90 L -10 56 Z" fill="#475569" opacity="0.55" />
          <path d="M -10 36 L 176 78 L 164 88 L -10 54 Z" fill="#1e293b" opacity="0.65" />
          <g stroke="#e2e8f0" strokeWidth="1.4" opacity="0.68">
            <line x1="12" y1="36" x2="20" y2="54" />
            <line x1="36" y1="42" x2="42" y2="59" />
            <line x1="62" y1="48" x2="66" y2="64" />
            <line x1="88" y1="54" x2="90" y2="69" />
            <line x1="114" y1="60" x2="114" y2="74" />
            <line x1="140" y1="66" x2="138" y2="79" />
          </g>

          {/* Right Stadium Roof Canopy & Steel Trusses */}
          <path d="M 610 24 L 415 72 L 438 90 L 610 56 Z" fill="#475569" opacity="0.55" />
          <path d="M 610 36 L 424 78 L 436 88 L 610 54 Z" fill="#1e293b" opacity="0.65" />
          <g stroke="#e2e8f0" strokeWidth="1.4" opacity="0.68">
            <line x1="588" y1="36" x2="580" y2="54" />
            <line x1="564" y1="42" x2="558" y2="59" />
            <line x1="538" y1="48" x2="534" y2="64" />
            <line x1="512" y1="54" x2="510" y2="69" />
            <line x1="486" y1="60" x2="486" y2="74" />
            <line x1="460" y1="66" x2="462" y2="79" />
          </g>

          {/* Left & Right Grandstand Tiers */}
          <path d="M -10 60 L 200 108 L 200 215 L -10 215 Z" fill="url(#office-stand-left)" />
          <path d="M 610 60 L 400 108 L 400 215 L 610 215 Z" fill="url(#office-stand-right)" />

          {/* Stadium Tier LED Ribbons (Red/White/Blue Broadcast Accents) */}
          <path d="M -10 102 L 190 136" stroke="#ef4444" strokeWidth="4" opacity="0.72" />
          <path d="M -10 106 L 190 139" stroke="#ffffff" strokeWidth="2" opacity="0.82" />
          <path d="M -10 138 L 195 162" stroke="#ef4444" strokeWidth="3.5" opacity="0.62" />
          <path d="M -10 142 L 195 165" stroke="#3b82f6" strokeWidth="2.5" opacity="0.62" />
          <path d="M -10 172 L 195 186" stroke="#ef4444" strokeWidth="3" opacity="0.48" />

          <path d="M 610 102 L 410 136" stroke="#ef4444" strokeWidth="4" opacity="0.72" />
          <path d="M 610 106 L 410 139" stroke="#ffffff" strokeWidth="2" opacity="0.82" />
          <path d="M 610 138 L 405 162" stroke="#ef4444" strokeWidth="3.5" opacity="0.62" />
          <path d="M 610 142 L 405 165" stroke="#3b82f6" strokeWidth="2.5" opacity="0.62" />
          <path d="M 610 172 L 405 186" stroke="#ef4444" strokeWidth="3" opacity="0.48" />

          {/* Floodlight Beams & Glowing Nodes */}
          <g className="office-stadium-lights">
            <polygon points="0,48 255,136 165,205 -10,115" fill="url(#office-beam-left)" />
            <polygon points="600,48 345,136 435,205 610,115" fill="url(#office-beam-right)" />
            <circle cx="24" cy="52" r="4.5" fill="#ffffff" />
            <circle cx="54" cy="58" r="4" fill="#ffffff" />
            <circle cx="84" cy="64" r="3.5" fill="#ffffff" />
            <circle cx="114" cy="70" r="3" fill="#ffffff" />
            <circle cx="576" cy="52" r="4.5" fill="#ffffff" />
            <circle cx="546" cy="58" r="4" fill="#ffffff" />
            <circle cx="516" cy="64" r="3.5" fill="#ffffff" />
            <circle cx="486" cy="70" r="3" fill="#ffffff" />
          </g>
        </g>

        {/* Top Luminous Sky Veil behind Fixture Date & Venue */}
        <rect x="0" y="0" width="600" height="76" fill="url(#office-top-header-veil)" />

        {/* Feather Fade into Open Canvas */}
        <rect x="0" y="155" width="600" height="105" fill="url(#office-bottom-fade)" />
      </svg>
    </div>
  );
}

/** Board confidence log: how many recent changes are kept on the save. */
const BOARD_CONFIDENCE_LOG_LIMIT = 12;

/** Played fixtures involving the user's club, league and cups, keyed so ids cannot clash across competitions. */
function getUserPlayedFixtures(save: CareerSaveFile): Map<string, LeagueFixture | CupFixture> {
  const userClubId = save.club.id;
  const played = new Map<string, LeagueFixture | CupFixture>();
  for (const f of save.fixtures || []) {
    if (f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)) played.set(`league:${f.id}`, f);
  }
  for (const [cupId, tourney] of Object.entries(save.cups || {})) {
    for (const f of tourney.fixtures) {
      if (f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)) played.set(`${cupId}:${f.id}`, f);
    }
  }
  return played;
}

/**
 * Infers a short plain reason for a board confidence change from what else changed between two
 * versions of the same save. Pure; the first matching case wins, so add new cases in priority order.
 */
function inferBoardConfidenceReason(prev: CareerSaveFile, next: CareerSaveFile): string {
  // 1. A match involving the user's club was played.
  const prevPlayed = getUserPlayedFixtures(prev);
  const nextPlayed = getUserPlayedFixtures(next);
  if (nextPlayed.size > prevPlayed.size) {
    let latest: LeagueFixture | CupFixture | null = null;
    for (const [key, f] of nextPlayed) {
      if (!prevPlayed.has(key) && (!latest || f.date >= latest.date)) latest = f;
    }
    if (latest && latest.homeScore !== undefined && latest.awayScore !== undefined) {
      const userIsHome = latest.homeClubId === next.club.id;
      const goalsFor = userIsHome ? latest.homeScore : latest.awayScore;
      const goalsAgainst = userIsHome ? latest.awayScore : latest.homeScore;
      const opponentId = userIsHome ? latest.awayClubId : latest.homeClubId;
      const opponent = findAnyClub(opponentId);
      const opponentName = opponent ? getEffectiveClubName(opponent, next.club) : 'opponent';
      let verb = goalsFor > goalsAgainst ? 'Won' : goalsFor < goalsAgainst ? 'Lost' : 'Drew';
      let suffix = '';
      if (goalsFor === goalsAgainst && latest.penalties) {
        const pensFor = userIsHome ? latest.penalties.homePenalties : latest.penalties.awayPenalties;
        const pensAgainst = userIsHome ? latest.penalties.awayPenalties : latest.penalties.homePenalties;
        if (pensFor !== pensAgainst) {
          verb = pensFor > pensAgainst ? 'Won' : 'Lost';
          suffix = ' on penalties';
        }
      }
      return `${verb} ${goalsFor}-${goalsAgainst} v ${opponentName}${suffix}`;
    }
    return 'Match result';
  }

  // 2. A press conference was answered (the active conference flips to answered).
  const prevConference = prev.pressState?.activeConference;
  const nextConference = next.pressState?.activeConference;
  if (nextConference?.answered && !(prevConference?.id === nextConference.id && prevConference.answered)) {
    return 'Press conference';
  }

  // 3. A trophy was added (trophy list, or a trophy/title celebration key).
  const prevMilestones = new Set(prev.celebratedMilestones || []);
  const newTrophyMilestone = (next.celebratedMilestones || []).some(
    (key) => !prevMilestones.has(key) && /_cup_trophy_|_league_champions/.test(key)
  );
  if ((next.trophies?.length ?? 0) > (prev.trophies?.length ?? 0) || newTrophyMilestone) {
    return 'Trophy won';
  }

  // 4. A new season started.
  if (next.season.seasonNumber !== prev.season.seasonNumber) return 'End-of-season review';

  // 5. A request was put to the board.
  if ((next.finances.boardPetitionsHistory?.length ?? 0) > (prev.finances.boardPetitionsHistory?.length ?? 0)) {
    return 'Board request';
  }

  return 'Board review';
}

/**
 * Returns the save to store: `next` itself when nothing needs recording, otherwise a copy whose
 * boardStatus.confidenceLog has the change prepended (newest first, capped). Never mutates `next`.
 * The log is carried over from `prev` when game code rebuilt boardStatus without it.
 */
function withBoardConfidenceLog(prev: CareerSaveFile | null, next: CareerSaveFile): CareerSaveFile {
  const prevBoard = prev?.boardStatus;
  const nextBoard = next.boardStatus;
  if (!prev || !prevBoard || !nextBoard) return next;
  // A different career (import, slot switch) or a new club is a fresh start, not a change.
  if (prev.id !== next.id || prev.createdAt !== next.createdAt || prev.club.id !== next.club.id) return next;

  const baseLog = nextBoard.confidenceLog ?? prevBoard.confidenceLog;
  const confidence = Math.round(nextBoard.confidence);
  const delta = confidence - Math.round(prevBoard.confidence);
  if (!Number.isFinite(delta) || delta === 0) {
    if (baseLog === nextBoard.confidenceLog) return next;
    return { ...next, boardStatus: { ...nextBoard, confidenceLog: baseLog } };
  }

  const entry: BoardConfidenceChange = {
    date: next.season.currentDate,
    delta,
    confidence,
    reason: inferBoardConfidenceReason(prev, next),
  };
  return {
    ...next,
    boardStatus: {
      ...nextBoard,
      confidenceLog: [entry, ...(baseLog || [])].slice(0, BOARD_CONFIDENCE_LOG_LIMIT),
    },
  };
}

function CareerPlayHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const slotId: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';

  const [save, setSave] = useState<CareerSaveFile | null>(() => {
    if (typeof window !== 'undefined') {
      return loadCareerSave(slotId);
    }
    return null;
  });
  const [vaultReady, setVaultReady] = useState(false);
  const [theme] = useState<'dark' | 'light'>('light');
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => isSfxEnabled());
  const rawTab = searchParams.get('tab');
  const validTabs: CareerTab[] = ['overview', 'squad', 'fixtures', 'table', 'cups', 'legacy', 'transfers', 'settings'];
  const initialTab: CareerTab =
    rawTab && validTabs.includes(rawTab as CareerTab) ? (rawTab as CareerTab) : 'overview';
  const [activeTab, setActiveTab] = useState<CareerTab>(initialTab);
  const [squadInitialViewMode, setSquadInitialViewMode] = useState<'pitch' | 'list' | 'academy' | 'training' | 'tactics'>('pitch');
  const [tabHistory, setTabHistory] = useState<CareerTab[]>([]);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedSackedModal, setDismissedSackedModal] = useState(false);
  const [activeMatchFixture, setActiveMatchFixture] = useState<LeagueFixture | CupFixture | null>(null);
  const [matchOverviewModal, setMatchOverviewModal] = useState<{
    type: 'result' | 'preview';
    fixture: LeagueFixture | CupFixture;
  } | null>(null);
  const [instantSimResultModal, setInstantSimResultModal] = useState<LeagueFixture | CupFixture | null>(null);
  const [instantSimLoadingData, setInstantSimLoadingData] = useState<{
    simmedFixture: LeagueFixture | CupFixture;
    updatedSave: CareerSaveFile;
    homeClub: Club;
    awayClub: Club;
    competitionTitle: string;
    roundTitle: string;
  } | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'action_required' | 'unread' | 'board' | 'injury' | 'transfer' | 'match_report' | 'cup_draw'>('all');
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [pendingFastForward, setPendingFastForward] = useState<TimeSkipTarget | null>(null);
  const [fastForwardUsePreferredEleven, setFastForwardUsePreferredEleven] = useState(true);
  const [seasonReviewOpenSection, setSeasonReviewOpenSection] = useState<'growth' | 'division' | null>(null);
  const [fastForwardHaltOnTransferMilestone, setFastForwardHaltOnTransferMilestone] = useState<'deadline' | 'window_open_or_close' | 'none'>('deadline');
  const [showSeasonReviewModal, setShowSeasonReviewModal] = useState(false);
  const [transferHubSubTab, setTransferHubSubTab] = useState<'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board' | 'scouting' | 'infrastructure' | 'feeder' | 'media'>('market');
  const [focusedOfferId, setFocusedOfferId] = useState<string | undefined>(undefined);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);
  const [inboxShowAll, setInboxShowAll] = useState(false);
  const [showPreseasonModal, setShowPreseasonModal] = useState(false);
  const [showFixtureReleasePromptModal, setShowFixtureReleasePromptModal] = useState(false);
  const [showFixtureReleaseModal, setShowFixtureReleaseModal] = useState(false);
  const [showUclDrawModal, setShowUclDrawModal] = useState(false);
  const [showOfficeInboxModal, setShowOfficeInboxModal] = useState(false);
  const [showOfficeSeasonDrawer, setShowOfficeSeasonDrawer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleSfx = useCallback(() => {
    const next = toggleSfxEnabled();
    setSfxEnabled(next);
  }, []);

  // Latest save handed to storage. State can lag when several updates land in one tick,
  // so confidence changes are measured against this ref, not the render's `save`.
  const latestSaveRef = useRef<CareerSaveFile | null>(save);
  useEffect(() => {
    latestSaveRef.current = save;
  }, [save]);

  /** Single write path: records any board confidence change, then persists and sets state. */
  const commitSave = useCallback((next: CareerSaveFile): CareerSaveFile => {
    const logged = withBoardConfidenceLog(latestSaveRef.current, next);
    latestSaveRef.current = logged;
    saveCareerSave(logged);
    setSave(logged);
    return logged;
  }, []);

  // Auto-prompt pre-season tour selection or fixture release day
  useEffect(() => {
    if (!save) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (shouldShowPreseasonPrompt(save)) {
        setShowPreseasonModal(true);
      } else if (
        save.season.currentDate >= `${save.season.yearStart}-07-08` &&
        !save.fixtureReleaseState?.released
      ) {
        setShowFixtureReleasePromptModal(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [save]);

  useEffect(() => {
    if (
      !save ||
      !isTransferDeadlineDay(save.season.currentDate, save.season.yearStart) ||
      save.deadlineDayState?.isActive ||
      save.deadlineDayState?.phase === 'closed'
    ) {
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const initialized = initializeDeadlineDay(save);
      commitSave(initialized);
    });
    return () => {
      cancelled = true;
    };
  }, [commitSave, save]);

  // Global Escape keyboard shortcut for modal navigation & accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showOfficeInboxModal) {
          setShowOfficeInboxModal(false);
        } else if (matchOverviewModal) {
          setMatchOverviewModal(null);
        } else if (pendingFastForward) {
          setPendingFastForward(null);
        } else if (instantSimResultModal) {
          setInstantSimResultModal(null);
        } else if (showExitConfirmModal) {
          setShowExitConfirmModal(false);
        } else if (activeCelebration) {
          setActiveCelebration(null);
        } else if (showSeasonReviewModal) {
          setShowSeasonReviewModal(false);
        } else if (showPreseasonModal) {
          setShowPreseasonModal(false);
        } else if (showFixtureReleaseModal) {
          setShowFixtureReleaseModal(false);
        } else if (showFixtureReleasePromptModal) {
          setShowFixtureReleasePromptModal(false);
        } else if (showUclDrawModal) {
          setShowUclDrawModal(false);
        } else if (showOfficeSeasonDrawer) {
          setShowOfficeSeasonDrawer(false);
        } else if (showResetConfirm) {
          setShowResetConfirm(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showOfficeInboxModal,
    matchOverviewModal,
    pendingFastForward,
    instantSimResultModal,
    showExitConfirmModal,
    activeCelebration,
    showSeasonReviewModal,
    showPreseasonModal,
    showFixtureReleaseModal,
    showFixtureReleasePromptModal,
    showUclDrawModal,
    showOfficeSeasonDrawer,
    showResetConfirm,
  ]);

  const checkAndTriggerCelebration = useCallback((saveCandidate: CareerSaveFile, fixture?: LeagueFixture | CupFixture) => {
    const celebration = detectCelebrationEvent(saveCandidate, fixture);
    if (celebration) {
      commitSave(celebration.updatedSave);
      setActiveCelebration(celebration.event);
      return celebration.updatedSave;
    }
    return saveCandidate;
  }, [commitSave]);

  // Scroll management & targeted deep-linking ref
  const pendingScrollTargetRef = useRef<{
    id: string;
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
  } | null>(null);

  const scrollToTarget = useCallback((
    targetId: string,
    options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition }
  ) => {
    if (typeof window === 'undefined') return;
    const behavior = options?.behavior ?? 'smooth';
    const block = options?.block ?? 'nearest';

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior, block });
        el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-950', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-950');
        }, 2500);
        return true;
      }
      return false;
    };

    if (!tryScroll()) {
      setTimeout(() => {
        if (!tryScroll()) {
          setTimeout(() => {
            if (!tryScroll()) {
              // Graceful fallback to top of page
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }
          }, 150);
        }
      }, 60);
    }
  }, []);

  const navigateToSection = useCallback((
    tab: typeof activeTab,
    subTab?: typeof transferHubSubTab,
    targetId?: string
  ) => {
    setIsMoreMenuOpen(false);
    const isSpecificItem = Boolean(targetId && !targetId.endsWith('-section'));
    if (isSpecificItem && targetId) {
      pendingScrollTargetRef.current = { id: targetId, behavior: 'smooth', block: 'nearest' };
    } else {
      pendingScrollTargetRef.current = null;
    }

    const tabChanged = activeTab !== tab;
    const subTabChanged = subTab !== undefined && transferHubSubTab !== subTab;

    if (subTab) {
      setTransferHubSubTab(subTab);
    }
    if (tabChanged) {
      setActiveTab(tab);
    }

    if (!tabChanged && !subTabChanged) {
      if (isSpecificItem && targetId) {
        pendingScrollTargetRef.current = null;
        scrollToTarget(targetId, { behavior: 'smooth', block: 'nearest' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, transferHubSubTab, scrollToTarget]);

  const TAB_ORDER: CareerTab[] = useMemo(
    () => ['overview', 'squad', 'fixtures', 'transfers', 'table', 'cups', 'legacy', 'settings'],
    []
  );

  const handleTabChange = useCallback((newTab: CareerTab, addToHistory: boolean = true) => {
    setIsMoreMenuOpen(false);
    playUiTap();
    if (activeTab === newTab) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      if (addToHistory) {
        setTabHistory(prev => [...prev.slice(-15), activeTab]);
      }
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      const newIndex = TAB_ORDER.indexOf(newTab);
      if (newIndex > currentIndex) {
        setSlideDirection('right');
      } else if (newIndex < currentIndex) {
        setSlideDirection('left');
      }
      pendingScrollTargetRef.current = null;
      setActiveTab(newTab);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, TAB_ORDER]);

  const handleLogoClick = useCallback(() => {
    if (activeTab !== 'overview') {
      setTabHistory([]);
      handleTabChange('overview', false);
    } else {
      setShowExitConfirmModal(true);
    }
  }, [activeTab, handleTabChange]);

  const handleHeaderBack = handleLogoClick;

  const goToNextTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex < TAB_ORDER.length - 1) {
      const nextTab = TAB_ORDER[currentIndex + 1];
      setTabHistory(prev => [...prev.slice(-15), activeTab]);
      setSlideDirection('right');
      setIsMoreMenuOpen(false);
      pendingScrollTargetRef.current = null;
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, TAB_ORDER]);

  const goToPrevTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      const prevTab = TAB_ORDER[currentIndex - 1];
      setTabHistory(prev => [...prev.slice(-15), activeTab]);
      setSlideDirection('left');
      setIsMoreMenuOpen(false);
      pendingScrollTargetRef.current = null;
      setActiveTab(prevTab);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, TAB_ORDER]);

  const handleTouchStartCapture = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    // Don't intercept touches inside interactive elements with their own drag or horizontal scrolling
    // Ignore touches in menus, sub-navs, tab lists, filter chips, or horizontal scroll containers (excluding tables)
    if (
      target.closest(
        'input, select, textarea, [role="dialog"], [data-no-swipe="true"], [data-player-id], nav, [role="tablist"], .scrollbar-none, [data-scrollable-menu="true"]'
      )
    ) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    // Also check if any ancestor has horizontal scrollability (e.g. scrollWidth > clientWidth) that is not a table
    let curr: HTMLElement | null = target;
    while (curr && curr !== e.currentTarget) {
      if (curr.tagName === 'TABLE') {
        // Allow table swipes to bubble up so league table remains easily swipable
        break;
      }
      const overflowX = window.getComputedStyle(curr).overflowX;
      if ((overflowX === 'auto' || overflowX === 'scroll') && curr.scrollWidth > curr.clientWidth) {
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        return;
      }
      curr = curr.parentElement;
    }

    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEndCapture = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Fast horizontal swipe gesture (distance > 45px, more horizontal than vertical by 1.35x, duration < 550ms)
    if (duration < 550 && Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      if (deltaX < 0) {
        // Swipe left -> go to next tab
        goToNextTab();
      } else {
        // Swipe right -> go to previous tab
        goToPrevTab();
      }
    }
  };

  useEffect(() => {
    if (pendingScrollTargetRef.current?.id) {
      const target = pendingScrollTargetRef.current;
      pendingScrollTargetRef.current = null;
      scrollToTarget(target.id, { behavior: target.behavior, block: target.block });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, transferHubSubTab, scrollToTarget]);

  // Reusable Player Comparison state
  const [comparisonState, setComparisonState] = useState<{
    isOpen: boolean;
    playerA?: CareerPlayer | MarketPlayer;
    playerB?: CareerPlayer | MarketPlayer;
  }>({ isOpen: false });

  // Squad 25-man registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);

  // Managerial alerts & Inbox derived states
  const allInbox = useMemo(() => {
    if (!save) return [];
    return save.inbox && save.inbox.length > 0 ? save.inbox : getInitialInboxMessages(save);
  }, [save]);

  const managerialAlerts = useMemo(() => {
    if (!save) return [];
    return getManagerialAlerts(save);
  }, [save]);

  const actionableAlerts = useMemo(() => {
    return managerialAlerts.filter((a) => a.classification === 'action_required');
  }, [managerialAlerts]);

  const handleExecuteAlertAction = (alert: {
    actionTab?: string;
    actionType?: ActionType;
    targetId?: string;
  }) => {
    if (alert.actionType === 'squad_registration') {
      setShowRegistrationModal(true);
    } else if (alert.actionType === 'review_offer') {
      const offerId = alert.targetId || (save?.incomingOffers && save.incomingOffers.length > 0 ? save.incomingOffers[0].id : undefined);
      setFocusedOfferId(offerId);
      navigateToSection('transfers', 'incoming', offerId ? `incoming-offer-${offerId}` : 'incoming-offers-section');
    } else if (alert.actionType === 'review_contract') {
      setFocusedOfferId(undefined);
      navigateToSection('transfers', 'contracts', alert.targetId ? `contract-player-${alert.targetId}` : 'contracts-section');
    } else if (alert.actionType === 'deadline_clock') {
      setFocusedOfferId(undefined);
      navigateToSection('overview', undefined, 'deadline-day-hero');
    } else if (alert.actionType === 'open_squad' || alert.actionType === 'review_injury') {
      navigateToSection('squad', undefined, alert.targetId ? `squad-player-${alert.targetId}` : 'squad-pitch-section');
    } else if (alert.actionType === 'view_cup_draw') {
      navigateToSection('cups', undefined, alert.targetId ? `cup-tournament-${alert.targetId}` : 'tournament-desk-section');
    } else if (alert.actionType === 'respond_board') {
      navigateToSection('transfers', 'board', 'board-room-section');
    } else if (alert.actionType === 'open_scouting') {
      navigateToSection('transfers', 'scouting', 'transfer-scouting-section');
    } else if (alert.actionType === 'open_facilities') {
      navigateToSection('transfers', 'infrastructure', 'transfer-infrastructure-section');
    } else if (alert.actionType === 'open_press_conference') {
      navigateToSection('transfers', 'media', 'transfer-media-section');
    } else if (alert.actionType === 'open_feeder_network') {
      navigateToSection('transfers', 'feeder', 'transfer-feeder-section');
    } else if (alert.actionType === 'open_job_offers') {
      navigateToSection('transfers', 'board', 'job-offers-section');
    } else if (alert.actionType === 'respond_ultimatum') {
      navigateToSection('transfers', 'board', 'board-room-section');
    } else if (alert.actionType === 'promise_game_time') {
      setShowOfficeInboxModal(true);
      if (alert.targetId) {
        setExpandedMessageId(alert.targetId);
      }
    } else if (alert.actionTab) {
      const targetSub = alert.actionTab === 'transfers' ? 'market' : undefined;
      navigateToSection(alert.actionTab as typeof activeTab, targetSub);
    }
  };

  const handleSwapLineup = (starterId: string, benchId: string) => {
    if (!save || !save.lineup) return;
    const starterIdx = save.lineup.starterIds.indexOf(starterId);
    const benchIdx = save.lineup.benchIds.indexOf(benchId);
    if (starterIdx !== -1 && benchIdx !== -1) {
      const nextStarters = [...save.lineup.starterIds];
      const nextBench = [...save.lineup.benchIds];
      nextStarters[starterIdx] = benchId;
      nextBench[benchIdx] = starterId;
      const updatedSave: CareerSaveFile = {
        ...save,
        lineup: {
          ...save.lineup,
          formation: save.lineup.formation || '4-3-3',
          starterIds: nextStarters,
          benchIds: nextBench,
        },
      };
      handleUpdateSave(updatedSave);
      showToast('Lineup updated.');
    } else {
      showToast('Players must be in starting XI and bench to swap.');
    }
  };

  const navigateToIncomingOffers = (specificOfferId?: string) => {
    const offerId = specificOfferId || (save?.incomingOffers && save.incomingOffers.length > 0 ? save.incomingOffers[0].id : undefined);
    setFocusedOfferId(offerId);
    navigateToSection('transfers', 'incoming', offerId ? `incoming-offer-${offerId}` : 'incoming-offers-section');
  };

  // Settings editing state (when not locked)
  const [editableSettings, setEditableSettings] = useState<CareerSettings | null>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.settings || null;
    }
    return null;
  });
  const [editingClubName, setEditingClubName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.club.customName || loaded?.club.defaultName || '';
    }
    return '';
  });

  const [dbLoadError, setDbLoadError] = useState<string | null>(null);

  const [currentSlotId, setCurrentSlotId] = useState(slotId);
  if (currentSlotId !== slotId) {
    setCurrentSlotId(slotId);
    const loaded = loadCareerSave(slotId);
    setSave(loaded);
    setEditableSettings(loaded?.settings || null);
    setEditingClubName(loaded?.club.customName || loaded?.club.defaultName || '');
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      hydrateCareerSaveVault(),
      ensureCareerDatabaseLoaded('all'),
    ])
      .then(([, dbLoaded]) => {
        if (cancelled) return;
        const loaded = loadCareerSave(slotId);
        setSave(loaded);
        setEditableSettings(loaded?.settings || null);
        setEditingClubName(loaded?.club.customName || loaded?.club.defaultName || '');
        if (!dbLoaded) {
          setDbLoadError(getCareerDatabaseLoadError() || 'Expanded player database could not be fetched (offline or network error).');
        } else {
          setDbLoadError(null);
        }
        setVaultReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDbLoadError(getCareerDatabaseLoadError() || 'Expanded player database could not be loaded.');
          setVaultReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  useEffect(() => {
    saveTheme(theme);

    if (!save || !save.cups) return;
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      const { updatedCups, trophiesAwarded } = autoResolvePendingCupFixtures(
        save.cups!,
        save.season.currentDate,
        save.season.yearStart,
        save.club.id
      );

      let hasChanges = trophiesAwarded.length > 0;
      if (!hasChanges) {
        for (const [k, v] of Object.entries(updatedCups)) {
          const oldV = save.cups![k];
          if (!oldV || oldV.currentRound !== v.currentRound || oldV.fixtures.some((f, idx) => f.played !== v.fixtures[idx]?.played)) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        const trophies = [...(save.trophies || [])];
        const finances = { ...save.finances };
        const nextYearStart = save.season.yearStart + 1;

        for (const aw of trophiesAwarded) {
          if (!trophies.some((t) => t.competitionId === aw.id && t.year === nextYearStart)) {
            trophies.push({
              competitionId: aw.id,
              competitionName: aw.name,
              year: nextYearStart,
            });
            const prize = updatedCups[aw.id]?.prizeMoney || 0;
            finances.transferBudget += prize;
            finances.balance += prize;
          }
        }

        const updatedSave: CareerSaveFile = {
          ...save,
          cups: updatedCups,
          trophies,
          finances,
        };
        const finalSave = checkAndTriggerCelebration(updatedSave);
        commitSave(finalSave);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [checkAndTriggerCelebration, commitSave, save, theme]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = () => {
    const json = exportCareerSaveAsJson(slotId);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my11_career_${slotId}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Save backup exported.');
  };

  const handleSaveSettings = () => {
    if (!save || !editableSettings) return;

    const updatedSettings: CareerSettings = {
      ...(save.settings.locked ? save.settings : validateSettings(editableSettings)),
      dateFormat: editableSettings.dateFormat || 'uk',
      currency: editableSettings.currency || 'GBP',
      wageUnit: editableSettings.wageUnit || 'weekly',
      heightUnit: editableSettings.heightUnit || 'ft_in',
      weightUnit: editableSettings.weightUnit || 'kg',
      numberFormat: editableSettings.numberFormat || 'comma',
    };

    const updated: CareerSaveFile = {
      ...save,
      club: {
        ...save.club,
        customName: editingClubName.trim() || undefined,
      },
      settings: updatedSettings,
    };

    commitSave(updated);
    setEditableSettings(updatedSettings);
    showToast('Settings saved.');
  };

  const handleResetSaveSlot = () => {
    deleteCareerSave(slotId);
    router.push('/career');
  };

  const handleUpdateSave = (updated: CareerSaveFile) => {
    // Every save update passes through commitSave, which records board confidence changes.
    commitSave(updated);
    setEditableSettings(updated.settings);
    setEditingClubName(updated.club.customName || updated.club.defaultName);
  };

  const allClubs = getClubsWithUserClub(save?.club, save?.activeLeagueClubIds, save?.settings?.databaseSeason);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const nextScheduled = save ? getNextScheduledMatch(save) : null;
  const nextFixture = nextScheduled ? nextScheduled.fixture : null;
  const prevScheduled = save ? getPreviousPlayedMatch(save) : null;
  const intlBreakStatus = save ? isDateInInternationalBreak(save.season.currentDate) : { isActive: false, name: '', resumeDate: '' };
  const seasonCompleted = save ? isSeasonComplete(save.fixtures, save.club.id) : false;
  const seasonSummary = save && seasonCompleted ? getSeasonReviewSummary(save) : null;
  const isDeadlineActive = Boolean(
    save &&
    (save.deadlineDayState?.isActive ||
      (isTransferDeadlineDay(save.season.currentDate, save.season.yearStart) && save.deadlineDayState?.phase !== 'closed'))
  );

  const handleAdvanceDeadlinePhase = () => {
    if (!save) return;
    let cur = save;
    if (!cur.deadlineDayState?.isActive) {
      cur = initializeDeadlineDay(cur);
    }
    const res = advanceDeadlineDayPhase(cur);
    handleUpdateSave(res.updatedSave);
    if (res.summary) {
      showToast(res.summary);
    }
  };

  const getFastForwardDetails = (target: TimeSkipTarget) => {
    switch (target) {
      case 'next_match': {
        const targetDate = nextScheduled ? formatCareerDate(nextScheduled.fixture.date, save?.settings.dateFormat || 'uk', 'long') : 'the next scheduled match';
        return {
          title: 'Advance to next match',
          badge: 'Next match',
          targetDate,
        };
      }
      case 'next_week': {
        return {
          title: 'Fast forward 7 days',
          badge: '+7 days',
          targetDate: 'one week ahead',
        };
      }
      case 'next_month': {
        return {
          title: 'Fast forward 1 month',
          badge: '+1 month',
          targetDate: '30 days ahead',
        };
      }
      case 'transfer_deadline': {
        return {
          title: 'Advance to deadline day',
          badge: 'Deadline day',
          targetDate: '1 Sep / 1 Feb',
        };
      }
      case 'season_end': {
        return {
          title: 'Simulate to season end',
          badge: 'Season end',
          targetDate: 'round 38, the final day',
        };
      }
      case 'continue':
      default: {
        return {
          title: 'Advance calendar',
          badge: 'Continue',
          targetDate: 'the next day',
        };
      }
    }
  };

  const handlePlayNextMatchInstant = () => {
    if (!save || !nextScheduled) return;

    // 1. Guard against Deadline Day clock in progress
    if (save.deadlineDayState?.isActive && save.deadlineDayState.phase !== 'closed') {
      showToast('Transfer deadline day is in progress. Advance the deadline clock or finalize deals before simulating matches.');
      return;
    }

    const summerDeadline = `${save.season.yearStart}-09-01`;
    const winterDeadline = `${save.season.yearStart + 1}-02-01`;
    const fixDate = nextScheduled.fixture.date;

    // 2. Halt if Instant Sim would jump over Summer Deadline Day (1st September)
    if (save.season.currentDate < summerDeadline && fixDate >= summerDeadline) {
      let deadlineSave: CareerSaveFile = {
        ...save,
        season: {
          ...save.season,
          currentDate: summerDeadline,
        },
      };
      deadlineSave = initializeDeadlineDay(deadlineSave);
      commitSave(deadlineSave);
      showToast('Transfer deadline day has arrived. The summer window shuts tonight at 23:00 BST. Complete your transfer and squad registration business.');
      return;
    }

    // 3. Halt if Instant Sim would jump over Winter Deadline Day (1st February)
    if (save.season.currentDate < winterDeadline && fixDate >= winterDeadline) {
      let deadlineSave: CareerSaveFile = {
        ...save,
        season: {
          ...save.season,
          currentDate: winterDeadline,
        },
      };
      deadlineSave = initializeDeadlineDay(deadlineSave);
      commitSave(deadlineSave);
      showToast('Transfer deadline day has arrived. The winter window shuts tonight at 23:00 BST.');
      return;
    }

    setSimulating(true);

    const isUserHome = nextScheduled.fixture.homeClubId === save.club.id;
    const isUserAway = nextScheduled.fixture.awayClubId === save.club.id;

    // Preserve user's chosen lineup; replace only injured, suspended, or (in league) unregistered starters
    const activeSquad = resolveActiveUserMatchdaySquad(save.squad, save, !nextScheduled.isCup, true);
    const injuryReduction = getInjuryDurationReductionWeeks(save);
    const recoveryMod = getFitnessRecoveryModifier(save);
    const xpMod = getTrainingXpModifier(save);

    if (nextScheduled.isCup && nextScheduled.cupId && save.cups && save.cups[nextScheduled.cupId]) {
      const cupTourney = save.cups[nextScheduled.cupId];
      const cupFix = nextScheduled.fixture as CupFixture;
      const homeClub = findAnyClub(cupFix.homeClubId) || allClubs[0];
      const awayClub = findAnyClub(cupFix.awayClubId) || allClubs[1];
      const aiOpponentClub = isUserHome ? awayClub : homeClub;

      const aiSnapshot: Record<string, CareerPlayer[]> = {};
      if (save.aiClubSquads) {
        for (const [cid, sq] of Object.entries(save.aiClubSquads)) {
          aiSnapshot[cid] = sq.map((p) => ({ ...p }));
        }
      }
      const daysSince = Math.max(
        1,
        Math.round(
          (new Date(cupFix.date).getTime() - new Date(save.season.currentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const opponentAi = prepareSingleAiMatchdaySquad(
        aiSnapshot,
        aiOpponentClub,
        save.settings?.databaseSeason,
        daysSince
      );

      const simmed = simulateKnockoutCupFixture(
        cupFix,
        homeClub,
        awayClub,
        isUserHome ? activeSquad : opponentAi.matchdaySquad,
        isUserAway ? activeSquad : opponentAi.matchdaySquad
      );

      const updatedFixtures = cupTourney.fixtures.map((f) => (f.id === simmed.id ? simmed : f));
      let updatedTourney: CupTournament = {
        ...cupTourney,
        fixtures: updatedFixtures,
      };

      updatedTourney = simulateAiFixturesInCupRound(updatedTourney, cupFix.roundName, save.club.id);
      const adv = advanceCupTournament(updatedTourney, save.season.yearStart);
      updatedTourney = adv.updatedTournament;

      const updatedCups = {
        ...save.cups,
        [nextScheduled.cupId]: updatedTourney,
      };

      const trophies = [...(save.trophies || [])];
      const finances = { ...save.finances };

      if (adv.updatedTournament.isCompleted && adv.updatedTournament.winnerClubId === save.club.id) {
        const trophyYear = save.season.yearStart + 1;
        if (!trophies.some((t) => t.competitionId === nextScheduled.cupId && t.year === trophyYear)) {
          trophies.push({
            competitionId: nextScheduled.cupId,
            competitionName: adv.updatedTournament.name,
            year: trophyYear,
          });
          finances.transferBudget += adv.updatedTournament.prizeMoney;
          finances.balance += adv.updatedTournament.prizeMoney;
        }
      }

      // Update player fitness, bench recovery, injury healing, morale, form, and youth development
      const updatedSquad = applySimulatedMatchSquadImpact(
        save.squad,
        activeSquad,
        simmed,
        save.club.id,
        save.settings,
        save.trainingState?.teamFocus,
        injuryReduction,
        recoveryMod,
        xpMod
      );

      const nextCupDate = cupFix.date > save.season.currentDate ? cupFix.date : save.season.currentDate;
      let updatedSave: CareerSaveFile = {
        ...save,
        season: {
          ...save.season,
          currentDate: nextCupDate,
        },
        cups: updatedCups,
        trophies,
        finances,
        squad: updatedSquad,
        aiClubSquads: Object.keys(aiSnapshot).length > 0 ? aiSnapshot : save.aiClubSquads,
        tactics: updateTacticalFamiliarity(
          save.tactics || getInitialClubTactics(save.squad),
          true,
          save.trainingState?.teamFocus
        ),
      };

      const isEurope =
        nextScheduled.cupId === CUP_IDS.EURO_CHAMPIONS ||
        nextScheduled.cupId === CUP_IDS.EURO_CHALLENGE ||
        nextScheduled.cupId === CUP_IDS.EURO_PLATE;
      updatedSave = applyMatchdayFinancials(updatedSave, cupFix, isUserHome, isEurope ? 'europe' : 'cup');
      updatedSave = processPayrollSettlement(updatedSave, nextCupDate);
      updatedSave = applySingleMatchdayProgression(updatedSave, nextCupDate);
      updatedSave = evaluateBoardUltimatumAndCarousel(updatedSave, simmed);
      updatedSave = generatePostMatchPressConference(updatedSave, simmed);
      updatedSave = evaluateDressingRoomDynamics(updatedSave, updatedSave.season.currentDate);

      setInstantSimLoadingData({
        simmedFixture: simmed,
        updatedSave,
        homeClub,
        awayClub,
        competitionTitle: adv.updatedTournament.name,
        roundTitle: cupFix.roundName,
      });
      return;
    }

    // League Match Simulation
    const leagueFix = nextScheduled.fixture as LeagueFixture;
    const homeClub = clubsMap.get(leagueFix.homeClubId) || allClubs[0];
    const awayClub = clubsMap.get(leagueFix.awayClubId) || allClubs[1];
    const opponentClub = isUserHome ? awayClub : homeClub;

    const aiSnapshot: Record<string, CareerPlayer[]> = {};
    if (save.aiClubSquads) {
      for (const [cid, sq] of Object.entries(save.aiClubSquads)) {
        aiSnapshot[cid] = sq.map((p) => ({ ...p }));
      }
    }
    const daysSince = Math.max(
      1,
      Math.round(
        (new Date(leagueFix.date).getTime() - new Date(save.season.currentDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const opponentAi = prepareSingleAiMatchdaySquad(
      aiSnapshot,
      opponentClub,
      save.settings?.databaseSeason,
      daysSince
    );

    const simmed = simulateMatchFixture(
      leagueFix,
      homeClub,
      awayClub,
      isUserHome ? activeSquad : opponentAi.matchdaySquad,
      !isUserHome ? activeSquad : opponentAi.matchdaySquad,
      isUserHome ? save.tactics : undefined,
      !isUserHome ? save.tactics : undefined
    );

    const baseFixtures = (save.fixtures || []).map((f) => (f.id === simmed.id ? simmed : f));
    const aiRoundRes = simulateAiLeagueRoundWithSquads(
      save,
      baseFixtures,
      leagueFix.round,
      simmed.id,
      clubsMap,
      allClubs,
      opponentClub,
      simmed,
      opponentAi
    );
    const updatedFixtures = aiRoundRes.updatedFixtures;
    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    // Update player fitness, bench recovery, injury healing, morale, form, and youth development
    const updatedSquad = applySimulatedMatchSquadImpact(
      save.squad,
      activeSquad,
      simmed,
      save.club.id,
      save.settings,
      save.trainingState?.teamFocus,
      injuryReduction,
      recoveryMod,
      xpMod
    );

    const nextDate = leagueFix.date > save.season.currentDate ? leagueFix.date : save.season.currentDate;
    let updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: nextDate,
      },
      fixtures: updatedFixtures,
      standings: updatedStandings,
      squad: updatedSquad,
      aiClubSquads: aiRoundRes.updatedAiClubSquads,
      tactics: updateTacticalFamiliarity(
        save.tactics || getInitialClubTactics(save.squad),
        true,
        save.trainingState?.teamFocus
      ),
    };

    updatedSave = applyMatchdayFinancials(updatedSave, leagueFix, isUserHome, 'league');
    updatedSave = processPayrollSettlement(updatedSave, nextDate);
    updatedSave = applySingleMatchdayProgression(updatedSave, nextDate);
    updatedSave = evaluateBoardUltimatumAndCarousel(updatedSave, simmed);
    updatedSave = generatePostMatchPressConference(updatedSave, simmed);
    updatedSave = evaluateDressingRoomDynamics(updatedSave, updatedSave.season.currentDate);

    setInstantSimLoadingData({
      simmedFixture: simmed,
      updatedSave,
      homeClub,
      awayClub,
      competitionTitle: 'English Top Flight',
      roundTitle: `Matchday ${leagueFix.round} of 38`,
    });
  };

  const handleSkipInternationalBreak = () => {
    if (!save) return;
    const intlBreak = isDateInInternationalBreak(save.season.currentDate);
    if (!intlBreak.isActive || !intlBreak.resumeDate) return;

    setSimulating(true);
    const updatedSquad = save.squad.map((p) => {
      if (!p.injured) return p;
      const remaining = Math.max(0, (p.injuryWeeks || 1) - 2);
      return {
        ...p,
        injured: remaining > 0,
        injuryWeeks: remaining,
        injuryDescription: remaining === 0 ? undefined : p.injuryDescription,
      };
    });

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: intlBreak.resumeDate,
      },
      squad: updatedSquad,
    };

    commitSave(updatedSave);
    setSimulating(false);
    showToast(`Fast-forwarded past ${intlBreak.name}. Squad returned to training.`);
  };

  const handleAdvanceToNextSeasonAction = () => {
    if (!save) return;
    setSimulating(true);
    const { updatedSave } = advanceToNextSeason(save);
    commitSave(updatedSave);
    setSimulating(false);
    showToast(`Welcome to season ${updatedSave.season.seasonNumber}. Summer transfer window open.`);
  };

  const handleToggleMessageRead = (msgId: string) => {
    if (!save) return;
    const currentInbox = save.inbox && save.inbox.length > 0 ? save.inbox : getInitialInboxMessages(save);
    const targetMsg = currentInbox.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.isRead) {
      const updated = markMessageRead(save, msgId);
      handleUpdateSave(updated);
    }
    setExpandedMessageId((prev) => (prev === msgId ? null : msgId));
  };

  const handleMarkAllMessagesRead = () => {
    if (!save) return;
    const updated = markAllMessagesRead(save);
    handleUpdateSave(updated);
    showToast('All inbox messages marked as read.');
  };

  const handleClearReadMessages = () => {
    if (!save) return;
    const currentInbox = save.inbox && save.inbox.length > 0 ? save.inbox : getInitialInboxMessages(save);
    const retained = currentInbox.filter((m) => {
      if (!m.isRead) return true;
      const cl = classifyInboxMessage(m, save);
      return cl.classification === 'action_required' && !cl.isResolved;
    });
    const clearedCount = currentInbox.length - retained.length;
    if (clearedCount === 0) {
      showToast('No archived read messages to clear.');
      return;
    }
    const updated = {
      ...save,
      inbox: retained,
    };
    handleUpdateSave(updated);
    showToast(`Cleared ${clearedCount} archived message${clearedCount === 1 ? '' : 's'}.`);
  };

  const handleTimeSkipAction = (
    target: TimeSkipTarget,
    options?: {
      usePreferredEleven?: boolean;
      haltOnTransferMilestone?: 'deadline' | 'window_open_or_close' | 'none';
    }
  ) => {
    if (!save) return;
    setSimulating(true);
    const res = advanceTimeSkip(save, target, options);
    const finalSave = checkAndTriggerCelebration(res.updatedSave);
    commitSave(finalSave);
    setSimulating(false);

    if (res.pausedReason) {
      showToast(res.pausedReason);
      if (
        res.pausedReason.includes('Fixture Release') ||
        (finalSave.season.currentDate >= `${finalSave.season.yearStart}-07-08` && !finalSave.fixtureReleaseState?.released)
      ) {
        setShowFixtureReleasePromptModal(true);
      }
    } else {
      showToast(`Calendar advanced (${res.matchesPlayedCount} matches simulated)`);
    }
  };

  const handleMatchResultSaved = (updatedSave: CareerSaveFile) => {
    let enrichedSave = updatedSave;
    if (activeMatchFixture) {
      const resolvedFixture =
        (updatedSave.fixtures || []).find((f) => f.id === activeMatchFixture.id) ||
        Object.values(updatedSave.cups || {})
          .flatMap((c) => c.fixtures || [])
          .find((f) => f.id === activeMatchFixture.id) ||
        activeMatchFixture;
      enrichedSave = evaluateBoardUltimatumAndCarousel(enrichedSave, resolvedFixture);
      enrichedSave = generatePostMatchPressConference(enrichedSave, resolvedFixture);
      enrichedSave = evaluateDressingRoomDynamics(enrichedSave, enrichedSave.season.currentDate);
    }
    const finalSave = checkAndTriggerCelebration(enrichedSave, activeMatchFixture || undefined);
    commitSave(finalSave);
    setActiveMatchFixture(null);
    showToast('Match completed and results saved. Press conference open in the media desk.');
  };

  const handleChoosePreseasonTour = (tourId: PreseasonTourId, delegateToAssistant: boolean) => {
    if (!save) return;
    const updated = applyPreseasonTourChoice(save, tourId, delegateToAssistant);
    commitSave(updated);
    setShowPreseasonModal(false);
    showToast(`Pre-season tour selected: ${tourId === 'usa' ? 'USA' : tourId.charAt(0).toUpperCase() + tourId.slice(1)}. 3 friendlies scheduled.`);
  };

  const handleFinishFixtureRelease = () => {
    if (!save) return;
    const updated: CareerSaveFile = {
      ...save,
      fixtureReleaseState: {
        released: true,
        releaseDate: `${save.season.yearStart}-07-08`,
        hasSeenCeremony: true,
      },
    };
    commitSave(updated);
    setShowFixtureReleaseModal(false);
    showToast('Premier League fixtures released for the new season.');
  };

  const handleFinishUclDraw = (drawnOpponents: LeaguePhaseOpponent[]) => {
    if (!save) return;
    const updated = applyChampionsLeagueDraw(save, drawnOpponents);
    commitSave(updated);
    setShowUclDrawModal(false);
    showToast('UEFA Champions League league phase draw concluded. Fixtures scheduled.');
  };

  const handleSimulateAssistantPreseason = (fixtureId: string) => {
    if (!save) return;
    setSimulating(true);
    const updated = simulateAssistantPreseasonMatch(save, fixtureId);
    commitSave(updated);
    setSimulating(false);
    showToast('Assistant manager simulated the pre-season friendly. Check inbox for the match report.');
  };

  const handleContinueCalendar = () => {
    if (!save) return;
    // 1. If pre-season prompt should be shown, show it first
    if (shouldShowPreseasonPrompt(save)) {
      setShowPreseasonModal(true);
      return;
    }
    // 2. If fixture release pending on or after July 8
    if (save.season.currentDate >= `${save.season.yearStart}-07-08` && !save.fixtureReleaseState?.released) {
      setShowFixtureReleasePromptModal(true);
      return;
    }
    // 3. If UCL draw pending on or after August 27
    if (
      save.season.currentDate >= `${save.season.yearStart}-08-27` &&
      save.europeanLeaguePhaseState &&
      !save.europeanLeaguePhaseState.drawCompleted
    ) {
      setShowUclDrawModal(true);
      return;
    }
    // 4. Advance calendar by 1 day
    handleTimeSkipAction('continue', {
      usePreferredEleven: fastForwardUsePreferredEleven,
      haltOnTransferMilestone: fastForwardHaltOnTransferMilestone,
    });
  };

  if (!save && !vaultReady) {
    return (
      <div className="min-h-screen my11-canvas text-[var(--ink-primary)] font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-xl p-8 border border-[var(--border-subtle)] text-center space-y-2">
          <Eyebrow>MY-11</Eyebrow>
          <h1 className="text-lg font-display font-semibold text-[var(--ink-primary)]">
            Loading manager office...
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            Loading the save and player database for {slotId.replace('_', ' ')}.
          </p>
        </main>
      </div>
    );
  }

  if (!save) {
    return (
      <div className="min-h-screen my11-canvas text-[var(--ink-primary)] font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-xl p-8 border border-[var(--border-subtle)] text-center space-y-4">
          <h1 className="text-xl font-display font-bold text-[var(--ink-primary)]">
            No save found in {slotId.replace('_', ' ')}
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            There is no career save in this slot. You can start a new career or import a backup file.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/career"
              className="flex-1 min-h-10 px-4 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-sm font-semibold text-[var(--ink-primary)] flex items-center justify-center"
            >
              Save slots
            </Link>
            <Link
              href={`/career/setup?slot=${slotId}`}
              className="flex-1 min-h-10 px-4 rounded-lg office-action-btn-primary text-sm font-semibold flex items-center justify-center"
            >
              Start new career
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const effectiveClubName = getEffectiveClubName(save.club);
  const injuredCount = save.squad.filter((p) => p.injured).length;
  const seniorCount = getSeniorPlayerCount(save.squad);
  const incomingOffersCount = save.incomingOffers?.length || 0;
  const boardStatus = save.boardStatus || evaluateBoardConfidence(save);
  const boardConfidence = boardStatus.confidence;

  const standings = save.standings || [];
  const userRankIndex = standings.findIndex((s) => s.clubId === save.club.id);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;
  const userStanding = standings[userRankIndex];

  const fixtures = save.fixtures || [];
  const userPlayedFixtures = fixtures.filter(
    (f) => f.played && (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );
  const recentFormResults = userPlayedFixtures.slice(-5).map((f) => {
    const isHome = f.homeClubId === save.club.id;
    const userScore = isHome ? f.homeScore! : f.awayScore!;
    const oppScore = isHome ? f.awayScore! : f.homeScore!;
    if (userScore > oppScore) return 'W';
    if (userScore === oppScore) return 'D';
    return 'L';
  });

  const previousFixture = userPlayedFixtures.length > 0 ? userPlayedFixtures[userPlayedFixtures.length - 1] : null;
  const previousResultOutcome = previousFixture
    ? (previousFixture.homeClubId === save.club.id
        ? (previousFixture.homeScore! > previousFixture.awayScore! ? 'W' : previousFixture.homeScore === previousFixture.awayScore ? 'D' : 'L')
        : (previousFixture.awayScore! > previousFixture.homeScore! ? 'W' : previousFixture.homeScore === previousFixture.awayScore ? 'D' : 'L'))
    : null;

  // Urgent expiring contracts (<= 1 year remaining) warranting managerial review items
  const urgentExpiringContractPlayers = save.squad
    .filter((p) => (p.contractYears ?? 2) <= 1)
    .sort((a, b) => (a.contractYears ?? 2) - (b.contractYears ?? 2) || b.rating - a.rating);

  // Routine contract reminders (2 years remaining) are accessible through full inbox, not urgent alerts
  const routineContractPlayers = save.squad
    .filter((p) => (p.contractYears ?? 2) === 2)
    .sort((a, b) => b.rating - a.rating);

  // Only surface contract alerts prominently when action is warranted (<= 1 year)
  const contractReviewPlayers = urgentExpiringContractPlayers;
  const officeReviewCount = urgentExpiringContractPlayers.length;
  const unreadInboxCount = allInbox.filter((m) => !m.isRead).length;
  // Mail button badge reflects unread count (e.g. 2 in mockup). Do not classify everything as urgent simply because it's unread.
  const headerBadgeCount = unreadInboxCount > 0 ? unreadInboxCount : (officeReviewCount > 0 ? officeReviewCount : 0);

  const boardSentimentLabel =
    boardConfidence >= 75
      ? 'Delighted'
      : boardConfidence >= 60
      ? 'Satisfied'
      : boardConfidence >= 45
      ? 'Cautious'
      : 'Under pressure';

  return (
    <div
      id="career-office-root"
      data-office-theme="light"
      data-office-active="true"
      data-office-ui="true"
      className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden select-none"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface-card)] border border-[var(--border-crisp)] text-[var(--ink-primary)] px-4 py-2 rounded-xl font-medium text-sm shadow-sm flex items-center gap-2 max-w-[92vw]"
        >
          <IconCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </aside>
      )}

      {/* Main Hub Layout */}
      <main
        data-office-ui="true"
        className="relative z-10 flex-1 w-full max-w-4xl mx-auto flex flex-col gap-2.5 sm:gap-3 px-2 sm:px-4 py-2 sm:py-4 safe-pb"
        onTouchStart={handleTouchStartCapture}
        onTouchEnd={handleTouchEndCapture}
      >
        {/* 1. FLOATING HEADER CARD (UNIVERSAL ACROSS ALL TABS) */}
        <header
          data-office-ui="true"
          className="office-floating-card office-reveal-1 rounded-xl px-2 sm:px-3.5 py-2 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-1.5 select-none"
        >
          {/* Left: MY-11 Brand Mark + Club & Season/Date */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={handleLogoClick}
              data-office-ui="true"
              title={activeTab !== 'overview' ? 'Return to career office' : 'Exit career mode'}
              aria-label={activeTab !== 'overview' ? 'Return to Career Office' : 'Exit Career Mode'}
              className="flex items-center justify-center shrink-0 cursor-pointer min-h-9 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="font-display font-semibold text-sm sm:text-lg tracking-tighter leading-none text-[var(--office-text-primary)]">
                MY-11
              </span>
            </button>

            <div className="w-px h-6 bg-[var(--office-divider)] shrink-0" />

            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-display font-semibold text-sm sm:text-base text-[var(--ink-primary)] leading-tight truncate">
                {effectiveClubName}
              </h1>
              <p className="text-xs text-[var(--ink-muted)] leading-tight truncate mt-0.5">
                {formatOfficeShortDate(save.season.currentDate)}
              </p>
            </div>
          </div>

          {/* Right: Board Confidence Pill + Inbox + Settings */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              data-office-ui="true"
              onClick={() => navigateToSection('transfers', 'board', 'board-room-section')}
              title="Open the boardroom"
              aria-label={`Board confidence ${boardConfidence}%, ${boardSentimentLabel}. Open the boardroom`}
              className="min-h-9 px-1.5 rounded-lg text-left text-xs font-medium leading-tight text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="block min-[430px]:inline whitespace-nowrap">Board {boardConfidence}%</span>
              <span className="hidden min-[430px]:inline"> · </span>
              <span
                className={`block min-[430px]:inline whitespace-nowrap ${
                  boardConfidence >= 60
                    ? 'text-emerald-700'
                    : boardConfidence >= 45
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {boardSentimentLabel}
              </span>
            </button>

            {/* Sound Effects Toggle Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={handleToggleSfx}
              title={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              aria-label={sfxEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              aria-pressed={!sfxEnabled}
              className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {sfxEnabled ? (
                <IconVolumeOn className="w-4 h-4" />
              ) : (
                <IconVolumeOff className="w-4 h-4 text-[var(--ink-muted)]" />
              )}
            </button>

            {/* Inbox Envelope Icon Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setShowOfficeInboxModal(true)}
              title="Open inbox"
              aria-label="Open Managerial Inbox"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z" />
              </svg>
              {headerBadgeCount > 0 && (
                <span data-force-white="true" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#dc2626] text-white font-semibold text-2xs flex items-center justify-center">
                  {headerBadgeCount}
                </span>
              )}
            </button>

            {/* Settings Gear Icon Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('settings')}
              title="Career settings"
              aria-label="Career Settings"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === 'settings' ? 'bg-[var(--surface-elevated)] text-[var(--ink-primary)]' : ''}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </header>

        {/* 2. FLOATING 5-TAB NAVIGATION BAR (UNIVERSAL ACROSS ALL TABS) */}
        <div className="relative z-30 office-reveal-2">
          <nav
            aria-label="Career Navigation"
            data-office-ui="true"
            data-no-swipe="true"
            className="office-floating-card rounded-xl px-1 grid grid-cols-5 select-none overflow-hidden"
          >
            {/* Office */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('overview')}
              aria-current={activeTab === 'overview' ? 'page' : undefined}
              className={`${activeTab === 'overview' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} min-h-12 py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M12 3 3 10h2v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9h2L12 3z" />
              </svg>
              <span className="text-xs font-medium leading-tight">Office</span>
            </button>

            {/* Squad */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('squad')}
              aria-current={activeTab === 'squad' ? 'page' : undefined}
              className={`${activeTab === 'squad' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} min-h-12 py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span className="text-xs font-medium leading-tight">Squad</span>
            </button>

            {/* Fixtures */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('fixtures')}
              aria-current={activeTab === 'fixtures' ? 'page' : undefined}
              className={`${activeTab === 'fixtures' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} min-h-12 py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
              </svg>
              <span className="text-xs font-medium leading-tight">Fixtures</span>
            </button>

            {/* Transfers */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('transfers')}
              aria-current={activeTab === 'transfers' ? 'page' : undefined}
              className={`${activeTab === 'transfers' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} min-h-12 py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
              </svg>
              <span className="text-xs font-medium leading-tight">Transfers</span>
              {incomingOffersCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#f59e0b]" />
              )}
            </button>

            {/* More */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              aria-expanded={isMoreMenuOpen}
              aria-haspopup="true"
              className={`${['table', 'cups', 'legacy'].includes(activeTab) ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} min-h-12 py-1.5 px-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <circle cx="6" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="18" cy="12" r="2" />
              </svg>
              <span className="text-xs font-medium leading-tight inline-flex items-center gap-0.5">
                <span>{activeTab === 'table' ? 'Table' : activeTab === 'cups' ? 'Cups' : activeTab === 'legacy' ? 'Legacy' : 'More'}</span>
                <IconChevronDown className={`w-3 h-3 shrink-0 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
          </nav>

          {/* More Menu Popover */}
          {isMoreMenuOpen && (
            <div
              data-office-ui="true"
              className="office-floating-card absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl p-1.5 shadow-sm"
              role="menu"
            >
              {[
                { id: 'table', label: 'League table', icon: <IconBarChart className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" /> },
                { id: 'cups', label: 'Cups & Europe', icon: <IconTrophy className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" /> },
                { id: 'legacy', label: 'Club legacy', icon: <IconMedal className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  data-office-ui="true"
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  onClick={() => handleTabChange(item.id as CareerTab)}
                  className={`w-full min-h-[44px] px-2.5 rounded-lg text-left flex items-center gap-2.5 cursor-pointer text-sm text-[var(--ink-primary)] ${
                    activeTab === item.id ? 'bg-[var(--surface-elevated)] font-semibold' : 'font-medium hover:bg-[var(--surface-subcard)]'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {activeTab === item.id && <IconCheck className="w-3.5 h-3.5 shrink-0 text-[var(--ink-secondary)]" />}
                </button>
              ))}

              <div className="h-px bg-[var(--office-divider)] my-1" />

              <button
                type="button"
                role="menuitem"
                data-office-ui="true"
                onClick={() => {
                  handleExport();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full min-h-[44px] px-2.5 rounded-lg text-left flex items-center gap-2.5 cursor-pointer font-medium text-sm text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)]"
              >
                <IconSave className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" />
                <span>Back up save</span>
              </button>
            </div>
          )}
        </div>

        {dbLoadError && (
          <div
            role="alert"
            className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900"
          >
            <span className="font-medium">
              {dbLoadError} Transfer market and cup opponent pools may be incomplete until reloaded.
            </span>
            <button
              type="button"
              onClick={() => {
                void ensureCareerDatabaseLoaded('all').then((loaded) => {
                  if (loaded) {
                    setDbLoadError(null);
                    showToast('Expanded player database loaded.');
                  } else {
                    setDbLoadError(getCareerDatabaseLoadError() || 'Still unable to reach player database.');
                  }
                });
              }}
              className="min-h-8 px-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] text-[var(--ink-primary)] font-semibold text-xs cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Carousel Slide Container */}
        <div
          key={activeTab}
          onAnimationEnd={() => setSlideDirection(null)}
          className={`w-full ${
            slideDirection === 'right'
              ? 'animate-tab-slide-right'
              : slideDirection === 'left'
              ? 'animate-tab-slide-left'
              : ''
          }`}
        >
        {/* TAB 1: REDESIGNED CAREER OFFICE SCREEN */}
        {activeTab === 'overview' && (
          <div className="space-y-4">

            {/* 1. COMPACT STATUS STRIP ABOVE FIXTURE (Teal: Finances, Blue: League, Amber: Attention) */}
            {(() => {
              const reviewTotal =
                officeReviewCount > 0
                  ? officeReviewCount
                  : actionableAlerts.length > 0
                  ? actionableAlerts.length
                  : 0;
              const wageHeadroom = Math.max(
                0,
                save.finances.weeklyWageBudget - save.finances.currentWeeklyWages
              );

              return (
                <section
                  aria-label="Key Performance Indicators"
                  data-office-ui="true"
                  className="office-floating-card office-reveal-2 rounded-xl select-none overflow-hidden"
                >
                  <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
                    {/* Metric 1: Transfer Budget */}
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-label={`Transfer Budget ${formatOfficeBudget(save.finances.transferBudget, save.settings.currency)}, Wage room ${formatOfficeWageRoom(wageHeadroom, save.settings.currency)}`}
                      onClick={() => {
                        navigateToSection('transfers', 'market');
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }}
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[var(--surface-subcard)] transition-colors cursor-pointer flex flex-col justify-start gap-0.5 min-h-[64px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                    >
                      <span className="block text-xs font-medium text-[var(--ink-muted)]">Budget</span>
                      <div className="font-display font-semibold text-lg text-[var(--ink-primary)] leading-tight tabular-nums">
                        {formatOfficeBudget(save.finances.transferBudget, save.settings.currency)}
                      </div>
                      <div className="text-xs text-[var(--ink-secondary)]">
                        {formatOfficeWageRoom(wageHeadroom, save.settings.currency)} room
                      </div>
                    </button>

                    {/* Metric 2: League Position */}
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-label={`League Position ${formatOrdinalRank(userRank)}, ${userStanding?.points || 0} points`}
                      onClick={() => handleTabChange('table')}
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[var(--surface-subcard)] transition-colors cursor-pointer flex flex-col justify-start gap-0.5 min-h-[64px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                    >
                      <span className="block text-xs font-medium text-[var(--ink-muted)]">League</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-semibold text-lg text-[var(--ink-primary)] leading-tight tabular-nums">
                          {(userStanding?.played || 0) > 0 ? formatOrdinalRank(userRank) : '–'}
                        </span>
                        <span className="text-xs text-[var(--ink-secondary)] whitespace-nowrap tabular-nums">
                          {userStanding?.points || 0} pts
                        </span>
                      </div>
                      {recentFormResults.length === 0 && (
                        <div className="text-xs text-[var(--ink-secondary)]">No matches yet</div>
                      )}
                      <div className="flex items-center gap-[3px] mt-0.5" aria-label="Recent 5 match form">
                        {recentFormResults.slice(-5).map((res, idx) => (
                          <span
                            key={idx}
                            data-force-white="true"
                            className={`w-4 h-4 rounded-sm text-2xs font-semibold text-white flex items-center justify-center ${
                              res === 'W'
                                ? 'bg-[#047857]'
                                : res === 'D'
                                ? 'bg-[#D97706]'
                                : 'bg-[#DC2626]'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </button>

                    {/* Metric 3: Items for Review */}
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-label={`Items for Review: ${reviewTotal}`}
                      onClick={() => {
                        if (officeReviewCount > 0) {
                          document
                            .getElementById('managerial-alerts')
                            ?.scrollIntoView({ block: 'center' });
                        } else {
                          setShowOfficeInboxModal(true);
                        }
                      }}
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[var(--surface-subcard)] transition-colors cursor-pointer flex flex-col justify-start gap-0.5 min-h-[64px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                    >
                      <span className="block text-xs font-medium text-[var(--ink-muted)]">Review</span>
                      <div
                        className={`font-display font-semibold text-lg leading-tight tabular-nums ${
                          reviewTotal > 0 ? 'text-amber-800' : 'text-[var(--ink-primary)]'
                        }`}
                      >
                        {reviewTotal}
                      </div>
                      <div
                        className={`text-xs ${
                          reviewTotal > 0 ? 'text-amber-800' : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {officeReviewCount > 0
                          ? officeReviewCount === 1
                            ? '1 contract due'
                            : `${officeReviewCount} contracts due`
                          : actionableAlerts.length > 0
                          ? `${actionableAlerts.length} inbox action${actionableAlerts.length > 1 ? 's' : ''}`
                          : 'All clear'}
                      </div>
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* 2. TRANSFER DEADLINE DAY HERO TAKEOVER (WHEN DEADLINE ACTIVE) OR OPEN NEXT FIXTURE HERO STAGE */}
            {isDeadlineActive ? (
              <OfficeDeadlineHeroTakeover
                save={save}
                onUpdateSave={handleUpdateSave}
                onAdvanceDeadlinePhase={handleAdvanceDeadlinePhase}
                onNavigateToTransfers={(subTab, targetId) => navigateToSection('transfers', subTab, targetId)}
                onNotification={showToast}
                nextScheduled={nextScheduled}
                onOpenMatchOverview={(fix) => setMatchOverviewModal({ type: 'preview', fixture: fix })}
                onPlayMatch={(fix) => setActiveMatchFixture(fix)}
                urgentDecisionCount={actionableAlerts.length}
                onReviewUrgentDecisions={() => {
                  if (actionableAlerts[0]) handleExecuteAlertAction(actionableAlerts[0]);
                }}
              />
            ) : nextScheduled ? (
              <section
                aria-label="Next Fixture"
                data-office-ui="true"
                className="office-reveal-3 relative select-none"
              >
                {(() => {
                  const home = getOfficeClub(nextScheduled.fixture.homeClubId, allClubs[0]);
                  const away = getOfficeClub(nextScheduled.fixture.awayClubId, allClubs[1]);
                  const homeName = getEffectiveClubName(home, save.club);
                  const awayName = getEffectiveClubName(away, save.club);

                  const isNeutralWembley =
                    nextScheduled.isCup &&
                    (nextScheduled.cupId === CUP_IDS.SHIELD ||
                      (nextScheduled.roundName === 'Final' &&
                        (nextScheduled.cupId === CUP_IDS.LEAGUE_CUP || nextScheduled.cupId === CUP_IDS.ENGLISH_CUP)) ||
                      (nextScheduled.roundName === 'Semi-Final' && nextScheduled.cupId === CUP_IDS.ENGLISH_CUP));

                  const venueDisplay = isNeutralWembley
                    ? 'Wembley Stadium'
                    : (home.stadiumName || 'Riverside Park');

                  const isPreseasonMatch = nextScheduled.cupId === CUP_IDS.PRESEASON;
                  const isAssistantDelegated = isPreseasonMatch && Boolean(save.preseasonState?.delegatedToAssistant);

                  return (
                    <div className="space-y-3">
                      {/* Next fixture card: plain header, then the two kits */}
                      <div className="office-floating-card rounded-xl p-3.5 sm:p-4">
                        <SectionHeader
                          as="h2"
                          title="Next fixture"
                          meta={
                            nextScheduled.cupId === CUP_IDS.PRESEASON
                              ? `${save.preseasonState?.tournamentName || 'Pre-season tour'}`
                              : nextScheduled.isCup
                              ? `${nextScheduled.cupName} · ${nextScheduled.roundName}`
                              : `Matchday ${(nextScheduled.fixture as LeagueFixture).round} of 38`
                          }
                        />
                        <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                          {formatOfficeFixtureDate(nextScheduled.fixture.date)} · {venueDisplay}
                        </p>

                        <div className="pt-4">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-0.5">
                            {/* Home Club Kit */}
                            <div className="flex flex-col items-center text-center min-w-0 office-kit-enter-left">
                              <OfficeClubJerseySvg
                                club={home}
                                displayName={homeName}
                                uid="office-hero-home"
                              />
                              <h3 className="font-display font-semibold text-base text-[var(--ink-primary)] truncate max-w-full mt-1.5">
                                {homeName}
                              </h3>
                              <span className="text-xs text-[var(--ink-muted)]">
                                {isNeutralWembley ? 'Neutral' : 'Home'}
                              </span>
                            </div>

                            {/* Center VS */}
                            <div className="flex flex-col items-center justify-center px-1.5 -mt-5">
                              <span className="text-sm text-[var(--ink-muted)]">
                                vs
                              </span>
                            </div>

                            {/* Away Club Kit */}
                            <div className="flex flex-col items-center text-center min-w-0 office-kit-enter-right">
                              <OfficeClubJerseySvg
                                club={away}
                                displayName={awayName}
                                uid="office-hero-away"
                              />
                              <h3 className="font-display font-semibold text-base text-[var(--ink-primary)] truncate max-w-full mt-1.5">
                                {awayName}
                              </h3>
                              <span className="text-xs text-[var(--ink-muted)]">
                                {isNeutralWembley ? 'Neutral' : 'Away'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Hierarchy: Tactile Amber Primary CTA + Clean V11 Secondary Pills */}
                      <div className="relative z-10 space-y-2">
                        <Button
                          type="button"
                          data-office-ui="true"
                          disabled={simulating}
                          onClick={() => {
                            if (shouldShowPreseasonPrompt(save)) {
                              setShowPreseasonModal(true);
                              return;
                            }
                            if (
                              save.season.currentDate < `${save.season.yearStart}-07-08` &&
                              nextScheduled.fixture.date >= `${save.season.yearStart}-07-08` &&
                              !save.fixtureReleaseState?.released
                            ) {
                              setShowFixtureReleasePromptModal(true);
                              return;
                            }
                            if (isAssistantDelegated) {
                              handleSimulateAssistantPreseason(nextScheduled.fixture.id);
                              return;
                            }
                            const summerDeadline = `${save.season.yearStart}-09-01`;
                            const winterDeadline = `${save.season.yearStart + 1}-02-01`;
                            const fixDate = nextScheduled.fixture.date;
                            if (save.season.currentDate < summerDeadline && fixDate >= summerDeadline) {
                              let deadlineSave = { ...save, season: { ...save.season, currentDate: summerDeadline } };
                              deadlineSave = initializeDeadlineDay(deadlineSave);
                              commitSave(deadlineSave);
                              showToast('Transfer deadline day has arrived. Complete negotiations before 23:00 BST.');
                              return;
                            }
                            if (save.season.currentDate < winterDeadline && fixDate >= winterDeadline) {
                              let deadlineSave = { ...save, season: { ...save.season, currentDate: winterDeadline } };
                              deadlineSave = initializeDeadlineDay(deadlineSave);
                              commitSave(deadlineSave);
                              showToast('Winter transfer deadline day has arrived.');
                              return;
                            }
                            setActiveMatchFixture(nextScheduled.fixture);
                          }}
                          variant="primary"
                          fullWidth
                          className="min-h-12 text-base"
                        >
                          Prepare &amp; play match
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            data-office-ui="true"
                            disabled={simulating}
                            onClick={handlePlayNextMatchInstant}
                            variant="secondary"
                            className="min-h-11 px-2"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[var(--ink-secondary)] shrink-0" aria-hidden="true">
                              <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                            </svg>
                            <span>Instant sim</span>
                          </Button>

                          <Button
                            type="button"
                            data-office-ui="true"
                            onClick={() => setMatchOverviewModal({ type: 'preview', fixture: nextScheduled.fixture })}
                            variant="secondary"
                            className="min-h-11 px-2"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[var(--ink-secondary)] shrink-0" aria-hidden="true">
                              <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
                            </svg>
                            <span>Match dossier</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            ) : (
              /* End-of-Season Banner when all 38 fixtures concluded */
              <section
                data-office-ui="true"
                className="office-floating-card office-reveal-3 rounded-xl p-4 text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">
                    Season {save.season.seasonNumber} complete
                  </h3>
                  <Button
                    type="button"
                    data-office-ui="true"
                    onClick={handleAdvanceToNextSeasonAction}
                    disabled={simulating}
                    variant="primary"
                  >
                    Advance to season {save.season.seasonNumber + 1}
                  </Button>
                </div>
              </section>
            )}

            {/* 3. CONTRACT REMINDERS (Only shown when action is required — no outer white card) */}
            {officeReviewCount > 0 && (
              <section
                id="managerial-alerts"
                aria-label="Contracts to Review"
                data-office-ui="true"
                className="office-floating-card office-reveal-5 rounded-xl px-3.5 pt-3 pb-1 select-none"
              >
                <SectionHeader
                  as="h2"
                  title="Expiring contracts"
                  action={
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => navigateToSection('transfers', 'contracts')}
                      className="text-sm font-medium text-blue-700 hover:underline cursor-pointer min-h-[32px] focus-visible:outline-2 focus-visible:outline-blue-500"
                    >
                      All contracts
                    </button>
                  }
                />

                <div className="divide-y divide-[var(--border-subtle)] mt-1.5">
                  {contractReviewPlayers.slice(0, 2).map((player) => {
                    const yearsLeft = Math.max(1, player.contractYears || 1);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        data-office-ui="true"
                        onClick={() =>
                          navigateToSection('transfers', 'contracts', `contract-player-${player.id}`)
                        }
                        className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[var(--surface-subcard)] transition-colors cursor-pointer min-h-[46px] focus-visible:outline-2 focus-visible:outline-blue-500"
                      >
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="w-8 text-xs font-medium text-[var(--ink-muted)] shrink-0">
                            {player.position}
                          </span>
                          <span className="font-semibold text-sm text-[var(--ink-primary)] truncate">
                            {player.name}
                          </span>
                          <span className="text-xs text-[var(--ink-muted)] shrink-0 tabular-nums">
                            {player.rating} OVR
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Tag tone="warning">
                            {yearsLeft} {yearsLeft === 1 ? 'yr' : 'yrs'} left
                          </Tag>
                          <IconChevronDown className="w-3.5 h-3.5 -rotate-90 text-[var(--ink-muted)]" aria-hidden="true" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. COMPACT ICON-BASED QUICK ACTIONS (Open Canvas — No White Card Backgrounds) */}
            <section
              aria-label="Quick Actions"
              data-office-ui="true"
              className="office-reveal-6 pt-1 space-y-2.5 select-none"
            >
              <SectionHeader
                as="h2"
                title="Quick actions"
                className="items-center px-1"
                action={
                  <button
                    type="button"
                    data-office-ui="true"
                    aria-expanded={showOfficeSeasonDrawer}
                    onClick={() => setShowOfficeSeasonDrawer((prev) => !prev)}
                    className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] inline-flex items-center gap-1 cursor-pointer min-h-[36px] px-1.5 rounded-lg hover:bg-[var(--surface-subcard)] transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    <span>Fast forward</span>
                    <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${showOfficeSeasonDrawer ? 'rotate-180' : ''}`} />
                  </button>
                }
              />

              {/* Collapsible Fast-Forward / Calendar Strip */}
              {showOfficeSeasonDrawer && (
                <div className="space-y-2">
                  {injuredCount > 0 && (
                    <div className="px-1 text-xs font-medium text-rose-700 flex items-center gap-1">
                      <IconMedkit className="w-3.5 h-3.5 shrink-0" />
                      <span>{injuredCount} injured</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    <Button
                      type="button"
                      data-office-ui="true"
                      onClick={handleContinueCalendar}
                      disabled={simulating}
                      variant="secondary"
                      size="sm"
                      className="min-h-10 px-1"
                    >
                      +1 day
                    </Button>
                    <Button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_match')}
                      disabled={simulating || !nextScheduled}
                      variant="secondary"
                      size="sm"
                      className="min-h-10 px-1"
                    >
                      Next match
                    </Button>
                    <Button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_week')}
                      disabled={simulating}
                      variant="secondary"
                      size="sm"
                      className="min-h-10 px-1"
                    >
                      7 days
                    </Button>
                    <Button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_month')}
                      disabled={simulating}
                      variant="secondary"
                      size="sm"
                      className="min-h-10 px-1"
                    >
                      1 month
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick actions row */}
              <div className="office-floating-card rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
                  {/* Tactics */}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => {
                      handleTabChange('squad');
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }}
                    className="hover:bg-[var(--surface-subcard)] transition-colors py-3 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[64px] text-[var(--ink-secondary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                        <circle cx="18" cy="6" r="2" fill="currentColor" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                        <circle cx="6" cy="18" r="2" fill="currentColor" />
                        <circle cx="18" cy="18" r="2" fill="currentColor" />
                        <path d="M7.5 7.5 10.5 10.5M16.5 7.5 13.5 10.5M10.5 13.5 7.5 16.5M13.5 13.5 16.5 16.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm text-[var(--ink-primary)] leading-tight whitespace-nowrap">
                      Tactics
                    </span>
                  </button>

                  {/* Training */}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => {
                      setSquadInitialViewMode('training');
                      handleTabChange('squad');
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }}
                    className="hover:bg-[var(--surface-subcard)] transition-colors py-3 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[64px] text-[var(--ink-secondary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                        <path d="M20.57 14.86 22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm text-[var(--ink-primary)] leading-tight whitespace-nowrap">
                      Training
                    </span>
                  </button>

                  {/* Boardroom */}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => navigateToSection('transfers', 'board', 'board-room-section')}
                    className="hover:bg-[var(--surface-subcard)] transition-colors py-3 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[64px] text-[var(--ink-secondary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm text-[var(--ink-primary)] leading-tight whitespace-nowrap">
                      Boardroom
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Club Infrastructure & Stadium Campus Card */}
            {(() => {
              const infra = save.infrastructure;
              const cap = infra?.stadiumCapacity || save.club.stadiumCapacity || 35000;
              const activeCount = (infra?.activeProjects || []).filter((p) => !p.completed).length;

              return (
                <section
                  aria-label="Club Infrastructure & Stadium"
                  data-office-ui="true"
                  className="office-reveal-6"
                >
                  <button
                    type="button"
                    onClick={() => {
                      navigateToSection('transfers', 'infrastructure', 'transfer-infrastructure-section');
                    }}
                    className="office-floating-card w-full text-left rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--surface-subcard)] transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-base leading-snug text-[var(--ink-primary)]">
                          Facilities
                        </span>
                        {activeCount > 0 && <Tag>{activeCount} upgrading</Tag>}
                      </div>
                      <p className="text-sm text-[var(--ink-muted)] truncate">
                        {save.club.stadiumName || 'Club stadium'} · {cap.toLocaleString()} seats
                      </p>
                    </div>
                    <IconChevronDown className="w-4 h-4 -rotate-90 shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
                  </button>
                </section>
              );
            })()}

            {/* 5. LATEST RESULT TICKER ROW (Open Horizontal Row — No White Container, Zero Truncation at 360px) */}
            {(() => {
              const targetMatch = prevScheduled || nextScheduled;
              if (!targetMatch) return null;

              const fix = targetMatch.fixture;
              const homeClub = getOfficeClub(fix.homeClubId, allClubs[0]);
              const awayClub = getOfficeClub(fix.awayClubId, allClubs[1]);
              const homeName = getEffectiveClubName(homeClub, save.club);
              const awayName = getEffectiveClubName(awayClub, save.club);

              const roundLabel = prevScheduled
                ? prevScheduled.isCup
                  ? prevScheduled.cupName
                  : `MD ${(prevScheduled.fixture as LeagueFixture).round}`
                : 'MD 1';

              const scoreLabel = prevScheduled
                ? `${fix.homeScore ?? 0} - ${fix.awayScore ?? 0}`
                : 'vs';

              return (
                <section
                  aria-label="Previous Match Result"
                  data-office-ui="true"
                  className="office-reveal-7 select-none"
                >
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() =>
                      setMatchOverviewModal({
                        type: prevScheduled ? 'result' : 'preview',
                        fixture: fix,
                      })
                    }
                    className="office-floating-card w-full rounded-xl px-3.5 py-3 hover:bg-[var(--surface-subcard)] flex flex-col gap-2 cursor-pointer transition-colors min-h-[54px] text-left focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    {/* Header Line: Label + Round on Left, Stats Action on Right */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-display font-semibold text-base leading-snug text-[var(--ink-primary)]">
                          {prevScheduled ? 'Last result' : 'Match preview'}
                        </span>
                        <span className="text-sm text-[var(--ink-muted)] truncate">
                          {roundLabel}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-blue-700 shrink-0">
                        Stats
                      </span>
                    </div>

                    {/* Matchup Line: Full Club Names + Score Pill with Zero Truncation at 360px */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <OfficeClubJerseySvg
                          club={homeClub}
                          displayName={homeName}
                          size="sm"
                          uid="office-last-home"
                          className="!w-5 !h-5 shrink-0"
                        />
                        <span className="font-medium text-sm text-[var(--ink-primary)] truncate">
                          {homeName}
                        </span>
                      </div>

                      <span className="font-display font-semibold text-base text-[var(--ink-primary)] shrink-0 whitespace-nowrap tabular-nums">
                        {scoreLabel}
                      </span>

                      <div className="flex items-center justify-end gap-1.5 min-w-0">
                        <span className="font-medium text-sm text-[var(--ink-primary)] truncate">
                          {awayName}
                        </span>
                        <OfficeClubJerseySvg
                          club={awayClub}
                          displayName={awayName}
                          size="sm"
                          uid="office-last-away"
                          className="!w-5 !h-5 shrink-0"
                        />
                      </div>
                    </div>
                  </button>
                </section>
              );
            })()}

          </div>
        )}

        {/* MANAGERIAL INBOX SLIDE-UP MODAL / SHEET (Opened via Envelope or View All) */}
        {showOfficeInboxModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Managerial Inbox"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowOfficeInboxModal(false)}
          >
            <section
              id="managerial-inbox"
              data-office-ui="true"
              onClick={(e) => e.stopPropagation()}
              className="office-floating-card rounded-xl p-4 sm:p-5 w-full max-w-lg max-h-[85vh] flex flex-col space-y-3.5 border border-[var(--border-subtle)] shadow-sm overflow-hidden"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--office-divider)] pb-2.5 shrink-0">
                <h3 className="min-w-0 font-display font-semibold text-base text-[var(--ink-primary)] flex items-baseline gap-2">
                  <span className="truncate">Managerial inbox</span>
                  <span className="font-sans font-normal text-sm text-[var(--ink-muted)] tabular-nums">
                    {allInbox.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadInboxCount > 0 && (
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleMarkAllMessagesRead}
                      className="text-sm font-medium text-blue-700 hover:underline cursor-pointer min-h-[36px] px-1"
                    >
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShowOfficeInboxModal(false)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer shrink-0"
                    aria-label="Close managerial inbox"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters: three pills + one category select */}
              <div data-no-swipe="true" className="flex items-center gap-1.5 shrink-0">
                {[
                  { id: 'all', label: 'All', count: allInbox.length },
                  { id: 'unread', label: 'Unread', count: unreadInboxCount },
                  { id: 'action_required', label: 'Action', count: actionableAlerts.length },
                ].map((filter) => {
                  const active = inboxFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      data-office-ui="true"
                      aria-pressed={active}
                      onClick={() => setInboxFilter(filter.id as typeof inboxFilter)}
                      className={`min-h-[36px] px-3 rounded-full border text-xs whitespace-nowrap cursor-pointer flex items-center gap-1 transition-colors ${
                        active
                          ? 'bg-[var(--surface-elevated)] border-[var(--border-crisp)] text-[var(--ink-primary)] font-semibold'
                          : 'bg-transparent border-[var(--border-subtle)] text-[var(--ink-secondary)] font-medium hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className="tabular-nums text-[var(--ink-muted)]">{filter.count}</span>
                    </button>
                  );
                })}
                <select
                  aria-label="Filter by message type"
                  value={['board', 'transfer', 'injury', 'match_report'].includes(inboxFilter) ? inboxFilter : ''}
                  onChange={(e) => setInboxFilter((e.target.value || 'all') as typeof inboxFilter)}
                  className="ml-auto min-w-0 min-h-[36px] px-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] text-xs font-medium text-[var(--ink-primary)] cursor-pointer"
                >
                  <option value="">Type</option>
                  <option value="board">Board</option>
                  <option value="transfer">Transfers</option>
                  <option value="injury">Medical</option>
                  <option value="match_report">Match reports</option>
                </select>
              </div>

              {/* Messages Feed */}
              <div className="space-y-2.5 pr-1 flex-1 overflow-y-auto min-h-0 overscroll-contain touch-pan-y">
                {(() => {
                  const filteredMessages = allInbox.filter((m) => {
                    if (inboxFilter === 'all') return true;
                    if (inboxFilter === 'action_required') {
                      const cl = classifyInboxMessage(m, save);
                      return cl.classification === 'action_required' && !cl.isResolved;
                    }
                    if (inboxFilter === 'unread') return !m.isRead;
                    return m.type === inboxFilter;
                  });

                  if (filteredMessages.length === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
                        No messages here.
                      </p>
                    );
                  }

                  return filteredMessages.map((msg) => {
                    const isExpanded = expandedMessageId === msg.id;
                    const { classification, isResolved, effectiveActionLabel, effectiveActionTab, effectiveActionType, targetId } =
                      classifyInboxMessage(msg, save);

                    const isActionRequired = classification === 'action_required' && !isResolved;
                    const isImportant = classification === 'important';

                    return (
                      <article
                        key={msg.id}
                        data-office-ui="true"
                        onClick={() => handleToggleMessageRead(msg.id)}
                        className="office-subcard rounded-xl p-3.5 space-y-1.5 cursor-pointer text-left"
                      >
                        {/* Sender, status and date */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!msg.isRead && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#1d5eff] shrink-0"
                                title="Unread message"
                              />
                            )}
                            <span className="text-[var(--ink-secondary)] truncate">
                              {msg.sender}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isActionRequired ? (
                              <Tag tone="danger">Action required</Tag>
                            ) : isImportant ? (
                              <Tag tone="warning">Important</Tag>
                            ) : (
                              <Tag>Info</Tag>
                            )}
                            <span className="text-[var(--ink-muted)] text-xs tabular-nums">
                              {formatOfficeShortDate(msg.date)}
                            </span>
                          </div>
                        </div>

                        {/* Message Subject */}
                        <div
                          className={`text-sm text-[var(--ink-primary)] leading-snug ${
                            msg.isRead ? 'font-medium' : 'font-semibold'
                          }`}
                        >
                          {msg.subject}
                        </div>

                        {/* Body & Actions */}
                        {isExpanded ? (
                          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5 animate-fade-in">
                            <p className="text-sm text-[var(--ink-secondary)] whitespace-pre-line leading-relaxed">
                              {msg.body}
                            </p>
                            {effectiveActionType === 'promise_game_time' && !isResolved && (targetId || msg.targetId) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <Button
                                  type="button"
                                  data-office-ui="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const res = resolveDressingRoomConfrontation(
                                      save,
                                      targetId || msg.targetId || '',
                                      'promise_starts',
                                      msg.id
                                    );
                                    handleUpdateSave(res.updatedSave);
                                    showToast(res.summary);
                                  }}
                                  variant="primary"
                                  size="sm"
                                  className="min-h-10"
                                >
                                  Promise 3/5 starts
                                </Button>
                                <Button
                                  type="button"
                                  data-office-ui="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const res = resolveDressingRoomConfrontation(
                                      save,
                                      targetId || msg.targetId || '',
                                      'explain_rotation',
                                      msg.id
                                    );
                                    handleUpdateSave(res.updatedSave);
                                    showToast(res.summary);
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="min-h-10"
                                >
                                  Explain rotation
                                </Button>
                                <Button
                                  type="button"
                                  data-office-ui="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const res = resolveDressingRoomConfrontation(
                                      save,
                                      targetId || msg.targetId || '',
                                      'transfer_list',
                                      msg.id
                                    );
                                    handleUpdateSave(res.updatedSave);
                                    showToast(res.summary);
                                  }}
                                  variant="danger"
                                  size="sm"
                                  className="min-h-10"
                                >
                                  Transfer list
                                </Button>
                              </div>
                            ) : effectiveActionLabel && !isResolved ? (
                              <Button
                                type="button"
                                data-office-ui="true"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleMessageRead(msg.id);
                                  setShowOfficeInboxModal(false);
                                  handleExecuteAlertAction({
                                    actionTab: effectiveActionTab,
                                    actionType: effectiveActionType,
                                    targetId: targetId || msg.targetId,
                                  });
                                }}
                                variant="primary"
                                fullWidth
                              >
                                <span>{effectiveActionLabel}</span>
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--ink-muted)] truncate">
                              {msg.body.replace(/\n+/g, ' ')}
                            </p>
                            {isActionRequired && effectiveActionLabel && (
                              <div className="text-xs font-medium text-blue-700 pt-0.5">
                                <span>{effectiveActionLabel}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  });
                })()}
                {allInbox.some((m) => m.isRead) && (
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={handleClearReadMessages}
                    className="w-full min-h-[40px] text-sm font-medium text-[var(--ink-secondary)] hover:text-rose-700 transition-colors cursor-pointer"
                    title="Archive read messages that require no further action"
                  >
                    Clear read messages
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: SQUAD */}
        {activeTab === 'squad' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Squad Management">
            <SquadManagement
              save={save}
              onUpdateSave={handleUpdateSave}
              onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
              onNotification={showToast}
              initialViewMode={squadInitialViewMode}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 3: FIXTURES */}
        {activeTab === 'fixtures' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Fixtures & Calendar">
            <FixturesCalendar
              save={save}
              onUpdateSave={handleUpdateSave}
              onNotification={showToast}
              onNavigateOffice={() => handleTabChange('overview')}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 4: TABLE */}
        {activeTab === 'table' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="League Table">
            <LeagueTable
              standings={save.standings || []}
              userClubId={save.club.id}
              userClub={save.club}
              fixtures={save.fixtures || []}
              userSquad={save.squad}
              seasonHistory={save.seasonHistory || []}
              activeLeagueClubIds={save.activeLeagueClubIds}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 5: CUPS & EUROPE */}
        {activeTab === 'cups' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Cups & Europe">
            <TournamentsHub
              save={save}
              onUpdateSave={handleUpdateSave}
              onNotification={showToast}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 6: TRANSFERS */}
        {activeTab === 'transfers' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Transfer Hub">
            <TransferHub
              save={save}
              onUpdateSave={handleUpdateSave}
              onNotification={showToast}
              initialSubTab={transferHubSubTab}
              focusedOfferId={focusedOfferId}
              onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 7: CLUB LEGACY & TROPHY CABINET */}
        {activeTab === 'legacy' && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Club Legacy & Trophy Cabinet">
            <ClubLegacyView
              save={save}
              onNavigateCups={() => handleTabChange('cups')}
              onNavigateTable={() => handleTabChange('table')}
            />
          </CareerErrorBoundary>
        )}

        {/* TAB 8: SETTINGS & EDITING */}
        {activeTab === 'settings' && editableSettings && (
          <CareerErrorBoundary slotId={slotId} sectionLabel="Career Settings">
            <CareerSettingsTab
              save={save}
              slotId={slotId}
              editableSettings={editableSettings}
              editingClubName={editingClubName}
              sfxEnabled={sfxEnabled}
              onChangeEditableSettings={setEditableSettings}
              onChangeEditingClubName={setEditingClubName}
              onToggleSfx={handleToggleSfx}
              onSaveSettings={handleSaveSettings}
              onExport={handleExport}
              onImportSaveSuccess={(importedSave) => handleUpdateSave(importedSave)}
              onResetSaveSlot={handleResetSaveSlot}
              onOpenExitModal={() => setShowExitConfirmModal(true)}
              onNotify={showToast}
            />
          </CareerErrorBoundary>
        )}
        </div>
      </main>

      {/* Matchday Play/Sim Interactive Modal */}
      {activeMatchFixture && (
        <CareerErrorBoundary slotId={slotId} sectionLabel="Live Matchday" onResetView={() => setActiveMatchFixture(null)}>
          <MatchDayModal
            fixture={activeMatchFixture}
            save={save}
            onClose={() => setActiveMatchFixture(null)}
            onSaveMatchResult={handleMatchResultSaved}
            onUpdateSave={handleUpdateSave}
          />
        </CareerErrorBoundary>
      )}

      {/* Match Overview / Statistics / Pre-Match Dossier Modal */}
      {matchOverviewModal && (
        <MatchOverviewModal
          type={matchOverviewModal.type}
          fixture={matchOverviewModal.fixture}
          save={save}
          onClose={() => setMatchOverviewModal(null)}
          onPlayInteractiveMatch={() => {
            setActiveMatchFixture(matchOverviewModal.fixture);
            setMatchOverviewModal(null);
          }}
          onPlayInstantMatch={() => {
            setMatchOverviewModal(null);
            handlePlayNextMatchInstant();
          }}
        />
      )}

      {/* Short Instant Simulation Loading Suspense Modal */}
      {instantSimLoadingData && (
        <InstantSimLoadingModal
          homeClub={instantSimLoadingData.homeClub}
          awayClub={instantSimLoadingData.awayClub}
          userClub={save.club}
          competitionTitle={instantSimLoadingData.competitionTitle}
          roundTitle={instantSimLoadingData.roundTitle}
          durationMs={1200}
          onComplete={() => {
            const { updatedSave, simmedFixture } = instantSimLoadingData;
            const finalSave = checkAndTriggerCelebration(updatedSave, simmedFixture);
            commitSave(finalSave);
            setSimulating(false);
            setInstantSimLoadingData(null);
            setInstantSimResultModal(simmedFixture);
          }}
        />
      )}

      {/* Instant Match Summary Takeover Modal */}
      {instantSimResultModal && (
        <InstantMatchSummaryModal
          fixture={instantSimResultModal}
          save={save}
          onClose={() => setInstantSimResultModal(null)}
          onViewDetailedDossier={() => {
            const fix = instantSimResultModal;
            setInstantSimResultModal(null);
            setMatchOverviewModal({ type: 'result', fixture: fix });
          }}
          onAttendPressConference={() => {
            setInstantSimResultModal(null);
            navigateToSection('transfers', 'media', 'transfer-media-section');
          }}
          onNavigateTab={(tab) => {
            setInstantSimResultModal(null);
            handleTabChange(tab);
          }}
        />
      )}

      {/* Silverware & Advancement Celebration Pop-up */}
      {activeCelebration && (
        <CelebrationModal
          event={activeCelebration}
          onClose={() => setActiveCelebration(null)}
          onNavigateTab={(tab) => {
            setActiveCelebration(null);
            handleTabChange(tab);
          }}
        />
      )}

      {/* Preseason Tour Selection Modal */}
      {showPreseasonModal && (
        <PreseasonTourModal
          save={save}
          onSelectTour={handleChoosePreseasonTour}
          onClose={() => setShowPreseasonModal(false)}
        />
      )}

      {/* Premier League Fixture Release Day Prompt Modal */}
      {showFixtureReleasePromptModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in motion-reduce:animate-none"
        >
          <div className="office-floating-card border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-sm text-left relative text-[var(--ink-primary)] max-h-[90dvh] overflow-y-auto">
            <header className="space-y-1.5">
              <Eyebrow>Announcement · 8 July {save.season.yearStart}</Eyebrow>
              <h3 className="text-xl font-display font-bold text-[var(--ink-primary)]">
                Premier League fixture release day
              </h3>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
                All 38 fixtures for the {save.season.yearStart}/{(save.season.yearStart + 1).toString().slice(-2)} season are set. Opening day, rival derbies, festive fixtures and the final day are ready.
              </p>
            </header>

            <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              <StatRow label="Campaign length" value="38 matchdays" />
              <StatRow label="Match allocation" value="19 home · 19 away" />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  setShowFixtureReleaseModal(true);
                }}
                variant="primary"
                className="flex-1"
              >
                Launch live reveal ceremony
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  handleFinishFixtureRelease();
                }}
                variant="secondary"
              >
                Skip &amp; unlock calendar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Premier League Fixture Release Reveal Modal */}
      {showFixtureReleaseModal && (
        <FixtureReleaseModal
          save={save}
          fixtures={save.fixtures || []}
          onClose={() => setShowFixtureReleaseModal(false)}
          onFinishRelease={handleFinishFixtureRelease}
        />
      )}

      {/* UEFA Champions League League Phase Draw Ceremony Modal */}
      {showUclDrawModal && (
        <ChampionsLeagueDrawModal
          save={save}
          onClose={() => setShowUclDrawModal(false)}
          onFinishDraw={handleFinishUclDraw}
        />
      )}

      {/* End of Season Review & Awards Modal */}
      {showSeasonReviewModal && seasonSummary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 motion-reduce:transition-none motion-reduce:animate-none animate-fade-in"
        >
          <div className="office-floating-card border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-xl w-full space-y-4 shadow-sm text-left relative max-h-[90dvh] overflow-y-auto text-[var(--ink-primary)]">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <Eyebrow>Season {save.season.seasonNumber} review</Eyebrow>
                <h3 className="text-xl font-display font-bold text-[var(--ink-primary)] flex items-center gap-2">
                  {seasonSummary.leagueTitle ? (
                    <>
                      <IconCrown className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>League champions</span>
                    </>
                  ) : (
                    <span>Finished {formatOrdinalRank(seasonSummary.finalPosition)}</span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSeasonReviewModal(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Headline result: record, prize, silverware, Europe (each shown once) */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border-subtle)] py-3">
              {userStanding && (
                <div>
                  <dt className="text-xs font-medium text-[var(--ink-muted)]">Record</dt>
                  <dd className="font-display font-semibold text-base text-[var(--ink-primary)] tabular-nums">
                    {userStanding.won}W {userStanding.drawn}D {userStanding.lost}L
                    <span className="font-sans font-normal text-xs text-[var(--ink-secondary)]"> · {userStanding.points} pts</span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-[var(--ink-muted)]">Prize money</dt>
                <dd className="font-display font-semibold text-base text-emerald-700 tabular-nums">
                  +{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--ink-muted)]">Silverware</dt>
                <dd className="font-display font-semibold text-base text-[var(--ink-primary)]">
                  {seasonSummary.trophiesWon.length > 0
                    ? `${seasonSummary.trophiesWon.length} ${seasonSummary.trophiesWon.length === 1 ? 'trophy' : 'trophies'}`
                    : 'None'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-[var(--ink-muted)]">Europe</dt>
                <dd className="font-medium text-sm text-[var(--ink-primary)] leading-snug pt-0.5">
                  {seasonSummary.europeanQualification}
                </dd>
              </div>
            </dl>

            <p className="text-sm text-[var(--ink-secondary)]">
              Season {save.season.seasonNumber + 1} transfer budget:{' '}
              <span className="font-semibold text-[var(--ink-primary)] tabular-nums">
                {formatCareerCurrency(save.finances.transferBudget + seasonSummary.prizeMoney, save.settings.currency)}
              </span>
            </p>

            {/* Secondary detail behind disclosures (collapsed by default) */}
            <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              <div>
                <button
                  type="button"
                  aria-expanded={seasonReviewOpenSection === 'growth'}
                  onClick={() => setSeasonReviewOpenSection((prev) => (prev === 'growth' ? null : 'growth'))}
                  className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer text-sm font-semibold text-[var(--ink-primary)]"
                >
                  <span>
                    Player development{' '}
                    <span className="font-normal text-[var(--ink-muted)]">{seasonSummary.progressionReport.logs.length}</span>
                  </span>
                  <IconChevronDown className={`w-4 h-4 shrink-0 ${seasonReviewOpenSection === 'growth' ? 'rotate-180' : ''}`} />
                </button>
                {seasonReviewOpenSection === 'growth' && (
                  <div className="pb-3 space-y-1.5">
                    <p className="text-xs text-[var(--ink-muted)]">Everyone ages a year; fitness resets to 100%.</p>
                    <ul className="text-sm text-[var(--ink-secondary)] divide-y divide-[var(--border-subtle)]">
                      {seasonSummary.progressionReport.logs.map((log, idx) => (
                        <li key={idx} className="py-1">
                          {log}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {(seasonSummary.promotedClubNames?.length || seasonSummary.relegatedClubNames?.length) ? (
                <div>
                  <button
                    type="button"
                    aria-expanded={seasonReviewOpenSection === 'division'}
                    onClick={() => setSeasonReviewOpenSection((prev) => (prev === 'division' ? null : 'division'))}
                    className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer text-sm font-semibold text-[var(--ink-primary)]"
                  >
                    <span>Promoted &amp; relegated</span>
                    <IconChevronDown className={`w-4 h-4 shrink-0 ${seasonReviewOpenSection === 'division' ? 'rotate-180' : ''}`} />
                  </button>
                  {seasonReviewOpenSection === 'division' && (
                    <div className="pb-3 space-y-1.5 text-sm">
                      {seasonSummary.promotedClubNames && seasonSummary.promotedClubNames.length > 0 && (
                        <p className="flex items-start gap-1.5 text-emerald-900">
                          <IconTrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold">Up:</span> {seasonSummary.promotedClubNames.join(', ')}
                          </span>
                        </p>
                      )}
                      {seasonSummary.relegatedClubNames && seasonSummary.relegatedClubNames.length > 0 && (
                        <p className="flex items-start gap-1.5 text-rose-900">
                          <IconTrendingUp className="w-3.5 h-3.5 rotate-180 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold">Down:</span> {seasonSummary.relegatedClubNames.join(', ')}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowSeasonReviewModal(false)}
                variant="secondary"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowSeasonReviewModal(false);
                  handleAdvanceToNextSeasonAction();
                }}
                disabled={simulating}
                variant="primary"
                className="flex-1"
              >
                Start season {save.season.seasonNumber + 1}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Forward Confirmation Modal */}
      {pendingFastForward && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
        >
          <div className="office-floating-card border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-sm text-left relative text-[var(--ink-primary)] max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-display font-semibold text-[var(--ink-primary)]">
                {getFastForwardDetails(pendingFastForward).title}
              </h3>
              <button
                type="button"
                onClick={() => setPendingFastForward(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
              Simulates to{' '}
              <span className="font-semibold text-[var(--ink-primary)]">{getFastForwardDetails(pendingFastForward).targetDate}</span>.
              Results are permanent unless match retry is on.
            </p>

            <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] text-sm font-medium text-[var(--ink-primary)]">
              <label className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer">
                <span>Use preferred starting 11</span>
                <input
                  type="checkbox"
                  checked={fastForwardUsePreferredEleven}
                  onChange={(e) => setFastForwardUsePreferredEleven(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
              </label>
              <label className="flex items-center justify-between gap-3 min-h-[44px]">
                <span>Pause for transfers</span>
                <select
                  value={fastForwardHaltOnTransferMilestone}
                  onChange={(e) =>
                    setFastForwardHaltOnTransferMilestone(e.target.value as typeof fastForwardHaltOnTransferMilestone)
                  }
                  className="min-w-0 min-h-[36px] px-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] text-sm font-medium text-[var(--ink-primary)] cursor-pointer"
                >
                  <option value="deadline">Deadline day</option>
                  <option value="window_open_or_close">Window open + deadline</option>
                  <option value="none">Never</option>
                </select>
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => setPendingFastForward(null)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const target = pendingFastForward;
                  setPendingFastForward(null);
                  handleTimeSkipAction(target, {
                    usePreferredEleven: fastForwardUsePreferredEleven,
                    haltOnTransferMilestone: fastForwardHaltOnTransferMilestone,
                  });
                }}
                variant="primary"
                className="flex-1"
              >
                Fast forward
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Sacked Board Dismissal Modal */}
      {save.boardStatus?.status === 'sacked' && save.settings.boardCanSack && !dismissedSackedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in motion-reduce:animate-none"
        >
          <div className="office-floating-card border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-sm text-left relative text-[var(--ink-primary)] max-h-[90dvh] overflow-y-auto">
            <div className="space-y-1">
              <Eyebrow>Board of directors notice</Eyebrow>
              <h3 className="text-xl font-display font-bold text-rose-700">
                Contract terminated
              </h3>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed pt-1">
                The board of {effectiveClubName} has relieved you of your duties as first-team manager after a poor run of league results and a failure to meet the season&apos;s expectations.
              </p>
            </div>

            <div className="border-y border-[var(--border-subtle)]">
              <StatRow label="Board confidence" value="0% (dismissed)" />
              <StatRow label="Club objective" value="Failed" />
            </div>

            {/* Option C: Sacking Carousel Rebound Job Offers */}
            {(() => {
              const savedRebounds = (save.managerCareer?.jobOffers || []).filter(
                (o) => o.status === 'pending' && o.isEmergencyRebound
              );
              const carouselOffers = savedRebounds.length > 0 ? savedRebounds : generateEmergencyReboundOffers(save);
              if (carouselOffers.length === 0) return null;

              return (
                <section aria-label="Sacking Carousel Offers" className="text-left space-y-2">
                  <SectionHeader as="h4" title="Emergency job offers" meta={carouselOffers.length} />
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {carouselOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="office-subcard rounded-lg p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-[var(--ink-primary)] truncate">
                            {offer.clubName}
                          </div>
                          <div className="text-xs text-[var(--ink-muted)]">
                            {offer.clubTier.charAt(0).toUpperCase() + offer.clubTier.slice(1)} tier · Budget {formatOfficeBudget(offer.transferBudget, save.settings.currency)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const seededSave: CareerSaveFile =
                              savedRebounds.length > 0
                                ? save
                                : {
                                    ...save,
                                    managerCareer: {
                                      ...(save.managerCareer || {
                                        reputation: 55,
                                        weeklySalary: 40_000,
                                        accolades: [],
                                        tenures: [],
                                        jobOffers: [],
                                      }),
                                      jobOffers: [
                                        ...carouselOffers,
                                        ...(save.managerCareer?.jobOffers || []),
                                      ],
                                    },
                                  };
                            const res = acceptManagerJobOffer(seededSave, offer.id);
                            if (res.success) {
                              handleUpdateSave(res.updatedSave);
                              setDismissedSackedModal(false);
                              setActiveTab('overview');
                              showToast(`Job accepted. Welcome to ${offer.clubName}.`);
                            }
                          }}
                          variant="secondary"
                          size="sm"
                          className="min-h-10 shrink-0"
                        >
                          Take job
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/career"
                className="w-full min-h-10 px-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] text-[var(--ink-primary)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                Accept dismissal &amp; resign
              </Link>
              <Button
                type="button"
                onClick={() => {
                  const restoredSave: CareerSaveFile = {
                    ...save,
                    boardStatus: {
                      confidence: 45,
                      expectation: 'Urgent Results Required',
                      status: 'under_pressure',
                      warningsCount: 2,
                    },
                  };
                  handleUpdateSave(restoredSave);
                  setDismissedSackedModal(true);
                  showToast('Board granted one final probation period. Deliver results immediately.');
                }}
                variant="primary"
                fullWidth
              >
                Appeal to board (one final chance)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Player Comparison Modal */}
      {comparisonState.isOpen && comparisonState.playerA && save && (
        <PlayerComparisonModal
          key={`${comparisonState.playerA.id}_${comparisonState.playerB?.id || 'auto'}`}
          isOpen={comparisonState.isOpen}
          onClose={() => setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined })}
          playerA={comparisonState.playerA}
          playerB={comparisonState.playerB}
          squad={save.squad || []}
          shortlistPlayerIds={save.shortlistPlayerIds}
          finances={save.finances}
          seniorCount={seniorCount}
          registeredPlayerIds={save.registeredPlayerIds}
          seasonYearStart={save.season?.yearStart}
          settings={save.settings}
          onSwapSquadPlayers={(starterId: string, benchId: string) => {
            handleSwapLineup(starterId, benchId);
          }}
          onSelectTransferTarget={() => {
            setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined });
            navigateToSection('transfers', 'market', 'market-section');
          }}
          onNavigateOfficeBudget={() => {
            setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined });
            navigateToSection('transfers', 'board', 'board-room-section');
          }}
        />
      )}

      {/* 25-Man Squad Registration Modal */}
      {showRegistrationModal && save && (
        <SquadRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          squad={save.squad}
          registeredPlayerIds={save.registeredPlayerIds}
          settings={save.settings}
          seasonYearStart={save.season?.yearStart}
          onSaveRegistration={(updatedIds) => {
            const updated: CareerSaveFile = {
              ...save,
              registeredPlayerIds: updatedIds,
            };
            handleUpdateSave(updated);
            showToast('Squad registration submitted.');
          }}
        />
      )}

      {/* EXIT CAREER CONFIRMATION MODAL */}
      {showExitConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          onClick={() => setShowExitConfirmModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fade-in motion-reduce:animate-none"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            data-office-ui="true"
            onClick={(e) => e.stopPropagation()}
            className="office-floating-card border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-sm relative text-left text-[var(--ink-primary)]"
          >
            <div>
              <h3 className="font-display font-semibold text-[var(--ink-primary)] text-lg">
                Exit career mode?
              </h3>
              <p className="text-sm text-[var(--ink-secondary)] mt-1.5 leading-relaxed">
                Your season progress is saved to your device automatically. Where would you like to go?
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <Link
                href="/career"
                className="w-full min-h-10 px-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] text-[var(--ink-primary)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <IconSave className="w-4 h-4 text-[var(--ink-secondary)]" />
                <span>Save slots screen</span>
              </Link>
              <Link
                href="/"
                className="w-full min-h-10 px-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] text-[var(--ink-primary)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <IconHome className="w-4 h-4 text-[var(--ink-secondary)]" />
                <span>Main title screen</span>
              </Link>
              <Button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                variant="ghost"
                fullWidth
              >
                Keep playing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareerPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen my11-canvas text-[var(--ink-secondary)] flex items-center justify-center text-sm">
          Loading manager office...
        </div>
      }
    >
      <CareerPlayHubContent />
    </Suspense>
  );
}
