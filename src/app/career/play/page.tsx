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
  IconMail,
  IconClose,
  IconAlert,
  IconStar,
  IconBolt,
  IconArrowLeft,
  IconHome,
  IconCalendar,
  IconSparkles,
  IconSkipForward,
  IconCrown,
  IconMedal,
  IconSprout,
  IconRefresh,
  IconTrendingUp,
  IconBriefcase,
  IconBuilding,
  IconArrowRight,
  IconDocument,
  IconVolumeOn,
  IconVolumeOff,
} from '../../../components/career/GameIcons';

function TabPanelFallback() {
  return (
    <div className="office-floating-card rounded-3xl p-8 text-center text-xs font-display font-bold uppercase tracking-wider text-slate-500">
      Loading module...
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
      className="absolute inset-x-0 top-0 h-[212px] sm:h-[224px] rounded-2xl pointer-events-none overflow-hidden select-none [mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%)]"
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
  const [showBoardDossierModal, setShowBoardDossierModal] = useState(false);
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
      saveCareerSave(initialized);
      setSave(initialized);
    });
    return () => {
      cancelled = true;
    };
  }, [save]);

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
        } else if (showBoardDossierModal) {
          setShowBoardDossierModal(false);
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
    showBoardDossierModal,
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
      saveCareerSave(celebration.updatedSave);
      setSave(celebration.updatedSave);
      setActiveCelebration(celebration.event);
      return celebration.updatedSave;
    }
    return saveCandidate;
  }, []);

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
      showToast('Lineup updated successfully.');
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
        saveCareerSave(finalSave);
        setSave(finalSave);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [checkAndTriggerCelebration, save, theme]);

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
    showToast('Save backup exported successfully.');
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

    saveCareerSave(updated);
    setSave(updated);
    setEditableSettings(updatedSettings);
    showToast('Settings saved successfully.');
  };

  const handleResetSaveSlot = () => {
    deleteCareerSave(slotId);
    router.push('/career');
  };

  const handleUpdateSave = (updated: CareerSaveFile) => {
    saveCareerSave(updated);
    setSave(updated);
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
        const targetDate = nextScheduled ? formatCareerDate(nextScheduled.fixture.date, save?.settings.dateFormat || 'uk', 'long') : 'Next Scheduled Match';
        return {
          title: 'Advance to Next Match',
          badge: 'Next Match',
          targetDate,
        };
      }
      case 'next_week': {
        return {
          title: 'Fast Forward +7 Days',
          badge: '+7 Days',
          targetDate: '1 Week Forward',
        };
      }
      case 'next_month': {
        return {
          title: 'Fast Forward +1 Month',
          badge: '+1 Month',
          targetDate: '30 Days Forward',
        };
      }
      case 'transfer_deadline': {
        return {
          title: 'Advance to Deadline Day',
          badge: 'Deadline Day',
          targetDate: '1 Sep / 1 Feb',
        };
      }
      case 'season_end': {
        return {
          title: 'Simulate to Season End',
          badge: 'Season End',
          targetDate: 'Round 38 (Finale)',
        };
      }
      case 'continue':
      default: {
        return {
          title: 'Advance Calendar',
          badge: 'Continue',
          targetDate: 'Day by Day',
        };
      }
    }
  };

  const handlePlayNextMatchInstant = () => {
    if (!save || !nextScheduled) return;

    // 1. Guard against Deadline Day clock in progress
    if (save.deadlineDayState?.isActive && save.deadlineDayState.phase !== 'closed') {
      showToast('Transfer Deadline Day is in progress! Advance the deadline clock or finalize deals before simulating matches.');
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
      saveCareerSave(deadlineSave);
      setSave(deadlineSave);
      showToast('Transfer Deadline Day has arrived! The summer window shuts tonight at 23:00 BST. Complete your transfer and squad registration business.');
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
      saveCareerSave(deadlineSave);
      setSave(deadlineSave);
      showToast('Transfer Deadline Day has arrived! The winter window shuts tonight at 23:00 BST.');
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

    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);
    showToast(`Fast-forwarded past ${intlBreak.name}. Squad returned to training!`);
  };

  const handleAdvanceToNextSeasonAction = () => {
    if (!save) return;
    setSimulating(true);
    const { updatedSave } = advanceToNextSeason(save);
    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);
    showToast(`Welcome to Season ${updatedSave.season.seasonNumber}! Summer transfer window open.`);
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
    saveCareerSave(finalSave);
    setSave(finalSave);
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
    saveCareerSave(finalSave);
    setSave(finalSave);
    setActiveMatchFixture(null);
    showToast('Match completed and results saved! Press Conference open in Media desk.');
  };

  const handleChoosePreseasonTour = (tourId: PreseasonTourId, delegateToAssistant: boolean) => {
    if (!save) return;
    const updated = applyPreseasonTourChoice(save, tourId, delegateToAssistant);
    saveCareerSave(updated);
    setSave(updated);
    setShowPreseasonModal(false);
    showToast(`Pre-season tour selected: ${tourId.toUpperCase()}! 3 Friendlies scheduled.`);
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
    saveCareerSave(updated);
    setSave(updated);
    setShowFixtureReleaseModal(false);
    showToast('Premier League fixtures released for the new season!');
  };

  const handleFinishUclDraw = (drawnOpponents: LeaguePhaseOpponent[]) => {
    if (!save) return;
    const updated = applyChampionsLeagueDraw(save, drawnOpponents);
    saveCareerSave(updated);
    setSave(updated);
    setShowUclDrawModal(false);
    showToast('UEFA Champions League League Phase Draw concluded! Fixtures scheduled.');
  };

  const handleSimulateAssistantPreseason = (fixtureId: string) => {
    if (!save) return;
    setSimulating(true);
    const updated = simulateAssistantPreseasonMatch(save, fixtureId);
    saveCareerSave(updated);
    setSave(updated);
    setSimulating(false);
    showToast('Assistant Manager simulated pre-season friendly! Check inbox for match report.');
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
      <div className="min-h-screen my11-canvas text-slate-900 font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#09152b] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
            MY-11
          </div>
          <h1 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">
            Loading Manager Office...
          </h1>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Syncing save vault and player database for {slotId.replace('_', ' ').toUpperCase()}.
          </p>
        </main>
      </div>
    );
  }

  if (!save) {
    return (
      <div className="min-h-screen my11-canvas text-slate-900 font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
            SAVE
          </div>
          <h1 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">
            No Save Found in {slotId.replace('_', ' ').toUpperCase()}
          </h1>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            There is currently no career save loaded in this slot. You can start a new career or import a backup file.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/career"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 font-display uppercase tracking-wider"
            >
              Save Slots
            </Link>
            <Link
              href={`/career/setup?slot=${slotId}`}
              className="flex-1 py-3 px-4 rounded-xl office-play-match-btn text-white text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1"
            >
              Start New
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
      : 'Under Pressure';

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
          data-force-white="true"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#1E2024] border text-white px-4 py-2 rounded-xl font-display font-bold text-xs tracking-wide shadow-xl flex items-center gap-2 max-w-[92vw]"
          style={{ backgroundColor: '#1E2024', borderColor: '#D97706' }}
        >
          <IconCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
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
          className="office-floating-card office-reveal-1 rounded-[22px] px-2 sm:px-3.5 py-2 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-1.5 select-none"
        >
          {/* Left: MY-11 Brand Mark + Club & Season/Date */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={handleLogoClick}
              data-office-ui="true"
              title={activeTab !== 'overview' ? 'Return to Career Office' : 'Exit Career Mode'}
              aria-label={activeTab !== 'overview' ? 'Return to Career Office' : 'Exit Career Mode'}
              className="flex flex-col items-center justify-center shrink-0 cursor-pointer group focus:outline-none"
            >
              {/* Crown SVG above MY-11 */}
              <svg viewBox="0 0 28 12" className="w-3.5 h-2.5 -mb-0.5 transition-transform duration-150 group-hover:-translate-y-0.5" aria-hidden="true">
                <defs>
                  <linearGradient id="my11-crown-grad-univ" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#c026d3" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 10 L4 3 L10 7 L14 1 L18 7 L24 3 L26 10 Z"
                  fill="url(#my11-crown-grad-univ)"
                />
              </svg>
              <span className="font-display font-black text-[14px] sm:text-[17px] tracking-tighter leading-none text-[var(--office-text-primary)]">
                MY-11
              </span>
            </button>

            <div className="w-px h-6 bg-[var(--office-divider)] shrink-0" />

            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-display font-black text-[12px] min-[390px]:text-[13.5px] sm:text-[15.5px] text-[var(--office-text-primary)] leading-tight tracking-tight truncate">
                {effectiveClubName}
              </h1>
              <p className="text-[10.5px] min-[390px]:text-[11px] sm:text-xs font-bold text-[#1d4ed8] leading-tight truncate mt-0.5">
                {formatOfficeShortDate(save.season.currentDate)}
              </p>
            </div>
          </div>

          {/* Right: Board Confidence Pill + Inbox + Settings */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setShowBoardDossierModal(true)}
              title="View Boardroom Confidence Dossier"
              className="office-subcard rounded-full px-1.5 min-[390px]:px-2 sm:px-2.5 py-1 flex items-center gap-1 sm:gap-1.5 cursor-pointer bg-[#e6fcf5] border border-[#6ee7b7] hover:border-[#059669]"
            >
              <span
                className={`w-4.5 h-4.5 min-[390px]:w-5 min-[390px]:h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                  boardConfidence >= 60
                    ? 'bg-[#047857]'
                    : boardConfidence >= 45
                    ? 'bg-[#b45309]'
                    : 'bg-[#b91c1c]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <circle cx="9" cy="10" r="1.5" />
                  <circle cx="15" cy="10" r="1.5" />
                  <path
                    d="M8.5 14.5 C9.8 16.5, 14.2 16.5, 15.5 14.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              <div className="text-left leading-none pr-0.5">
                <div className="text-[11px] sm:text-[11.5px] font-display font-black text-[#0b1536] whitespace-nowrap">
                  Board {boardConfidence}%
                </div>
                <div
                  className={`text-[10px] sm:text-[10.5px] font-extrabold mt-0.5 whitespace-nowrap ${
                    boardConfidence >= 60
                      ? 'text-[#065f46]'
                      : boardConfidence >= 45
                      ? 'text-[#92400e]'
                      : 'text-[#991b1b]'
                  }`}
                >
                  {boardSentimentLabel}
                </div>
              </div>
            </button>

            {/* Sound Effects Toggle Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={handleToggleSfx}
              title={sfxEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              aria-label={sfxEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              aria-pressed={!sfxEnabled}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 bg-white border border-[#cbd5e1] shadow-2xs hover:border-[#1d5eff]/50"
            >
              {sfxEnabled ? (
                <IconVolumeOn className="w-4 h-4 text-[#1d4ed8]" />
              ) : (
                <IconVolumeOff className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Inbox Envelope Icon Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setShowOfficeInboxModal(true)}
              title="Open Managerial Inbox"
              aria-label="Open Managerial Inbox"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center relative cursor-pointer transition-transform active:scale-95 shrink-0 bg-white border border-[#cbd5e1] shadow-2xs hover:border-[#1d5eff]/50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1d4ed8]" fill="currentColor" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z" />
              </svg>
              {headerBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#dc2626] text-white font-display font-black text-[10px] flex items-center justify-center shadow-xs border-2 border-white">
                  {headerBadgeCount}
                </span>
              )}
            </button>

            {/* Settings Gear Icon Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('settings')}
              title="Career Settings"
              aria-label="Career Settings"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 bg-white border shadow-2xs hover:border-[#1d5eff]/50 ${activeTab === 'settings' ? 'border-[#1d5eff]' : 'border-[#cbd5e1]'}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#334155]" fill="currentColor" aria-hidden="true">
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
            className="office-floating-card rounded-[20px] p-1 grid grid-cols-5 gap-1 select-none"
          >
            {/* Office */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('overview')}
              className={`${activeTab === 'overview' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M12 3 3 10h2v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9h2L12 3z" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight leading-tight">Office</span>
            </button>

            {/* Squad */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('squad')}
              className={`${activeTab === 'squad' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight leading-tight">Squad</span>
            </button>

            {/* Fixtures */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('fixtures')}
              className={`${activeTab === 'fixtures' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight leading-tight">Fixtures</span>
            </button>

            {/* Transfers */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('transfers')}
              className={`${activeTab === 'transfers' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight leading-tight">Transfers</span>
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
              className={`${['table', 'cups', 'legacy'].includes(activeTab) ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                <circle cx="6" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="18" cy="12" r="2" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight leading-tight inline-flex items-center gap-0.5">
                <span>{activeTab === 'table' ? 'Table' : activeTab === 'cups' ? 'Cups' : activeTab === 'legacy' ? 'Legacy' : 'More'}</span>
                <IconChevronDown className={`w-3 h-3 shrink-0 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
          </nav>

          {/* More Menu Popover */}
          {isMoreMenuOpen && (
            <div
              data-office-ui="true"
              className="office-floating-card absolute right-0 top-full mt-1.5 z-40 w-52 rounded-2xl p-1.5 shadow-2xl"
              role="menu"
            >
              {[
                { id: 'table', label: 'League Table', icon: <IconBarChart className="w-4 h-4 text-blue-700 shrink-0" /> },
                { id: 'cups', label: 'Cups & Europe', icon: <IconTrophy className="w-4 h-4 text-amber-600 shrink-0" /> },
                { id: 'legacy', label: 'Club Legacy', icon: <IconMedal className="w-4 h-4 text-emerald-700 shrink-0" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  data-office-ui="true"
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  onClick={() => handleTabChange(item.id as CareerTab)}
                  className={`w-full min-h-[44px] px-2.5 rounded-xl text-left flex items-center gap-2.5 cursor-pointer font-display font-bold text-[13px] text-[var(--office-text-primary)] ${
                    activeTab === item.id ? 'bg-[#F7F6F3]' : 'hover:bg-[#F7F6F3]'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {activeTab === item.id && <IconCheck className="w-3.5 h-3.5 shrink-0 text-emerald-700" />}
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
                className="w-full min-h-[44px] px-2.5 rounded-xl text-left flex items-center gap-2.5 cursor-pointer font-display font-bold text-[13px] text-[var(--office-text-primary)] hover:bg-[#F7F6F3]"
              >
                <IconSave className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Backup Save</span>
              </button>
            </div>
          )}
        </div>

        {dbLoadError && (
          <div
            role="alert"
            className="mb-3 rounded-2xl bg-amber-50 border border-amber-300 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs"
          >
            <span className="font-semibold">
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
              className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-display font-bold uppercase tracking-wider text-[10px] cursor-pointer shrink-0"
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
                  className="office-reveal-2 rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 select-none shadow-xs"
                >
                  <div className="bg-white rounded-xl grid grid-cols-3 divide-x divide-[#E2DFD9]">
                    {/* Metric 1: Transfer Budget */}
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-label={`Transfer Budget ${formatOfficeBudget(save.finances.transferBudget, save.settings.currency)}, Wage room ${formatOfficeWageRoom(wageHeadroom, save.settings.currency)}`}
                      onClick={() => {
                        navigateToSection('transfers', 'market');
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }}
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[#F7F6F3] rounded-l-xl transition-colors cursor-pointer flex flex-col justify-between min-h-[64px] group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D97706]"
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[11px] font-display font-bold uppercase tracking-wider text-zinc-600">
                          Budget
                        </span>
                        <span className="text-sm font-black text-emerald-700 leading-none group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                          &rsaquo;
                        </span>
                      </div>
                      <div className="font-display font-extrabold text-lg sm:text-xl text-zinc-900 leading-tight tracking-tight mt-0.5 font-mono">
                        {formatOfficeBudget(save.finances.transferBudget, save.settings.currency)}
                      </div>
                      <div className="text-[11px] sm:text-xs font-semibold text-emerald-700 whitespace-nowrap mt-0.5">
                        {formatOfficeWageRoom(wageHeadroom, save.settings.currency)} room
                      </div>
                    </button>

                    {/* Metric 2: League Position */}
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-label={`League Position ${formatOrdinalRank(userRank)}, ${userStanding?.points || 0} points`}
                      onClick={() => handleTabChange('table')}
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[#F7F6F3] transition-colors cursor-pointer flex flex-col justify-between min-h-[64px] group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D97706]"
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="text-[11px] font-display font-bold uppercase tracking-wider text-zinc-600">
                          League
                        </span>
                        <span className="text-sm font-black text-amber-700 leading-none group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                          &rsaquo;
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-display font-extrabold text-lg sm:text-xl text-zinc-900 leading-tight">
                          {formatOrdinalRank(userRank)}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold font-mono text-zinc-600 whitespace-nowrap">
                          {userStanding?.points || 0} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1" aria-label="Recent 5 match form">
                        {(recentFormResults.length > 0
                          ? recentFormResults.slice(-5)
                          : (['W', 'W', 'D', 'W', 'W'] as const)
                        ).map((res, idx) => (
                          <span
                            key={idx}
                            data-force-white="true"
                            className={`w-4.5 h-4.5 rounded-[4px] text-[10px] font-display font-extrabold text-white flex items-center justify-center ${
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
                      className="px-2.5 sm:px-3.5 py-2.5 text-left hover:bg-[#F7F6F3] rounded-r-xl transition-colors cursor-pointer flex flex-col justify-between min-h-[64px] group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D97706]"
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`text-[11px] font-display font-bold uppercase tracking-wider flex items-center gap-1 ${
                            reviewTotal > 0 ? 'text-amber-800' : 'text-zinc-600'
                          }`}
                        >
                          {reviewTotal > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" aria-hidden="true" />
                          )}
                          <span>Review</span>
                        </span>
                        <span className="text-sm font-black text-zinc-600 leading-none group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                          &rsaquo;
                        </span>
                      </div>
                      <div
                        className={`font-display font-extrabold text-lg sm:text-xl leading-tight mt-0.5 font-mono ${
                          reviewTotal > 0 ? 'text-amber-800' : 'text-zinc-900'
                        }`}
                      >
                        {reviewTotal}
                      </div>
                      <div
                        className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap mt-0.5 ${
                          reviewTotal > 0 ? 'text-amber-800' : 'text-zinc-600'
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
                      {/* V11 Double-Bezel Matchday Showcase Card */}
                      <div className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 shadow-xs overflow-hidden">
                        {/* Charcoal Stadium Header Strip */}
                        <div
                          data-force-white="true"
                          className="relative rounded-t-xl overflow-hidden px-3.5 py-3 flex items-start justify-between gap-2"
                          style={{
                            backgroundColor: '#1E2024',
                            borderBottom: '2px solid #D97706',
                          }}
                        >
                          <img
                            src="/images/photo_stadium_bowl.jpg"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                          />
                          <div className="relative z-10 min-w-0 text-left">
                            <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-amber-300 leading-tight whitespace-nowrap">
                              Next Fixture
                            </div>
                            <div className="text-[13px] sm:text-sm font-display font-bold text-white leading-tight whitespace-nowrap mt-0.5">
                              {nextScheduled.cupId === CUP_IDS.PRESEASON
                                ? `${save.preseasonState?.tournamentName || 'Pre-Season Tour'}`
                                : nextScheduled.isCup
                                ? `${nextScheduled.cupName} • ${nextScheduled.roundName}`
                                : `Matchday ${(nextScheduled.fixture as LeagueFixture).round} of 38`}
                            </div>
                          </div>

                          <div className="relative z-10 text-right shrink-0">
                            <div className="font-display font-bold text-[12.5px] sm:text-sm text-white leading-tight whitespace-nowrap">
                              {formatOfficeFixtureDate(nextScheduled.fixture.date)}
                            </div>
                            <div className="text-[11px] sm:text-xs font-semibold text-zinc-300 leading-tight mt-0.5 whitespace-nowrap">
                              {venueDisplay}
                            </div>
                          </div>
                        </div>

                        {/* Crisp Matchup Body */}
                        <div className="bg-white rounded-b-xl px-3 py-4">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-0.5">
                            {/* Home Club Kit */}
                            <div className="flex flex-col items-center text-center min-w-0 office-kit-enter-left">
                              <OfficeClubJerseySvg
                                club={home}
                                displayName={homeName}
                                uid="office-hero-home"
                              />
                              <h3 className="font-display font-extrabold text-[15px] sm:text-base text-zinc-900 tracking-tight truncate max-w-full mt-1.5">
                                {homeName}
                              </h3>
                              <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                                {isNeutralWembley ? 'Neutral' : 'Home'}
                              </span>
                            </div>

                            {/* Center VS */}
                            <div className="flex flex-col items-center justify-center px-1.5 -mt-5">
                              <span className="w-9 h-9 rounded-full bg-[#F7F6F3] border border-[#E2DFD9] flex items-center justify-center font-display font-black text-xs text-zinc-700 uppercase tracking-wider">
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
                              <h3 className="font-display font-extrabold text-[15px] sm:text-base text-zinc-900 tracking-tight truncate max-w-full mt-1.5">
                                {awayName}
                              </h3>
                              <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-[#F7F6F3] text-zinc-700 border border-[#E2DFD9] text-[10.5px] font-mono font-bold uppercase tracking-wider">
                                {isNeutralWembley ? 'Neutral' : 'Away'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Hierarchy: Tactile Amber Primary CTA + Clean V11 Secondary Pills */}
                      <div className="relative z-10 space-y-2">
                        <button
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
                              saveCareerSave(deadlineSave);
                              setSave(deadlineSave);
                              showToast('Transfer Deadline Day has arrived! Complete negotiations before 23:00 BST.');
                              return;
                            }
                            if (save.season.currentDate < winterDeadline && fixDate >= winterDeadline) {
                              let deadlineSave = { ...save, season: { ...save.season, currentDate: winterDeadline } };
                              deadlineSave = initializeDeadlineDay(deadlineSave);
                              saveCareerSave(deadlineSave);
                              setSave(deadlineSave);
                              showToast('Winter Transfer Deadline Day has arrived!');
                              return;
                            }
                            setActiveMatchFixture(nextScheduled.fixture);
                          }}
                          className="office-play-match-btn w-full py-3.5 px-6 rounded-xl font-display font-extrabold text-base sm:text-[17px] tracking-tight flex items-center justify-center gap-2 cursor-pointer min-h-[50px] shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                        >
                          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current shrink-0" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>Prepare &amp; Play Match</span>
                          <span className="text-lg leading-none font-bold ml-0.5" aria-hidden="true">&rsaquo;</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            data-office-ui="true"
                            disabled={simulating}
                            onClick={handlePlayNextMatchInstant}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F7F6F3] border border-zinc-300/80 flex items-center justify-center gap-1.5 font-display font-bold text-sm text-zinc-900 cursor-pointer min-h-[44px] transition-all active:scale-[0.98] shadow-2xs focus-visible:outline-2 focus-visible:outline-[#D97706]"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-amber-600" aria-hidden="true">
                              <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                            </svg>
                            <span>Instant Sim</span>
                          </button>

                          <button
                            type="button"
                            data-office-ui="true"
                            onClick={() => setMatchOverviewModal({ type: 'preview', fixture: nextScheduled.fixture })}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F7F6F3] border border-zinc-300/80 flex items-center justify-center gap-1.5 font-display font-bold text-sm text-zinc-900 cursor-pointer min-h-[44px] transition-all active:scale-[0.98] shadow-2xs focus-visible:outline-2 focus-visible:outline-[#D97706]"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-zinc-700" aria-hidden="true">
                              <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
                            </svg>
                            <span>Match Dossier</span>
                          </button>
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
                className="office-reveal-3 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 p-4 space-y-3 text-left shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-display font-black text-[var(--office-text-primary)]">
                    Season {save.season.seasonNumber} Complete
                  </h3>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={handleAdvanceToNextSeasonAction}
                    disabled={simulating}
                    className="office-play-match-btn py-2.5 px-4 rounded-full font-display font-bold text-sm cursor-pointer"
                  >
                    Advance to Season {save.season.seasonNumber + 1} &rsaquo;
                  </button>
                </div>
              </section>
            )}

            {/* 3. CONTRACT REMINDERS (Only shown when action is required — no outer white card) */}
            {officeReviewCount > 0 && (
              <section
                id="managerial-alerts"
                aria-label="Contracts to Review"
                data-office-ui="true"
                className="office-reveal-5 border-y border-slate-300/80 py-2.5 px-1 select-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-[#b45309] shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                      </svg>
                    </span>
                    <h2 className="font-display font-extrabold text-sm sm:text-[15px] text-[#0b1536] truncate">
                      Expiring Contracts
                    </h2>
                  </div>

                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => navigateToSection('transfers', 'contracts')}
                    className="text-[13.5px] sm:text-sm font-display font-extrabold text-[#0f534c] hover:text-[#0f766e] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0 min-h-[32px] focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                  >
                    <span>All contracts</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-300/75 border-t border-slate-300/75 mt-2">
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
                        className="w-full py-2.5 flex items-center justify-between gap-1.5 sm:gap-2.5 text-left hover:bg-amber-500/[0.06] transition-colors cursor-pointer min-h-[46px] group focus-visible:outline-2 focus-visible:outline-[#b45309]"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#d97706] shrink-0" aria-hidden="true" />
                          <span className="px-1.5 py-0.5 rounded bg-[#ccfbf1] text-[#065f46] border border-[#5eead4] font-display font-black text-xs shrink-0">
                            {player.position}
                          </span>
                          <span className="font-display font-extrabold text-[13.5px] sm:text-[15px] text-[#0b1536] tracking-tight truncate">
                            {player.name}
                          </span>
                          <span className="text-xs font-bold text-[#334155] shrink-0">
                            {player.rating} OVR
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#78350f] border border-amber-300 font-display font-extrabold text-xs whitespace-nowrap">
                            {yearsLeft} {yearsLeft === 1 ? 'yr' : 'yrs'} left
                          </span>
                          <span className="text-[#b45309] font-black text-sm group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                            &rsaquo;
                          </span>
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
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="font-display font-extrabold text-xs sm:text-[13px] uppercase tracking-wider text-[#1e293b]">
                  Quick Actions
                </h2>
                <button
                  type="button"
                  data-office-ui="true"
                  aria-expanded={showOfficeSeasonDrawer}
                  onClick={() => setShowOfficeSeasonDrawer((prev) => !prev)}
                  className="text-[13px] sm:text-sm font-display font-bold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 cursor-pointer min-h-[34px] px-1.5 py-0.5 rounded-lg hover:bg-amber-500/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#D97706]"
                >
                  <span>Fast forward</span>
                  <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${showOfficeSeasonDrawer ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Collapsible Fast-Forward / Calendar Strip */}
              {showOfficeSeasonDrawer && (
                <div className="border-y border-slate-300/80 py-2.5 px-1 space-y-2">
                  {injuredCount > 0 && (
                    <div className="text-xs font-extrabold text-[#b91c1c] flex items-center gap-1">
                      <IconMedkit className="w-3.5 h-3.5 shrink-0" />
                      <span>{injuredCount} Injured</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleContinueCalendar}
                      disabled={simulating}
                      className="office-subcard py-2 px-2 rounded-xl font-display font-extrabold text-xs sm:text-[13px] text-[#1e40af] cursor-pointer min-h-[42px]"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_match')}
                      disabled={simulating || !nextScheduled}
                      className="office-subcard py-2 px-2 rounded-xl font-display font-extrabold text-xs sm:text-[13px] text-[#0b1536] cursor-pointer min-h-[42px]"
                    >
                      Next Match
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_week')}
                      disabled={simulating}
                      className="office-subcard py-2 px-2 rounded-xl font-display font-extrabold text-xs sm:text-[13px] text-[#0b1536] cursor-pointer min-h-[42px]"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_month')}
                      disabled={simulating}
                      className="office-subcard py-2 px-2 rounded-xl font-display font-extrabold text-xs sm:text-[13px] text-[#0b1536] cursor-pointer min-h-[42px]"
                    >
                      1 Month
                    </button>
                  </div>
                </div>
              )}

              {/* V11 Tactile Quick Actions Tray */}
              <div className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 shadow-xs">
                <div className="bg-white rounded-xl p-2 grid grid-cols-3 gap-2">
                  {/* Tactics */}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => {
                      handleTabChange('squad');
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }}
                    className="my11-tactile rounded-xl bg-[#F7F6F3] hover:bg-white border border-[#E2DFD9] hover:border-amber-400/80 py-2.5 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[68px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1E2024] text-white flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                        <circle cx="18" cy="6" r="2" fill="currentColor" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                        <circle cx="6" cy="18" r="2" fill="currentColor" />
                        <circle cx="18" cy="18" r="2" fill="currentColor" />
                        <path d="M7.5 7.5 10.5 10.5M16.5 7.5 13.5 10.5M10.5 13.5 7.5 16.5M13.5 13.5 16.5 16.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="font-display font-bold text-xs text-zinc-900 leading-tight whitespace-nowrap">
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
                    className="my11-tactile rounded-xl bg-[#F7F6F3] hover:bg-white border border-[#E2DFD9] hover:border-amber-400/80 py-2.5 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[68px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1E2024] text-white flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                        <path d="M20.57 14.86 22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                      </svg>
                    </div>
                    <span className="font-display font-bold text-xs text-zinc-900 leading-tight whitespace-nowrap">
                      Training
                    </span>
                  </button>

                  {/* Boardroom */}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => navigateToSection('transfers', 'board', 'board-room-section')}
                    className="my11-tactile rounded-xl bg-[#F7F6F3] hover:bg-white border border-[#E2DFD9] hover:border-amber-400/80 py-2.5 px-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[68px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1E2024] text-white flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                      </svg>
                    </div>
                    <span className="font-display font-bold text-xs text-zinc-900 leading-tight whitespace-nowrap">
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
                    data-force-white="true"
                    onClick={() => {
                      navigateToSection('transfers', 'infrastructure', 'transfer-infrastructure-section');
                    }}
                    className="w-full text-left rounded-2xl px-3.5 py-2.5 sm:px-4 flex items-center justify-between gap-3 shadow-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer group border border-zinc-800"
                    style={{
                      backgroundColor: '#1E2024',
                      borderBottom: '2px solid #D97706',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-display font-bold text-xs text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                        HQ
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                            Facilities
                          </span>
                          {activeCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-zinc-950">
                              {activeCount} Upgrading
                            </span>
                          )}
                        </div>
                        <h4 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                          {save.club.stadiumName || 'Club Stadium'} • {cap.toLocaleString()} seats
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-display font-bold text-amber-300 group-hover:text-white transition-colors shrink-0">
                      <span className="hidden sm:inline">Manage</span>
                      <span className="text-base font-black leading-none group-hover:translate-x-0.5 transition-transform">&rsaquo;</span>
                    </div>
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
                    className="w-full border-t border-slate-300/80 pt-2.5 pb-1.5 px-1 hover:bg-slate-900/[0.03] flex flex-col gap-1.5 cursor-pointer transition-colors min-h-[54px] group focus-visible:outline-2 focus-visible:outline-[#1d5eff]"
                  >
                    {/* Header Line: Label + Round on Left, Stats Action on Right */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-extrabold text-xs uppercase tracking-wider text-[#1e3a8a]">
                          {prevScheduled ? 'Last Result' : 'Match Preview'}
                        </span>
                        <span className="text-[#334155] font-bold text-xs">
                          &bull; {roundLabel}
                        </span>
                      </div>
                      <span className="font-display font-extrabold text-[13.5px] sm:text-sm text-[#1e40af] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        <span>Stats</span>
                        <span aria-hidden="true">&rsaquo;</span>
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
                        <span className="font-display font-extrabold text-sm sm:text-[15px] text-[#0b1536] tracking-tight whitespace-nowrap">
                          {homeName}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0b1536] text-white font-display font-black text-[13.5px] sm:text-sm shrink-0 whitespace-nowrap shadow-2xs">
                        {scoreLabel}
                      </span>

                      <div className="flex items-center justify-end gap-1.5 min-w-0">
                        <span className="font-display font-extrabold text-sm sm:text-[15px] text-[#0b1536] tracking-tight whitespace-nowrap">
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
              className="office-floating-card rounded-3xl p-4 sm:p-5 w-full max-w-lg max-h-[85vh] flex flex-col space-y-3.5 border border-indigo-100/80 shadow-2xl overflow-hidden"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--office-divider)] pb-2.5 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#1d5eff] shrink-0">
                    <IconMail className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-extrabold text-sm text-[var(--office-text-primary)] flex items-center gap-2">
                      <span className="truncate">Managerial Inbox</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-[#1d5eff] font-bold shrink-0">
                        {allInbox.length}
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadInboxCount > 0 && (
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleMarkAllMessagesRead}
                      className="text-xs font-bold text-[#1d5eff] hover:underline cursor-pointer inline-flex items-center gap-1 min-h-[36px] px-1"
                    >
                      <IconCheck className="w-3 h-3 shrink-0" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShowOfficeInboxModal(false)}
                    className="office-subcard w-9 h-9 rounded-full flex items-center justify-center text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] transition-colors cursor-pointer shrink-0"
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
                      className={`min-h-[36px] px-2.5 rounded-xl text-xs font-display font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'office-nav-tab-active shadow-sm'
                          : 'office-subcard text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)]'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className="font-mono text-[10px] opacity-80">{filter.count}</span>
                    </button>
                  );
                })}
                <select
                  aria-label="Filter by message type"
                  value={['board', 'transfer', 'injury', 'match_report'].includes(inboxFilter) ? inboxFilter : ''}
                  onChange={(e) => setInboxFilter((e.target.value || 'all') as typeof inboxFilter)}
                  className="ml-auto min-w-0 min-h-[36px] px-2 rounded-xl bg-white border border-slate-300 text-xs font-display font-bold text-[var(--office-text-primary)] cursor-pointer"
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
                      <p className="py-8 text-center text-xs font-semibold text-[var(--office-text-muted)]">
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
                        className={`office-subcard rounded-2xl p-3.5 space-y-2 cursor-pointer text-left transition-all hover:bg-indigo-50/20 ${
                          !msg.isRead
                            ? 'border-l-4 border-l-[#1d5eff] bg-gradient-to-r from-indigo-50/30 via-white to-white'
                            : ''
                        }`}
                      >
                        {/* Card Header & Priority Tag */}
                        <div className="flex items-center justify-between gap-2 text-[10.5px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!msg.isRead && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#1d5eff] shrink-0 motion-safe:animate-pulse"
                                title="Unread message"
                              />
                            )}
                            <span className="font-display font-bold text-[var(--office-text-primary)] truncate">
                              {msg.sender}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isActionRequired ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <IconAlert className="w-2.5 h-2.5 shrink-0" />
                                <span>Action Required</span>
                              </span>
                            ) : isImportant ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <IconStar className="w-2.5 h-2.5 shrink-0" filled />
                                <span>Important</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1d5eff] border border-blue-200 flex items-center gap-1">
                                <IconDocument className="w-2.5 h-2.5 shrink-0" />
                                <span>Info</span>
                              </span>
                            )}
                            <span className="font-mono text-[var(--office-text-muted)] text-[10px]">
                              {formatOfficeShortDate(msg.date)}
                            </span>
                          </div>
                        </div>

                        {/* Message Subject */}
                        <div className="font-display font-bold text-xs text-[var(--office-text-primary)] leading-snug">
                          {msg.subject}
                        </div>

                        {/* Body & Actions */}
                        {isExpanded ? (
                          <div className="pt-2 border-t border-[var(--office-divider)] space-y-2.5 animate-fade-in">
                            <p className="text-[11px] text-[var(--office-text-secondary)] whitespace-pre-line leading-relaxed">
                              {msg.body}
                            </p>
                            {effectiveActionType === 'promise_game_time' && !isResolved && (targetId || msg.targetId) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <button
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
                                  className="office-action-btn-primary py-2 px-3 rounded-xl font-display font-black text-[10.5px] uppercase tracking-wider shadow-sm cursor-pointer"
                                >
                                  Promise 3/5 Starts
                                </button>
                                <button
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
                                  className="py-2 px-3 rounded-xl bg-white border border-slate-300 hover:border-blue-400 text-slate-800 font-display font-bold text-[10.5px] uppercase tracking-wider cursor-pointer"
                                >
                                  Explain Rotation
                                </button>
                                <button
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
                                  className="py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-display font-bold text-[10.5px] uppercase tracking-wider cursor-pointer"
                                >
                                  Transfer List
                                </button>
                              </div>
                            ) : effectiveActionLabel && !isResolved ? (
                              <button
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
                                className="office-action-btn-primary w-full py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                <span>{effectiveActionLabel}</span>
                                <span>&rarr;</span>
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[11px] text-[var(--office-text-muted)] truncate">
                              {msg.body.replace(/\n+/g, ' ')}
                            </p>
                            {isActionRequired && effectiveActionLabel && (
                              <div className="text-[10px] font-bold text-[#1d5eff] flex items-center gap-1 pt-0.5">
                                <IconBolt className="w-3 h-3 shrink-0" />
                                <span>{effectiveActionLabel}</span>
                                <span>&rsaquo;</span>
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
                    className="w-full min-h-[40px] text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
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
            saveCareerSave(finalSave);
            setSave(finalSave);
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
          <div className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl text-left relative text-[#0b1536] max-h-[90dvh] overflow-y-auto">
            <header className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block font-display">
                  Official Announcement
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  8 July {save.season.yearStart}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-[#0b1536] uppercase tracking-tight flex items-center gap-2">
                <IconCalendar className="w-5 h-5 text-[#1d5eff] shrink-0" />
                <span>Premier League Fixture Release Day!</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The Premier League computer has officially finalized all 38 fixtures for the {save.season.yearStart}/{(save.season.yearStart + 1).toString().slice(-2)} season. Opening day, rival derbies, festive fixtures, and the final day are ready.
              </p>
            </header>

            <div className="office-subcard border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2 bg-slate-50/70">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-medium">Campaign Length:</span>
                <span className="font-mono text-[#0b1536] font-bold">38 Matchday Rounds</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-medium">Match Allocation:</span>
                <span className="font-mono text-amber-800 font-bold">19 Home • 19 Away</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  setShowFixtureReleaseModal(true);
                }}
                className="office-action-btn-primary flex-1 py-3 px-4 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <IconSparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Launch Live Reveal Ceremony</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  handleFinishFixtureRelease();
                }}
                className="office-subcard py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-display font-bold text-xs uppercase transition-all cursor-pointer text-center shadow-2xs inline-flex items-center justify-center gap-1.5"
              >
                <IconSkipForward className="w-3.5 h-3.5 shrink-0" />
                <span>Skip &amp; Unlock Calendar</span>
              </button>
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
          <div className="office-floating-card bg-white border border-amber-300/80 rounded-3xl p-5 sm:p-7 max-w-xl w-full space-y-4 shadow-2xl text-left relative max-h-[90dvh] overflow-y-auto text-[#0b1536]">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider font-display">
                  Season {save.season.seasonNumber} Review
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-black text-[#0b1536] uppercase tracking-tight flex items-center gap-2">
                  {seasonSummary.leagueTitle ? (
                    <>
                      <IconCrown className="w-5 h-5 text-amber-500 shrink-0" />
                      <span>League Champions</span>
                    </>
                  ) : (
                    <span>Finished {formatOrdinalRank(seasonSummary.finalPosition)}</span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSeasonReviewModal(false)}
                className="w-10 h-10 rounded-full office-subcard border border-slate-200 text-slate-500 hover:text-[#0b1536] flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Headline result: record, prize, silverware, Europe (each shown once) */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-200 py-3">
              {userStanding && (
                <div>
                  <dt className="text-[11px] font-bold text-slate-500 uppercase">Record</dt>
                  <dd className="font-display font-black text-base text-[#0b1536]">
                    {userStanding.won}W {userStanding.drawn}D {userStanding.lost}L
                    <span className="font-mono font-bold text-xs text-slate-600"> · {userStanding.points} pts</span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-bold text-slate-500 uppercase">Prize Money</dt>
                <dd className="font-display font-black text-base text-emerald-700">
                  +{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold text-slate-500 uppercase">Silverware</dt>
                <dd className="font-display font-black text-base text-amber-700">
                  {seasonSummary.trophiesWon.length > 0
                    ? `${seasonSummary.trophiesWon.length} ${seasonSummary.trophiesWon.length === 1 ? 'Trophy' : 'Trophies'}`
                    : 'None'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-bold text-slate-500 uppercase">Europe</dt>
                <dd className="font-display font-bold text-xs text-blue-700 leading-snug pt-1">
                  {seasonSummary.europeanQualification}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-slate-700">
              Season {save.season.seasonNumber + 1} transfer budget:{' '}
              <span className="font-mono font-bold text-[#0b1536]">
                {formatCareerCurrency(save.finances.transferBudget + seasonSummary.prizeMoney, save.settings.currency)}
              </span>
            </p>

            {/* Secondary detail behind disclosures (collapsed by default) */}
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              <div>
                <button
                  type="button"
                  aria-expanded={seasonReviewOpenSection === 'growth'}
                  onClick={() => setSeasonReviewOpenSection((prev) => (prev === 'growth' ? null : 'growth'))}
                  className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer text-xs font-display font-black uppercase tracking-wider text-[#0b1536]"
                >
                  <span className="flex items-center gap-1.5">
                    <IconSprout className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Player Development ({seasonSummary.progressionReport.logs.length})</span>
                  </span>
                  <IconChevronDown className={`w-4 h-4 shrink-0 ${seasonReviewOpenSection === 'growth' ? 'rotate-180' : ''}`} />
                </button>
                {seasonReviewOpenSection === 'growth' && (
                  <div className="pb-3 space-y-1.5">
                    <p className="text-[11px] text-slate-600">Everyone ages a year; fitness resets to 100%.</p>
                    <ul className="text-xs text-slate-700 divide-y divide-slate-200">
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
                    className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer text-xs font-display font-black uppercase tracking-wider text-[#0b1536]"
                  >
                    <span className="flex items-center gap-1.5">
                      <IconRefresh className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
                      <span>Promoted &amp; Relegated</span>
                    </span>
                    <IconChevronDown className={`w-4 h-4 shrink-0 ${seasonReviewOpenSection === 'division' ? 'rotate-180' : ''}`} />
                  </button>
                  {seasonReviewOpenSection === 'division' && (
                    <div className="pb-3 space-y-1.5 text-xs">
                      {seasonSummary.promotedClubNames && seasonSummary.promotedClubNames.length > 0 && (
                        <p className="flex items-start gap-1.5 text-emerald-900">
                          <IconTrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-bold">Up:</span> {seasonSummary.promotedClubNames.join(', ')}
                          </span>
                        </p>
                      )}
                      {seasonSummary.relegatedClubNames && seasonSummary.relegatedClubNames.length > 0 && (
                        <p className="flex items-start gap-1.5 text-rose-900">
                          <IconTrendingUp className="w-3.5 h-3.5 rotate-180 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-bold">Down:</span> {seasonSummary.relegatedClubNames.join(', ')}
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
              <button
                type="button"
                onClick={() => setShowSeasonReviewModal(false)}
                className="office-subcard py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSeasonReviewModal(false);
                  handleAdvanceToNextSeasonAction();
                }}
                disabled={simulating}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <IconArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>Start Season {save.season.seasonNumber + 1}</span>
              </button>
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
          <div className="office-floating-card bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-left relative text-slate-900 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">
                {getFastForwardDetails(pendingFastForward).title}
              </h3>
              <button
                type="button"
                onClick={() => setPendingFastForward(null)}
                className="w-10 h-10 rounded-full office-subcard border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Simulates to{' '}
              <span className="font-bold text-blue-700">{getFastForwardDetails(pendingFastForward).targetDate}</span>.
              Results are permanent unless Match Retry is on.
            </p>

            <div className="divide-y divide-slate-200 border-y border-slate-200 text-xs font-bold text-slate-900">
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
                  className="min-w-0 min-h-[36px] px-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <option value="deadline">Deadline day</option>
                  <option value="window_open_or_close">Window open + deadline</option>
                  <option value="none">Never</option>
                </select>
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPendingFastForward(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = pendingFastForward;
                  setPendingFastForward(null);
                  handleTimeSkipAction(target, {
                    usePreferredEleven: fastForwardUsePreferredEleven,
                    haltOnTransferMilestone: fastForwardHaltOnTransferMilestone,
                  });
                }}
                className="flex-1 py-3 px-4 rounded-xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Fast Forward
              </button>
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
          <div className="office-floating-card bg-white border border-rose-300 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl text-center relative text-[#0b1536] max-h-[90dvh] overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
              <IconAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider font-display">
                Board of Directors Executive Notice
              </span>
              <h3 className="text-2xl font-display font-black text-rose-700 uppercase tracking-tight">
                Contract Terminated
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                The Board of Directors of {effectiveClubName} has officially relieved you of your duties as first-team manager following an unacceptable run of league results and failure to meet seasonal expectations.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Board Confidence</div>
              <div className="text-xl font-display font-black text-rose-700">0% (Dismissed)</div>
              <div className="text-[10px] text-slate-600 font-medium">Club Objective Failed</div>
            </div>

            {/* Option C: Sacking Carousel Rebound Job Offers */}
            {(() => {
              const savedRebounds = (save.managerCareer?.jobOffers || []).filter(
                (o) => o.status === 'pending' && o.isEmergencyRebound
              );
              const carouselOffers = savedRebounds.length > 0 ? savedRebounds : generateEmergencyReboundOffers(save);
              if (carouselOffers.length === 0) return null;

              return (
                <section aria-label="Sacking Carousel Offers" className="text-left space-y-2 border-t border-slate-200 pt-3">
                  <div className="text-[10px] font-display font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <IconBriefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>Sacking Carousel — Emergency Rebound Offers ({carouselOffers.length})</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {carouselOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="office-subcard p-2.5 flex items-center justify-between gap-2 border border-slate-200 bg-slate-50/70"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-black text-xs text-slate-900 truncate">
                            {offer.clubName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {offer.clubTier.toUpperCase()} • Budget {formatOfficeBudget(offer.transferBudget, save.settings.currency)}
                          </div>
                        </div>
                        <button
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
                              showToast(`Rebound accepted! Welcome to ${offer.clubName}.`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer"
                        >
                          Take Job
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/career"
                className="w-full py-3 px-4 rounded-xl office-subcard border border-slate-200 text-slate-700 hover:text-slate-900 font-display font-black text-xs uppercase tracking-wider transition-all shadow-2xs text-center"
              >
                Accept Dismissal &amp; Resign
              </Link>
              <button
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Appeal to Board (One Final Chance)
              </button>
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
            showToast('Squad registration submitted successfully.');
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
            className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-center text-[#0b1536]"
          >
            <div className="w-12 h-12 rounded-2xl office-subcard border border-slate-200 text-slate-700 flex items-center justify-center mx-auto shadow-2xs">
              <IconArrowLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-[#0b1536] text-base uppercase tracking-tight">
                Exit Career Mode?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Your season progress is automatically saved to your device. Where would you like to go?
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <Link
                href="/career"
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                <IconSave className="w-3.5 h-3.5" />
                <span>Save Slots Screen</span>
              </Link>
              <Link
                href="/"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <IconHome className="w-3.5 h-3.5" />
                <span>Main Title Screen</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOARDROOM CONFIDENCE DOSSIER MODAL */}
      {showBoardDossierModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBoardDossierModal(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in motion-reduce:animate-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl relative text-[#0b1536] max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#1d5eff] flex items-center justify-center shrink-0">
                  <IconBuilding className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-sm uppercase tracking-wide text-[#0b1536] truncate">
                    Boardroom Confidence Dossier
                  </h3>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Comprehensive 1% granular club management evaluation
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBoardDossierModal(false)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full office-subcard border border-slate-200 text-slate-500 hover:text-[#0b1536] flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Overall Score Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              boardConfidence >= 65
                ? 'bg-emerald-50/80 border-emerald-300'
                : boardConfidence >= 45
                ? 'bg-amber-50/80 border-amber-300'
                : 'bg-rose-50/80 border-rose-300'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Standing</span>
                <div className="font-display font-black text-lg uppercase flex items-center gap-2">
                  <span className={boardConfidence >= 65 ? 'text-emerald-700' : boardConfidence >= 45 ? 'text-amber-700' : 'text-rose-700'}>
                    {boardConfidence >= 75
                      ? 'Delighted'
                      : boardConfidence >= 60
                      ? 'Content'
                      : boardConfidence >= 45
                      ? 'Under Scrutiny'
                      : 'Precarious'}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                    boardConfidence >= 65
                      ? 'bg-white text-emerald-800 border-emerald-200'
                      : boardConfidence >= 45
                      ? 'bg-white text-amber-800 border-amber-200'
                      : 'bg-white text-rose-800 border-rose-200'
                  }`}>
                    {boardConfidence}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Season Objective</span>
                <span className="text-xs font-display font-black text-blue-700">
                  {boardStatus.expectation || (save.club.tier === 'elite' ? 'Win Title' : save.club.tier === 'upper' ? 'European Qualification' : 'Avoid Relegation')}
                </span>
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <div className="space-y-2">
              <span className="text-[10.5px] uppercase font-display font-black text-slate-500 tracking-wider block">
                Evaluation Pillars Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(boardStatus.pillars || [
                  {
                    title: 'League Expectation',
                    score: Math.min(100, Math.max(10, boardConfidence + 2)),
                    description: boardStatus.leagueContext || 'Tracking aligned with board league target.',
                    positive: boardConfidence >= 50
                  },
                  {
                    title: 'Recent Form',
                    score: Math.min(100, Math.max(10, boardConfidence - 3)),
                    description: boardStatus.formContext || 'Recent match results evaluated by directors.',
                    positive: boardConfidence >= 55
                  },
                  {
                    title: 'Financial Discipline',
                    score: Math.min(100, Math.max(10, boardConfidence + 5)),
                    description: boardStatus.financialContext || 'Wage bill and net transfer spending sustainable.',
                    positive: true
                  },
                  {
                    title: 'Squad & Goal Diff',
                    score: boardConfidence,
                    description: 'Roster depth and scoring efficiency meets benchmarks.',
                    positive: boardConfidence >= 45
                  }
                ]).map((pillar, idx) => (
                  <div key={idx} className="office-subcard border border-slate-200/80 p-3 rounded-2xl space-y-1.5 shadow-2xs bg-slate-50/60">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#0b1536] font-display font-bold">{pillar.title}</span>
                      <span className={`font-mono font-bold ${pillar.positive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {pillar.score}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pillar.positive ? 'bg-emerald-600' : pillar.score >= 45 ? 'bg-amber-500' : 'bg-rose-600'
                        }`}
                        style={{
                          width: `${
                            pillar.positive && pillar.score <= 25
                              ? Math.min(100, Math.max(35, pillar.score * 8))
                              : Math.min(100, Math.max(10, pillar.score))
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug font-medium">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowBoardDossierModal(false);
                  setTransferHubSubTab('board');
                  handleTabChange('transfers');
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }}
                className="office-subcard hover:border-[#1d5eff] text-slate-700 hover:text-[#1d5eff] font-display font-bold uppercase tracking-wider text-xs py-2 px-3 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <IconBuilding className="w-3.5 h-3.5 shrink-0" />
                <span>Full Boardroom &amp; Petitions</span>
                <IconArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => setShowBoardDossierModal(false)}
                className="office-action-btn-primary py-2 px-4 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                Close
              </button>
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
        <div className="min-h-screen my11-canvas text-slate-900 flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Manager Office...
        </div>
      }
    >
      <CareerPlayHubContent />
    </Suspense>
  );
}
