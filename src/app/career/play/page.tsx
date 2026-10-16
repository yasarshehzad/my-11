'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCareerSave, saveCareerSave, exportCareerSaveAsJson, isValidSlotId, ValidSlotId } from '../../../career/saves';
import {
  CareerSaveFile,
  CareerSettings,
  LeagueFixture,
  Club,
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
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
  formatCareerWage,
} from '../../../career/formatters';
import { getSavedTheme, saveTheme } from '../../../utils/storage';
import { SquadManagement } from '../../../components/career/SquadManagement';
import { FixturesCalendar } from '../../../components/career/FixturesCalendar';
import { LeagueTable } from '../../../components/career/LeagueTable';
import { TournamentsHub } from '../../../components/career/TournamentsHub';
import { TransferHub } from '../../../components/career/TransferHub';
import { TransferDeadlineDayScreen } from '../../../components/career/TransferDeadlineDayScreen';
import { MatchDayModal } from '../../../components/career/MatchDayModal';
import { MatchOverviewModal } from '../../../components/career/MatchOverviewModal';
import { InstantMatchSummaryModal } from '../../../components/career/InstantMatchSummaryModal';
import { InstantSimLoadingModal } from '../../../components/career/InstantSimLoadingModal';
import { CelebrationModal } from '../../../components/career/CelebrationModal';
import { PreseasonTourModal } from '../../../components/career/PreseasonTourModal';
import { FixtureReleaseModal } from '../../../components/career/FixtureReleaseModal';
import { ChampionsLeagueDrawModal } from '../../../components/career/ChampionsLeagueDrawModal';
import { PlayerComparisonModal } from '../../../components/career/PlayerComparisonModal';
import { SquadRegistrationModal } from '../../../components/career/SquadRegistrationModal';
import { isSeasonComplete, advanceToNextSeason, getSeasonReviewSummary, SeasonReviewSummary } from '../../../career/seasons';
import {
  shouldShowPreseasonPrompt,
  applyPreseasonTourChoice,
  simulateAssistantPreseasonMatch,
} from '../../../career/preseason';
import { applyChampionsLeagueDraw } from '../../../career/championsLeague';
import { PreseasonTourId } from '../../../career/types';
import { getNextClubFixture, getNextScheduledMatch, getPreviousPlayedMatch, isDateInInternationalBreak, ScheduledMatch } from '../../../career/calendar';
import { simulateMatchFixture, advanceTimeSkip, TimeSkipTarget } from '../../../career/sim';
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
} from '../../../career/inbox';
import { calculateStandings } from '../../../career/table';
import { formatCurrency } from '../../../career/finance';
import { getSeniorPlayerCount, getSquadOrderedByLineup, getBestStartingLineup } from '../../../career/squad';
import {
  evaluateBoardConfidence,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
  getScoutingMarketPool,
} from '../../../career/transfers';
import { updatePlayerForm, applyInSeasonMatchProgression } from '../../../career/formAndProgression';

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
  const k = Math.max(0, Math.round(weeklyAmount / 1_000));
  return `${sym}${k}k / w`;
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
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      <svg
        viewBox="0 0 600 260"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="office-sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8ec8f9" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#cae5ff" stopOpacity="0.92" />
            <stop offset="75%" stopColor="#eff6ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="office-stand-left" x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.88" />
            <stop offset="55%" stopColor="#4338ca" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="office-stand-right" x1="100%" y1="0%" x2="0%" y2="40%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.88" />
            <stop offset="55%" stopColor="#4338ca" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.08" />
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
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="62%" stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Sky Base */}
        <rect x="0" y="0" width="600" height="260" fill="url(#office-sky-grad)" />

        {/* Soft Billowy Daytime Clouds */}
        <g fill="#ffffff" opacity="0.88">
          <circle cx="210" cy="48" r="36" />
          <circle cx="255" cy="38" r="46" />
          <circle cx="305" cy="42" r="50" />
          <circle cx="355" cy="40" r="44" />
          <circle cx="398" cy="52" r="34" />
          <circle cx="150" cy="64" r="28" opacity="0.68" />
          <circle cx="450" cy="64" r="28" opacity="0.68" />
        </g>

        {/* Distant Center Stadium Bowl Tiers */}
        <path
          d="M 155 152 Q 300 124 445 152 L 465 196 L 135 196 Z"
          fill="#94a3b8"
          opacity="0.32"
        />
        <path
          d="M 170 148 Q 300 120 430 148"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          opacity="0.4"
        />
        <path
          d="M 162 164 Q 300 138 438 164"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2"
          opacity="0.55"
        />

        {/* Left Stadium Roof Canopy & Steel Trusses */}
        <path d="M -10 24 L 185 72 L 162 90 L -10 56 Z" fill="#475569" opacity="0.7" />
        <path d="M -10 36 L 176 78 L 164 88 L -10 54 Z" fill="#1e293b" opacity="0.82" />
        <g stroke="#e2e8f0" strokeWidth="1.4" opacity="0.72">
          <line x1="12" y1="36" x2="20" y2="54" />
          <line x1="36" y1="42" x2="42" y2="59" />
          <line x1="62" y1="48" x2="66" y2="64" />
          <line x1="88" y1="54" x2="90" y2="69" />
          <line x1="114" y1="60" x2="114" y2="74" />
          <line x1="140" y1="66" x2="138" y2="79" />
        </g>

        {/* Right Stadium Roof Canopy & Steel Trusses */}
        <path d="M 610 24 L 415 72 L 438 90 L 610 56 Z" fill="#475569" opacity="0.7" />
        <path d="M 610 36 L 424 78 L 436 88 L 610 54 Z" fill="#1e293b" opacity="0.82" />
        <g stroke="#e2e8f0" strokeWidth="1.4" opacity="0.72">
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
        <path d="M -10 102 L 190 136" stroke="#ef4444" strokeWidth="4" opacity="0.78" />
        <path d="M -10 106 L 190 139" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
        <path d="M -10 138 L 195 162" stroke="#ef4444" strokeWidth="3.5" opacity="0.68" />
        <path d="M -10 142 L 195 165" stroke="#3b82f6" strokeWidth="2.5" opacity="0.68" />
        <path d="M -10 172 L 195 186" stroke="#ef4444" strokeWidth="3" opacity="0.55" />

        <path d="M 610 102 L 410 136" stroke="#ef4444" strokeWidth="4" opacity="0.78" />
        <path d="M 610 106 L 410 139" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
        <path d="M 610 138 L 405 162" stroke="#ef4444" strokeWidth="3.5" opacity="0.68" />
        <path d="M 610 142 L 405 165" stroke="#3b82f6" strokeWidth="2.5" opacity="0.68" />
        <path d="M 610 172 L 405 186" stroke="#ef4444" strokeWidth="3" opacity="0.55" />

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

        {/* Feather Fade into Crisp Card Bottom */}
        <rect x="0" y="160" width="600" height="100" fill="url(#office-bottom-fade)" />
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
  const [theme] = useState<'dark' | 'light'>('light');
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings'>('overview');
  const [tabHistory, setTabHistory] = useState<('overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings')[]>([]);
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
  const [inboxFilter, setInboxFilter] = useState<'all' | 'action_required' | 'unread' | 'board' | 'injury' | 'transfer' | 'cup_draw'>('all');
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [pendingFastForward, setPendingFastForward] = useState<TimeSkipTarget | null>(null);
  const [fastForwardUsePreferredEleven, setFastForwardUsePreferredEleven] = useState(true);
  const [fastForwardHaltOnTransferMilestone, setFastForwardHaltOnTransferMilestone] = useState<'deadline' | 'window_open_or_close' | 'none'>('deadline');
  const [showSeasonReviewModal, setShowSeasonReviewModal] = useState(false);
  const [transferHubSubTab, setTransferHubSubTab] = useState<'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board'>('market');
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

  // Auto-prompt pre-season tour selection or fixture release day
  useEffect(() => {
    if (!save) return;
    if (shouldShowPreseasonPrompt(save)) {
      setShowPreseasonModal(true);
    } else if (
      save.season.currentDate >= `${save.season.yearStart}-07-08` &&
      !save.fixtureReleaseState?.released
    ) {
      setShowFixtureReleasePromptModal(true);
    }
  }, [save?.season?.currentDate, save?.preseasonState?.hasChosenTour, save?.fixtureReleaseState?.released]);

  useEffect(() => {
    if (
      save &&
      isTransferDeadlineDay(save.season.currentDate, save.season.yearStart) &&
      !save.deadlineDayState?.isActive &&
      save.deadlineDayState?.phase !== 'closed'
    ) {
      const initialized = initializeDeadlineDay(save);
      saveCareerSave(initialized);
      setSave(initialized);
    }
  }, [save?.season?.currentDate, save?.season?.yearStart, save?.deadlineDayState?.isActive, save?.deadlineDayState?.phase]);

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

  const TAB_ORDER: ('overview' | 'squad' | 'fixtures' | 'transfers' | 'table' | 'cups' | 'settings')[] = useMemo(
    () => ['overview', 'squad', 'fixtures', 'transfers', 'table', 'cups', 'settings'],
    []
  );

  const handleTabChange = useCallback((newTab: typeof activeTab, addToHistory: boolean = true) => {
    setIsMoreMenuOpen(false);
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

  const handleHeaderBack = useCallback(() => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      handleTabChange(prevTab, false);
    } else if (activeTab !== 'overview') {
      handleTabChange('overview', false);
    } else {
      setShowExitConfirmModal(true);
    }
  }, [tabHistory, activeTab, handleTabChange]);

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

  // Full market and shortlisted pools for comparison modal
  const fullMarketPool = useMemo(() => {
    if (!save) return [];
    const dbSeason = save.settings?.databaseSeason || save.season?.databaseSeason || '2026/27';
    const poolType = save.settings?.playerPool || 'modern';
    return getScoutingMarketPool(save.squad, { playerPoolType: poolType, sortBy: 'value_desc' }, dbSeason, save.season?.yearStart || 2026);
  }, [save?.squad, save?.settings?.playerPool, save?.settings?.databaseSeason, save?.season?.databaseSeason, save?.season?.yearStart]);

  const shortlistedPool = useMemo(() => {
    if (!save?.shortlistPlayerIds || save.shortlistPlayerIds.length === 0) return [];
    const set = new Set(save.shortlistPlayerIds);
    return fullMarketPool.filter((p) => set.has(p.id));
  }, [save?.shortlistPlayerIds, fullMarketPool]);

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
    } else if (alert.actionTab) {
      navigateToSection(alert.actionTab as typeof activeTab, alert.actionTab === 'transfers' ? 'market' : undefined);
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

  const [currentSlotId, setCurrentSlotId] = useState(slotId);
  if (currentSlotId !== slotId) {
    setCurrentSlotId(slotId);
    const loaded = loadCareerSave(slotId);
    setSave(loaded);
    setEditableSettings(loaded?.settings || null);
    setEditingClubName(loaded?.club.customName || loaded?.club.defaultName || '');
  }

  useEffect(() => {
    saveTheme(theme);

    // Auto-resolve any pending cup ties whose scheduled date has arrived
    if (save && save.cups) {
      const { updatedCups, trophiesAwarded } = autoResolvePendingCupFixtures(
        save.cups,
        save.season.currentDate,
        save.season.yearStart,
        save.club.id
      );

      let hasChanges = trophiesAwarded.length > 0;
      if (!hasChanges) {
        for (const [k, v] of Object.entries(updatedCups)) {
          const oldV = save.cups[k];
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
    }
  }, [checkAndTriggerCelebration]);

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

  const handleUpdateSave = (updated: CareerSaveFile) => {
    saveCareerSave(updated);
    setSave(updated);
    setEditableSettings(updated.settings);
    setEditingClubName(updated.club.customName || updated.club.defaultName);
  };

  const allClubs = getClubsWithUserClub(save?.club);
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
          badge: '⏭️ Next Match',
          targetDate,
          description: `Automatically simulates all other fixtures in the calendar until your next scheduled matchday (${targetDate}). You will be brought to the dressing room ready for kickoff.`,
        };
      }
      case 'next_week': {
        return {
          title: 'Fast Forward +7 Days',
          badge: '📅 +7 Days',
          targetDate: '1 Week Forward',
          description: 'Advances the game calendar by 7 days, simulating all league fixtures that fall within this window and recalculating the table standings.',
        };
      }
      case 'next_month': {
        return {
          title: 'Fast Forward +1 Month',
          badge: '🗓️ +1 Month',
          targetDate: '30 Days Forward',
          description: 'Simulates approximately 30 calendar days of fixtures. Several matchday rounds will be played across the league. Check your squad fitness before proceeding.',
        };
      }
      case 'transfer_deadline': {
        return {
          title: 'Advance to Deadline Day',
          badge: '⏳ Deadline Day',
          targetDate: '1 Sep / 1 Feb',
          description: 'Simulates until the critical transfer window deadline day, allowing you to review last-minute transfer offers and finalize signings.',
        };
      }
      case 'season_end': {
        return {
          title: 'Simulate to Season End',
          badge: '🏁 Season End',
          targetDate: 'Round 38 (Finale)',
          description: `Fast forwards all remaining league matches to conclude Season ${save?.season.seasonNumber || 1}. Final standings, awards, and board review will be finalized.`,
        };
      }
      case 'continue':
      default: {
        return {
          title: 'Advance Calendar',
          badge: '▶️ Continue',
          targetDate: 'Day by Day',
          description: 'Advances the game calendar forward to progress training, daily events, and upcoming fixtures.',
        };
      }
    }
  };

  const handlePlayNextMatchInstant = () => {
    if (!save || !nextScheduled) return;

    // 1. Guard against Deadline Day clock in progress
    if (save.deadlineDayState?.isActive && save.deadlineDayState.phase !== 'closed') {
      showToast('⏱️ Transfer Deadline Day is in progress! Advance the deadline clock or finalize deals before simulating matches.');
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
      showToast('⏱️ Transfer Deadline Day has arrived! The summer window shuts tonight at 23:00 BST. Complete your transfer and squad registration business.');
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
      showToast('⏱️ Transfer Deadline Day has arrived! The winter window shuts tonight at 23:00 BST.');
      return;
    }

    setSimulating(true);

    const isUserHome = nextScheduled.fixture.homeClubId === save.club.id;
    const isUserAway = nextScheduled.fixture.awayClubId === save.club.id;

    // Sanitize squad for league matches: unregistered senior players cannot participate
    const activeSquad = !nextScheduled.isCup
      ? getSquadOrderedByLineup(
          save.squad,
          getBestStartingLineup(
            save.squad,
            save.lineup?.formation || '4-3-3',
            save.registeredPlayerIds,
            save.season?.yearStart
          )
        )
      : (save.lineup && save.lineup.starterIds && save.lineup.starterIds.length > 0)
      ? getSquadOrderedByLineup(save.squad, save.lineup)
      : save.squad;

    if (nextScheduled.isCup && nextScheduled.cupId && save.cups && save.cups[nextScheduled.cupId]) {
      const cupTourney = save.cups[nextScheduled.cupId];
      const cupFix = nextScheduled.fixture as CupFixture;
      const homeClub = findAnyClub(cupFix.homeClubId) || allClubs[0];
      const awayClub = findAnyClub(cupFix.awayClubId) || allClubs[1];

      const simmed = simulateKnockoutCupFixture(
        cupFix,
        homeClub,
        awayClub,
        isUserHome ? activeSquad : undefined,
        isUserAway ? activeSquad : undefined
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

      // Update player form and youth development based on cup match result
      const userGoals = isUserHome ? simmed.homeScore! : simmed.awayScore!;
      const oppGoals = isUserHome ? simmed.awayScore! : simmed.homeScore!;
      const won = userGoals > oppGoals;
      const drew = userGoals === oppGoals;
      const starterIds = new Set(activeSquad.slice(0, 11).map((p) => p.id));

      const updatedSquad = save.squad.map((player) => {
        const isStarter = starterIds.has(player.id);
        const baseRating = won ? 7.5 : drew ? 6.8 : 6.2;
        const matchRating = Number((baseRating + (Math.random() * 1.0 - 0.3)).toFixed(1));
        const withForm = updatePlayerForm(player, matchRating);
        const prog = applyInSeasonMatchProgression(withForm, isStarter ? 90 : 20, matchRating);
        return prog.updatedPlayer;
      });

      const updatedSave: CareerSaveFile = {
        ...save,
        season: {
          ...save.season,
          currentDate: cupFix.date > save.season.currentDate ? cupFix.date : save.season.currentDate,
        },
        cups: updatedCups,
        trophies,
        finances,
        squad: updatedSquad,
      };

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

    const simmed = simulateMatchFixture(
      leagueFix,
      homeClub,
      awayClub,
      isUserHome ? activeSquad : undefined,
      !isUserHome ? activeSquad : undefined
    );

    const currentFixtures = save.fixtures || [];
    const updatedFixtures = currentFixtures.map((f) => {
      if (f.id === simmed.id) return simmed;
      if (f.round === leagueFix.round && !f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });

    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    // Update player form and youth development based on league result
    const userGoals = isUserHome ? simmed.homeScore! : simmed.awayScore!;
    const oppGoals = isUserHome ? simmed.awayScore! : simmed.homeScore!;
    const won = userGoals > oppGoals;
    const drew = userGoals === oppGoals;
    const starterIds = new Set(activeSquad.slice(0, 11).map((p) => p.id));

    const updatedSquad = save.squad.map((player) => {
      const isStarter = starterIds.has(player.id);
      const baseRating = won ? 7.5 : drew ? 6.8 : 6.2;
      const matchRating = Number((baseRating + (Math.random() * 1.0 - 0.3)).toFixed(1));
      const withForm = updatePlayerForm(player, matchRating);
      const prog = applyInSeasonMatchProgression(withForm, isStarter ? 90 : 20, matchRating);
      return prog.updatedPlayer;
    });

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: leagueFix.date > save.season.currentDate ? leagueFix.date : save.season.currentDate,
      },
      fixtures: updatedFixtures,
      standings: updatedStandings,
      squad: updatedSquad,
    };

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
    const updated = markMessageRead(save, msgId);
    handleUpdateSave(updated);
    setExpandedMessageId((prev) => (prev === msgId ? null : msgId));
  };

  const handleMarkAllMessagesRead = () => {
    if (!save) return;
    const updated = markAllMessagesRead(save);
    handleUpdateSave(updated);
    showToast('All inbox messages marked as read.');
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
    const finalSave = checkAndTriggerCelebration(updatedSave, activeMatchFixture || undefined);
    saveCareerSave(finalSave);
    setSave(finalSave);
    setActiveMatchFixture(null);
    showToast('Match completed and results saved!');
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

  const handleFinishUclDraw = (drawnOpponents: any[]) => {
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

  if (!save) {
    return (
      <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-6">
          <span className="text-4xl">📁</span>
          <h1 className="text-xl font-display font-black text-white uppercase tracking-tight">
            No Save Found in {slotId.replace('_', ' ').toUpperCase()}
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            There is currently no career save loaded in this slot. You can start a new career or import a backup file.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/career"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
            >
              Save Slots
            </Link>
            <Link
              href={`/career/setup?slot=${slotId}`}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
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
      data-office-active={activeTab === 'overview' ? 'true' : 'false'}
      className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/25 flex items-center gap-2 motion-reduce:animate-none animate-bounce"
        >
          <span>✓</span> {toastMessage}
        </aside>
      )}

      {/* Main Hub Layout */}
      <main
        data-office-ui="true"
        className={`relative z-10 flex-1 w-full mx-auto flex flex-col gap-2.5 sm:gap-3 px-2 sm:px-4 py-2 sm:py-4 ${
          activeTab === 'overview'
            ? 'max-w-[440px] sm:max-w-[480px]'
            : 'max-w-4xl'
        }`}
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
              onClick={handleHeaderBack}
              data-office-ui="true"
              title="Exit Career / Save Slots"
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
              <h1 className="font-display font-extrabold text-[11.5px] sm:text-[14px] text-[var(--office-text-primary)] leading-tight truncate">
                {effectiveClubName}
              </h1>
              <p className="text-[9px] sm:text-[10.5px] font-medium text-[#2563eb] leading-tight truncate mt-0.5">
                Season {save.season.seasonNumber} &bull; {formatOfficeShortDate(save.season.currentDate)}
              </p>
            </div>
          </div>

          {/* Right: Board Confidence Pill + Inbox + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setShowBoardDossierModal(true)}
              title="View Boardroom Confidence Dossier"
              className="office-subcard rounded-full px-2 sm:px-2.5 py-1 flex items-center gap-1.5 cursor-pointer bg-[#e6fcf5] border border-[#a7f3d0] hover:border-[#10b981]/50"
            >
              <span
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                  boardConfidence >= 60
                    ? 'bg-[#10b981]'
                    : boardConfidence >= 45
                    ? 'bg-[#f59e0b]'
                    : 'bg-[#ef4444]'
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
                <div className="text-[9px] sm:text-[9.5px] font-display font-black text-[#0b1536] whitespace-nowrap">
                  Board {boardConfidence}%
                </div>
                <div
                  className={`text-[8px] sm:text-[8.5px] font-bold mt-0.5 whitespace-nowrap ${
                    boardConfidence >= 60
                      ? 'text-[#10b981]'
                      : boardConfidence >= 45
                      ? 'text-[#f59e0b]'
                      : 'text-[#ef4444]'
                  }`}
                >
                  {boardSentimentLabel}
                </div>
              </div>
            </button>

            {/* Inbox Envelope Icon Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => setShowOfficeInboxModal(true)}
              title="Open Managerial Inbox"
              aria-label="Open Managerial Inbox"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center relative cursor-pointer transition-transform active:scale-95 shrink-0 bg-white border border-[#e2e8f0] shadow-2xs hover:border-[#1d5eff]/40"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2563eb]" fill="currentColor" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z" />
              </svg>
              {headerBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#ef4444] text-white font-display font-black text-[9px] flex items-center justify-center shadow-xs border-2 border-white">
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 bg-white border border-[#e2e8f0] shadow-2xs hover:border-[#1d5eff]/40"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#475569]" fill="currentColor" aria-hidden="true">
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
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M12 3 3 10h2v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9h2L12 3z" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight leading-tight">Office</span>
            </button>

            {/* Squad */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('squad')}
              className={`${activeTab === 'squad' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight leading-tight">Squad</span>
            </button>

            {/* Fixtures */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('fixtures')}
              className={`${activeTab === 'fixtures' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight leading-tight">Fixtures</span>
            </button>

            {/* Transfers */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleTabChange('transfers')}
              className={`${activeTab === 'transfers' ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight leading-tight">Transfers</span>
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
              className={`${['table', 'cups', 'settings'].includes(activeTab) ? 'office-nav-tab-active' : 'office-nav-tab-inactive'} rounded-[15px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer relative`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <circle cx="6" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="18" cy="12" r="2" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight leading-tight">
                {activeTab === 'table' ? 'Table' : activeTab === 'cups' ? 'Cups' : activeTab === 'settings' ? 'Settings' : 'More'}
              </span>
            </button>
          </nav>

          {/* More Menu Popover */}
          {isMoreMenuOpen && (
            <div
              data-office-ui="true"
              className="office-floating-card absolute right-0 top-full mt-1.5 z-40 w-60 rounded-2xl p-2 shadow-2xl space-y-1"
              role="menu"
            >
              {[
                { id: 'table', label: 'League Table', icon: '📊', desc: 'Standings, GD & form guide' },
                { id: 'cups', label: 'Cups & Europe', icon: '🏆', desc: 'Domestic cups & continental silverware' },
                { id: 'settings', label: 'Career Settings', icon: '⚙️', desc: 'Rules, formats & club naming' },
              ].map((item) => (
                <button
                  key={item.id}
                  role="menuitem"
                  data-office-ui="true"
                  onClick={() => handleTabChange(item.id as typeof activeTab)}
                  className="office-subcard w-full p-2.5 rounded-xl text-left flex items-center gap-3 cursor-pointer"
                >
                  <span className="text-base">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-[var(--office-text-primary)]">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-[var(--office-text-muted)] truncate">{item.desc}</div>
                  </div>
                </button>
              ))}

              <div className="h-px bg-[var(--office-divider)] my-1" />

              <div className="pt-1">
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    handleExport();
                    setIsMoreMenuOpen(false);
                  }}
                  className="office-subcard w-full py-2 px-2.5 rounded-xl text-[11px] font-bold text-[var(--office-text-primary)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>💾 Backup Save</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
          <div className="space-y-2.5">

            {/* 3. TRANSFER DEADLINE DAY WAR ROOM SCREEN (WHEN DEADLINE ACTIVE) OR NEXT FIXTURE SPOTLIGHT */}
            {isDeadlineActive ? (
              <TransferDeadlineDayScreen
                save={save}
                onUpdateSave={handleUpdateSave}
                onAdvanceDeadlinePhase={handleAdvanceDeadlinePhase}
                onNavigateToTransfers={(subTab, targetId) => navigateToSection('transfers', subTab, targetId)}
                onNotification={showToast}
                nextScheduled={nextScheduled}
              />
            ) : nextScheduled ? (
              <section
                aria-label="Next Fixture"
                data-office-ui="true"
                className="office-floating-card office-reveal-3 rounded-[24px] overflow-hidden relative select-none"
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
                    <div>
                      {/* Stadium Illustration & Teams Showcase */}
                      <div className="relative pt-2.5 pb-1 px-3 sm:px-3.5">
                        <OfficeStadiumSceneSvg />

                        {/* Top Fixture Metadata Header */}
                        <div className="relative z-10 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#0284c7] shrink-0 drop-shadow-2xs" aria-hidden="true">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm-9.5-2.5L7 15l1.4-1.4 1.1 1.1 3.6-3.6L14.5 12.5l-5 5z" />
                            </svg>
                            <div className="min-w-0">
                              <div className="text-[12.5px] sm:text-[13px] font-display font-extrabold text-[#0284c7] leading-tight whitespace-nowrap">
                                Next Fixture
                              </div>
                              <div className="text-[10px] sm:text-[11px] font-semibold text-[#1e40af] leading-tight whitespace-nowrap">
                                {nextScheduled.cupId === CUP_IDS.PRESEASON
                                  ? `${save.preseasonState?.tournamentName || 'Pre-Season Tour'}`
                                  : nextScheduled.isCup
                                  ? `${nextScheduled.cupName} • ${nextScheduled.roundName}`
                                  : `Matchday ${(nextScheduled.fixture as LeagueFixture).round} of 38`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-display font-extrabold text-[12px] sm:text-[13px] text-[#0b1536] leading-tight whitespace-nowrap">
                              {formatOfficeFixtureDate(nextScheduled.fixture.date)}
                            </div>
                            <div className="text-[10px] sm:text-[11px] font-semibold text-[#1d4ed8] leading-tight flex items-center justify-end gap-1 mt-0.5 whitespace-nowrap">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-[#2563eb] shrink-0" aria-hidden="true">
                                <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                              </svg>
                              <span>{venueDisplay}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3D Fictional Jerseys & VS Showcase */}
                        <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center pt-1 pb-1 px-0.5">
                          {/* Home Club Kit */}
                          <div className="flex flex-col items-center text-center min-w-0 office-kit-enter-left">
                            <OfficeClubJerseySvg
                              club={home}
                              displayName={homeName}
                              uid="office-hero-home"
                            />
                            <h3 className="font-display font-extrabold text-[13px] sm:text-[14.5px] text-[#0b1536] tracking-tight whitespace-nowrap mt-0.5">
                              {homeName}
                            </h3>
                            <span className="mt-1 inline-block px-3 py-0.5 rounded-full bg-[#d1fae5] text-[#0d9488] text-[9px] font-extrabold uppercase tracking-wider">
                              {isNeutralWembley ? 'NEUTRAL' : 'HOME'}
                            </span>
                          </div>

                          {/* Center VS */}
                          <div className="flex flex-col items-center justify-center px-1 -mt-4">
                            <span className="font-display font-black text-[18px] sm:text-[20px] text-[#1d4ed8] tracking-wider drop-shadow-2xs">
                              VS
                            </span>
                          </div>

                          {/* Away Club Kit */}
                          <div className="flex flex-col items-center text-center min-w-0 office-kit-enter-right">
                            <OfficeClubJerseySvg
                              club={away}
                              displayName={awayName}
                              uid="office-hero-away"
                            />
                            <h3 className="font-display font-extrabold text-[13px] sm:text-[14.5px] text-[#0b1536] tracking-tight whitespace-nowrap mt-0.5">
                              {awayName}
                            </h3>
                            <span className="mt-1 inline-block px-3 py-0.5 rounded-full bg-[#e0e7ff] text-[#2563eb] text-[9px] font-extrabold uppercase tracking-wider">
                              {isNeutralWembley ? 'NEUTRAL' : 'AWAY'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Primary & Secondary Action Buttons */}
                      <div className="relative z-10 px-3 sm:px-3.5 pb-3 pt-1.5 space-y-2 bg-[var(--office-card-solid)]">
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
                              showToast('⏱️ Transfer Deadline Day has arrived! Complete negotiations before 23:00 BST.');
                              return;
                            }
                            if (save.season.currentDate < winterDeadline && fixDate >= winterDeadline) {
                              let deadlineSave = { ...save, season: { ...save.season, currentDate: winterDeadline } };
                              deadlineSave = initializeDeadlineDay(deadlineSave);
                              saveCareerSave(deadlineSave);
                              setSave(deadlineSave);
                              showToast('⏱️ Winter Transfer Deadline Day has arrived!');
                              return;
                            }
                            setActiveMatchFixture(nextScheduled.fixture);
                          }}
                          className="office-play-match-btn w-full py-3 px-5 rounded-full font-display font-black text-[15px] tracking-tight flex items-center justify-center gap-2 cursor-pointer min-h-[46px] shadow-lg"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>Prepare &amp; Play Match</span>
                          <span className="text-base leading-none font-bold ml-0.5">&rsaquo;</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            data-office-ui="true"
                            disabled={simulating}
                            onClick={handlePlayNextMatchInstant}
                            className="office-subcard py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 font-display font-bold text-[12px] text-[var(--office-text-primary)] cursor-pointer min-h-[38px] shadow-2xs hover:border-[#1d5eff]/40"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#1d5eff]" aria-hidden="true">
                              <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                            </svg>
                            <span>Instant Sim</span>
                          </button>

                          <button
                            type="button"
                            data-office-ui="true"
                            onClick={() => setMatchOverviewModal({ type: 'preview', fixture: nextScheduled.fixture })}
                            className="office-subcard py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 font-display font-bold text-[12px] text-[var(--office-text-primary)] cursor-pointer min-h-[38px] shadow-2xs hover:border-[#1d5eff]/40"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#1d5eff]" aria-hidden="true">
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
              /* End-of-Season Card when all 38 fixtures concluded */
              <section
                data-office-ui="true"
                className="office-floating-card office-reveal-3 rounded-[24px] p-4 space-y-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d5eff]">
                      Season {save.season.seasonNumber} Complete
                    </span>
                    <h3 className="text-base font-display font-black text-[var(--office-text-primary)]">
                      All Campaign Fixtures Concluded
                    </h3>
                  </div>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={handleAdvanceToNextSeasonAction}
                    disabled={simulating}
                    className="office-play-match-btn py-2.5 px-4 rounded-full font-display font-bold text-xs cursor-pointer"
                  >
                    Advance to Season {save.season.seasonNumber + 1} &rsaquo;
                  </button>
                </div>
              </section>
            )}

            {/* 4. 3-COLUMN STATUS & KPI ROW */}
            <section
              aria-label="Key Performance Indicators"
              data-office-ui="true"
              className="grid grid-cols-3 gap-2 select-none office-reveal-4"
            >
              {/* Card 1: Transfer Budget */}
              <div
                data-office-ui="true"
                onClick={() => {
                  navigateToSection('transfers', 'market');
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }}
                className="office-kpi-card office-kpi-mint rounded-[20px] p-2.5 cursor-pointer flex flex-col justify-between relative"
              >
                <div className="space-y-1">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#10b981]" aria-hidden="true">
                    <path d="M12 4C7.58 4 4 5.79 4 8s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zm0 10c-4.42 0-8-1.79-8-4v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4zm0 5c-4.42 0-8-1.79-8-4v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4z" />
                  </svg>
                  <div className="text-[10px] sm:text-[10.5px] font-semibold text-[#0f766e] leading-tight whitespace-nowrap">
                    Transfer Budget
                  </div>
                </div>

                <div className="mt-1">
                  <div className="font-display font-black text-[18px] sm:text-[20px] text-[var(--office-text-primary)] leading-tight tracking-tight whitespace-nowrap">
                    {formatOfficeBudget(save.finances.transferBudget, save.settings.currency)}
                  </div>
                  <div className="text-[8.5px] sm:text-[9.5px] font-semibold text-[#0d9488] whitespace-nowrap mt-0.5">
                    Wage room: {formatOfficeWageRoom(save.finances.weeklyWageBudget - save.finances.currentWeeklyWages, save.settings.currency)}
                  </div>
                </div>

                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1d5eff] font-bold text-base leading-none">
                  &rsaquo;
                </span>
              </div>

              {/* Card 2: League Position */}
              <div
                data-office-ui="true"
                onClick={() => handleTabChange('table')}
                className="office-kpi-card office-kpi-blue rounded-[20px] p-2.5 cursor-pointer flex flex-col justify-between relative"
              >
                <div className="space-y-1">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#1d5eff]" aria-hidden="true">
                    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                  </svg>
                  <div className="text-[10px] sm:text-[10.5px] font-semibold text-[#1d5eff] leading-tight whitespace-nowrap">
                    League Position
                  </div>
                </div>

                <div className="mt-0.5">
                  <div className="font-display font-black text-[18px] sm:text-[20px] text-[var(--office-text-primary)] leading-tight">
                    {formatOrdinalRank(userRank)}
                  </div>
                  {/* 5 Form Badges */}
                  <div className="flex items-center gap-0.5 my-1">
                    {(recentFormResults.length > 0 ? recentFormResults.slice(-5) : (['W', 'W', 'D', 'W', 'W'] as const)).map((res, idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-[4px] text-[8px] font-display font-black text-white flex items-center justify-center ${
                          res === 'W'
                            ? 'bg-[#10b981]'
                            : res === 'D'
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#ef4444]'
                        }`}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                  <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#2563eb] whitespace-nowrap">
                    {userStanding && userStanding.played > 0
                      ? `${userStanding.points} pts (${userStanding.won}W ${userStanding.lost}L)`
                      : `${userStanding?.points || 0} pts (0W 0L)`}
                  </div>
                </div>

                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1d5eff] font-bold text-base leading-none">
                  &rsaquo;
                </span>
              </div>

              {/* Card 3: Items for Review */}
              <div
                data-office-ui="true"
                onClick={() => {
                  if (contractReviewPlayers.length > 0) {
                    navigateToSection('transfers', 'contracts', `contract-player-${contractReviewPlayers[0].id}`);
                  } else {
                    setShowOfficeInboxModal(true);
                  }
                }}
                className="office-kpi-card office-kpi-lavender rounded-[20px] p-2.5 cursor-pointer flex flex-col justify-between relative"
              >
                <div className="space-y-1">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#1d5eff]" aria-hidden="true">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <div className="text-[10px] sm:text-[10.5px] font-semibold text-[#1d5eff] leading-tight whitespace-nowrap">
                    Items for Review
                  </div>
                </div>

                <div className="mt-1">
                  <div className="font-display font-black text-[18px] sm:text-[20px] text-[var(--office-text-primary)] leading-tight">
                    {officeReviewCount > 0 ? officeReviewCount : actionableAlerts.length > 0 ? actionableAlerts.length : 0}
                  </div>
                  <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#1d5eff] whitespace-nowrap mt-0.5">
                    {officeReviewCount > 0
                      ? officeReviewCount === 1
                        ? 'Contract to review'
                        : 'Contracts to review'
                      : 'All contracts secure'}
                  </div>
                </div>

                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1d5eff] font-bold text-base leading-none">
                  &rsaquo;
                </span>
              </div>
            </section>

            {/* 5. CONTRACTS TO REVIEW CARD */}
            <section
              id="managerial-alerts"
              aria-label="Contracts to Review"
              data-office-ui="true"
              className="office-floating-card office-reveal-5 rounded-[22px] p-2.5 sm:p-3 space-y-2 select-none"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {officeReviewCount > 0 ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#f59e0b] shrink-0" aria-hidden="true">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#10b981] shrink-0" aria-hidden="true">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  )}
                  <h2 className="font-display font-extrabold text-[12.5px] sm:text-[13px] text-[var(--office-text-primary)] truncate">
                    {officeReviewCount > 0
                      ? `${officeReviewCount} Contract${officeReviewCount > 1 ? 's' : ''} to Review`
                      : 'Squad Contracts Secure'}
                  </h2>
                </div>

                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => navigateToSection('transfers', 'contracts')}
                  className="text-[11px] sm:text-[11.5px] font-bold text-[#1d5eff] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>View All ({save.squad.length})</span>
                  <span>&rsaquo;</span>
                </button>
              </div>

              {officeReviewCount > 0 ? (
                <div className="space-y-1.5">
                  {contractReviewPlayers.slice(0, 2).map((player, idx) => (
                    <div
                      key={player.id}
                      data-office-ui="true"
                      onClick={() => navigateToSection('transfers', 'contracts', `contract-player-${player.id}`)}
                      className="office-subcard rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-[#fff7ed] text-[#f59e0b] border border-[#fed7aa]'
                              : 'bg-[#eff6ff] text-[#1d5eff] border border-[#bfdbfe]'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="font-display font-bold text-[12px] sm:text-[12.5px] text-[var(--office-text-primary)] leading-tight truncate">
                            {player.name}
                          </div>
                          <div className="text-[10px] sm:text-[10.5px] font-medium text-[#3b5998] leading-tight truncate mt-0.5">
                            Contract expires in {Math.max(1, player.contractYears || 1)} {Math.max(1, player.contractYears || 1) === 1 ? 'year' : 'years'}
                          </div>
                        </div>
                      </div>

                      <span className="text-[#1d5eff] font-bold text-base leading-none pr-1">
                        &rsaquo;
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  data-office-ui="true"
                  onClick={() => navigateToSection('transfers', 'contracts')}
                  className="office-subcard rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-display font-bold text-[11.5px] sm:text-[12px] text-[var(--office-text-primary)] leading-tight truncate">
                        All Squad Contracts Secured
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] font-medium text-[var(--office-text-muted)] leading-tight truncate mt-0.5">
                        No final-year contracts. Routine reviews accessible in Contract Hub.
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1d5eff] font-bold text-base leading-none pr-1">
                    &rsaquo;
                  </span>
                </div>
              )}
            </section>

            {/* 6. QUICK ACTIONS CARD (2x2 GRID) */}
            <section
              aria-label="Quick Actions"
              data-office-ui="true"
              className="office-floating-card office-reveal-6 rounded-[22px] p-2.5 sm:p-3 space-y-2 select-none"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h2 className="font-display font-extrabold text-[13.5px] sm:text-[14px] text-[var(--office-text-primary)]">
                  Quick Actions
                </h2>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => setShowOfficeSeasonDrawer((prev) => !prev)}
                  className="text-[11px] sm:text-[11.5px] font-semibold text-[#4f679d] hover:underline cursor-pointer"
                >
                  Manage your season
                </button>
              </div>

              {/* Optional Collapsible Fast-Forward / Calendar Strip */}
              {showOfficeSeasonDrawer && (
                <div className="office-subcard rounded-2xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10.5px] font-bold text-[var(--office-text-secondary)]">
                    <span>Fast Forward Calendar</span>
                    {injuredCount > 0 && (
                      <span className="text-[#ef4444]">🏥 {injuredCount} Injured</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleContinueCalendar}
                      disabled={simulating}
                      className="office-subcard py-1.5 px-2 rounded-xl font-display font-bold text-[10.5px] text-[#1d5eff] cursor-pointer"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_match')}
                      disabled={simulating || !nextScheduled}
                      className="office-subcard py-1.5 px-2 rounded-xl font-display font-bold text-[10.5px] text-[var(--office-text-primary)] cursor-pointer"
                    >
                      Next Match
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_week')}
                      disabled={simulating}
                      className="office-subcard py-1.5 px-2 rounded-xl font-display font-bold text-[10.5px] text-[var(--office-text-primary)] cursor-pointer"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => setPendingFastForward('next_month')}
                      disabled={simulating}
                      className="office-subcard py-1.5 px-2 rounded-xl font-display font-bold text-[10.5px] text-[var(--office-text-primary)] cursor-pointer"
                    >
                      1 Month
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {/* Tactics */}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    handleTabChange('squad');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                  className="office-subcard rounded-2xl p-2 flex items-center justify-between gap-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#0d9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                        <circle cx="18" cy="6" r="2" fill="currentColor" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                        <circle cx="6" cy="18" r="2" fill="currentColor" />
                        <circle cx="18" cy="18" r="2" fill="currentColor" />
                        <path d="M7.5 7.5 10.5 10.5M16.5 7.5 13.5 10.5M10.5 13.5 7.5 16.5M13.5 13.5 16.5 16.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display font-bold text-[11px] sm:text-[12px] text-[var(--office-text-primary)] leading-tight truncate">
                        Tactics
                      </div>
                      <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#4f679d] leading-tight tracking-tight truncate mt-0.5">
                        Set up for the next match
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1d5eff] font-bold text-sm leading-none shrink-0 pr-0.5">&rsaquo;</span>
                </button>

                {/* Calendar */}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    handleTabChange('fixtures');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                  className="office-subcard rounded-2xl p-2 flex items-center justify-between gap-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" aria-hidden="true">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-12-8h5v5H7v-5z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display font-bold text-[11px] sm:text-[12px] text-[var(--office-text-primary)] leading-tight truncate">
                        Calendar
                      </div>
                      <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#4f679d] leading-tight tracking-tight truncate mt-0.5">
                        View upcoming fixtures
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1d5eff] font-bold text-sm leading-none shrink-0 pr-0.5">&rsaquo;</span>
                </button>

                {/* Training */}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    handleTabChange('squad');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }}
                  className="office-subcard rounded-2xl p-2 flex items-center justify-between gap-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" aria-hidden="true">
                        <path d="M20.57 14.86 22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display font-bold text-[11px] sm:text-[12px] text-[var(--office-text-primary)] leading-tight truncate">
                        Training
                      </div>
                      <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#4f679d] leading-tight tracking-tight truncate mt-0.5">
                        Improve your squad
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1d5eff] font-bold text-sm leading-none shrink-0 pr-0.5">&rsaquo;</span>
                </button>

                {/* Boardroom */}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => navigateToSection('transfers', 'board', 'board-room-section')}
                  className="office-subcard rounded-2xl p-2 flex items-center justify-between gap-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" aria-hidden="true">
                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display font-bold text-[11px] sm:text-[12px] text-[var(--office-text-primary)] leading-tight truncate">
                        Boardroom
                      </div>
                      <div className="text-[8.5px] sm:text-[9.5px] font-medium text-[#4f679d] leading-tight tracking-tight truncate mt-0.5">
                        Club goals &amp; feedback
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1d5eff] font-bold text-sm leading-none shrink-0 pr-0.5">&rsaquo;</span>
                </button>
              </div>
            </section>

            {/* 7. LAST RESULT BOTTOM BAR */}
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
                  onClick={() =>
                    setMatchOverviewModal({
                      type: prevScheduled ? 'result' : 'preview',
                      fixture: fix,
                    })
                  }
                  className="office-floating-card office-reveal-7 rounded-2xl px-1.5 sm:px-2.5 py-1.5 sm:py-2 flex items-center justify-between gap-1 text-[8.5px] sm:text-[9.5px] cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <span className="font-display font-extrabold text-[#1d5eff] text-[8.5px] sm:text-[9.5px]">
                      {prevScheduled ? 'Last Result' : 'Preview'}
                    </span>
                    <span className="text-[var(--office-text-muted)] font-medium text-[8px] sm:text-[8.5px]">
                      ({roundLabel})
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 px-0.5">
                    <OfficeClubJerseySvg
                      club={homeClub}
                      displayName={homeName}
                      size="sm"
                      uid="office-last-home"
                      className="!w-3.5 !h-3.5 sm:!w-4 sm:!h-4"
                    />
                    <span className="font-display font-bold text-[var(--office-text-primary)] whitespace-nowrap text-[8.5px] sm:text-[9.5px] tracking-tight">
                      {homeName}
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md bg-[#f1f5f9] text-[#0b1536] font-display font-black text-[8px] sm:text-[9px] shrink-0 whitespace-nowrap border border-slate-200/60 shadow-2xs mx-0.5">
                      {scoreLabel}
                    </span>

                    <OfficeClubJerseySvg
                      club={awayClub}
                      displayName={awayName}
                      size="sm"
                      uid="office-last-away"
                      className="!w-3.5 !h-3.5 sm:!w-4 sm:!h-4"
                    />
                    <span className="font-medium text-[var(--office-text-secondary)] whitespace-nowrap text-[8.5px] sm:text-[9.5px] tracking-tight">
                      {awayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pl-1 sm:pl-1.5 border-l border-[var(--office-divider)] whitespace-nowrap">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current text-[#1d5eff] shrink-0" aria-hidden="true">
                      <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
                    </svg>
                    <span className="font-display font-bold text-[#1d5eff] text-[8.5px] sm:text-[9.5px]">
                      View Stats &rsaquo;
                    </span>
                  </div>
                </section>
              );
            })()}

            {/* MANAGERIAL INBOX SLIDE-UP MODAL / SHEET (Opened via Envelope or View All) */}
            {showOfficeInboxModal && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Managerial Inbox"
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => setShowOfficeInboxModal(false)}
              >
                <section
                  id="managerial-inbox"
                  data-office-ui="true"
                  onClick={(e) => e.stopPropagation()}
                  className="office-floating-card rounded-3xl p-4 sm:p-5 w-full max-w-lg max-h-[82vh] flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📬</span>
                      <h3 className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                        Managerial Inbox ({allInbox.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadInboxCount > 0 && (
                        <button
                          type="button"
                          data-office-ui="true"
                          onClick={handleMarkAllMessagesRead}
                          className="text-[11px] font-bold text-[#1d5eff] cursor-pointer"
                        >
                          ✓ Mark All Read
                        </button>
                      )}
                      <button
                        type="button"
                        data-office-ui="true"
                        onClick={() => setShowOfficeInboxModal(false)}
                        className="office-subcard w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--office-text-primary)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <nav aria-label="Inbox Filters" data-no-swipe="true" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: 'all', label: 'All', count: allInbox.length },
                      { id: 'action_required', label: 'Action', count: actionableAlerts.length },
                      { id: 'unread', label: 'Unread', count: unreadInboxCount },
                      { id: 'board', label: 'Board', count: allInbox.filter((m) => m.type === 'board').length },
                      { id: 'transfer', label: 'Transfers', count: allInbox.filter((m) => m.type === 'transfer').length },
                    ].map((filter) => {
                      const active = inboxFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          data-office-ui="true"
                          onClick={() => setInboxFilter(filter.id as typeof inboxFilter)}
                          className={`py-1 px-2.5 rounded-xl text-[11px] font-display font-bold whitespace-nowrap cursor-pointer ${
                            active
                              ? 'office-nav-tab-active'
                              : 'office-subcard text-[var(--office-text-secondary)]'
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      );
                    })}
                  </nav>

                  {/* Messages Feed */}
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                    {allInbox
                      .filter((m) => {
                        if (inboxFilter === 'all') return true;
                        if (inboxFilter === 'action_required') {
                          const cl = classifyInboxMessage(m, save);
                          return cl.classification === 'action_required' && !cl.isResolved;
                        }
                        if (inboxFilter === 'unread') return !m.isRead;
                        return m.type === inboxFilter;
                      })
                      .map((msg) => {
                        const isExpanded = expandedMessageId === msg.id;
                        const { classification, isResolved, effectiveActionLabel, effectiveActionTab, effectiveActionType, targetId } =
                          classifyInboxMessage(msg, save);

                        return (
                          <article
                            key={msg.id}
                            data-office-ui="true"
                            onClick={() => handleToggleMessageRead(msg.id)}
                            className="office-subcard rounded-2xl p-3 space-y-1.5 cursor-pointer text-left"
                          >
                            <div className="flex items-center justify-between gap-2 text-[10.5px]">
                              <span className="font-display font-bold text-[var(--office-text-primary)]">
                                {msg.sender}
                              </span>
                              <span className="font-mono text-[var(--office-text-muted)]">
                                {formatOfficeShortDate(msg.date)}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-[var(--office-text-primary)]">
                              {msg.subject}
                            </div>
                            {isExpanded ? (
                              <div className="pt-1.5 border-t border-[var(--office-divider)] space-y-2">
                                <p className="text-[11px] text-[var(--office-text-secondary)] whitespace-pre-line leading-relaxed">
                                  {msg.body}
                                </p>
                                {effectiveActionLabel && !isResolved && (
                                  <button
                                    type="button"
                                    data-office-ui="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOfficeInboxModal(false);
                                      handleExecuteAlertAction({
                                        actionTab: effectiveActionTab,
                                        actionType: effectiveActionType,
                                        targetId: targetId || msg.targetId,
                                      });
                                    }}
                                    className="office-play-match-btn py-1.5 px-3 rounded-xl font-display font-bold text-[11px] cursor-pointer"
                                  >
                                    {effectiveActionLabel} &rarr;
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[var(--office-text-muted)] truncate">
                                {msg.body.replace(/\n+/g, ' ')}
                              </p>
                            )}
                          </article>
                        );
                      })}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SQUAD */}
        {activeTab === 'squad' && (
          <SquadManagement
            save={save}
            onUpdateSave={handleUpdateSave}
            onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
            onNotification={showToast}
          />
        )}

        {/* TAB 3: FIXTURES */}
        {activeTab === 'fixtures' && (
          <FixturesCalendar
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
            onNavigateOffice={() => handleTabChange('overview')}
          />
        )}

        {/* TAB 4: TABLE */}
        {activeTab === 'table' && (
          <LeagueTable
            standings={save.standings || []}
            userClubId={save.club.id}
            userClub={save.club}
            fixtures={save.fixtures || []}
            userSquad={save.squad}
          />
        )}

        {/* TAB 5: CUPS & EUROPE */}
        {activeTab === 'cups' && (
          <TournamentsHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
          />
        )}

        {/* TAB 6: TRANSFERS */}
        {activeTab === 'transfers' && (
          <TransferHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
            initialSubTab={transferHubSubTab}
            focusedOfferId={focusedOfferId}
            onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
          />
        )}

        {/* TAB 6: SETTINGS & EDITING */}
        {activeTab === 'settings' && editableSettings && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <header className="space-y-1">
              <h3 className="text-xl font-display font-black uppercase text-white">
                Career Save Settings
              </h3>
              <p className="text-xs text-slate-400">
                {save.settings.locked
                  ? 'This career has locked rules to protect save integrity and prevent mid-game changes.'
                  : 'You can adjust mid-save settings and rename your club below.'}
              </p>
            </header>

            {/* Club Name Renaming */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Club Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={editingClubName}
                  onChange={(e) => setEditingClubName(e.target.value)}
                  placeholder={save.club.defaultName}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  onClick={() => setEditingClubName(save.club.defaultName)}
                  className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                  title="Reset to default club name"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Default: {save.club.defaultName}. Renaming is permitted on all difficulties.
              </p>
            </div>

            {/* Regional & Display Preferences (Always Editable) */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>🌐</span> Regional & Display Preferences
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Football Manager-style units and formatting. Configurable mid-save on all difficulties.
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Always Editable
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Date Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Date Format
                  </label>
                  <select
                    value={editableSettings.dateFormat || 'uk'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        dateFormat: e.target.value as DateFormatPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="uk">UK (14/08/2026 - DD/MM/YYYY)</option>
                    <option value="iso">ISO (2026-08-14 - YYYY-MM-DD)</option>
                    <option value="us">US (08/14/2026 - MM/DD/YYYY)</option>
                  </select>
                </div>

                {/* Currency */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Currency Unit
                  </label>
                  <select
                    value={editableSettings.currency || 'GBP'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        currency: e.target.value as CurrencyPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                  </select>
                </div>

                {/* Wage Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Wage Rate Frequency
                  </label>
                  <select
                    value={editableSettings.wageUnit || 'weekly'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        wageUnit: e.target.value as WageUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="weekly">Weekly (£/wk - FM Standard)</option>
                    <option value="monthly">Monthly (£/mo)</option>
                    <option value="annual">Annual (£/yr)</option>
                  </select>
                </div>

                {/* Height Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Height Unit
                  </label>
                  <select
                    value={editableSettings.heightUnit || 'ft_in'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        heightUnit: e.target.value as HeightUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ft_in">Feet &amp; Inches (5&apos; 11&quot;)</option>
                    <option value="cm">Centimetres (180 cm)</option>
                    <option value="m">Metres (1.80 m)</option>
                  </select>
                </div>

                {/* Weight Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Weight Unit
                  </label>
                  <select
                    value={editableSettings.weightUnit || 'kg'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        weightUnit: e.target.value as WeightUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="kg">Kilograms (75 kg)</option>
                    <option value="st_lbs">Stone &amp; Pounds (11st 11lbs)</option>
                    <option value="lbs">Pounds (165 lbs)</option>
                  </select>
                </div>

                {/* Number Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Number Formatting
                  </label>
                  <select
                    value={editableSettings.numberFormat || 'comma'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        numberFormat: e.target.value as NumberFormatPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="comma">Standard Comma (1,000,000)</option>
                    <option value="dot">Continental Dot (1.000.000)</option>
                    <option value="space">Space Separator (1 000 000)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gameplay Rules Status */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300">
                  Gameplay Rules
                </h4>
                {save.settings.locked && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <span>🔒</span> Locked Save
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Board Sackings */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Board Can Sack You</div>
                    <div className="text-[10px] text-slate-500">Dismissed on poor form</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.boardCanSack}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, boardCanSack: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Match Retry */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Allow Match Retry</div>
                    <div className="text-[10px] text-slate-500">Replay a simulated match</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.retryMatch}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, retryMatch: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Homegrown Rule */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Homegrown Rule</div>
                    <div className="text-[10px] text-slate-500">8+ domestic players required</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.homegrownRule}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, homegrownRule: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Financial Penalties */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Financial Penalties</div>
                    <div className="text-[10px] text-slate-500">Point deductions on debt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.financialPenalties}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        financialPenalties: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Matchday Play/Sim Interactive Modal */}
      {activeMatchFixture && (
        <MatchDayModal
          fixture={activeMatchFixture}
          save={save}
          onClose={() => setActiveMatchFixture(null)}
          onSaveMatchResult={handleMatchResultSaved}
        />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl text-left relative">
            <header className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-full inline-block font-display">
                  Official Calendar Announcement
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  8 July {save.season.yearStart}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>📅</span> Premier League Fixture Release Day!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The Premier League computer has officially finalized all 38 fixtures for the {save.season.yearStart}/{(save.season.yearStart + 1).toString().slice(-2)} season. Opening day, rival derbies, festive fixtures, and the final day are ready.
              </p>
            </header>

            <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Campaign Length:</span>
                <span className="font-mono text-white font-bold">38 Matchday Rounds</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Match Allocation:</span>
                <span className="font-mono text-blue-400 font-bold">19 Home • 19 Away</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  setShowFixtureReleaseModal(true);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎉 Launch Live Reveal Ceremony</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFixtureReleasePromptModal(false);
                  handleFinishFixtureRelease();
                }}
                className="py-3 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 text-slate-300 hover:text-white font-display font-bold text-xs uppercase transition-all cursor-pointer text-center"
              >
                ⏩ Skip &amp; Unlock Calendar
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
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
        >
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider font-display">
                  Official Season {save.season.seasonNumber} Review &amp; Board Summary
                </span>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {seasonSummary.leagueTitle ? '👑 League Champions!' : `Finished Position #${seasonSummary.finalPosition}`}
                </h3>
              </div>
              <button
                onClick={() => setShowSeasonReviewModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Campaign Accolades Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">League Finish</span>
                <div className="font-display font-black text-base text-white">
                  {seasonSummary.leagueTitle ? '🥇 1st Place' : `#${seasonSummary.finalPosition}`}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Silverware</span>
                <div className="font-display font-black text-base text-amber-400">
                  {seasonSummary.trophiesWon.length > 0 ? `${seasonSummary.trophiesWon.length} Trophies` : 'None'}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Prize Money</span>
                <div className="font-display font-black text-base text-blue-400">
                  +{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Europe</span>
                <div className="font-display font-bold text-xs text-blue-300 truncate" title={seasonSummary.europeanQualification}>
                  {seasonSummary.europeanQualification}
                </div>
              </div>
            </div>

            {/* Financial War Chest Increase Breakdown */}
            <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-display font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💰</span> End of Season Budget Increase
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The board of directors has credited your competition merit prize money to your war chest. Here is your updated financial war chest for Season {save.season.seasonNumber + 1}:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-slate-950/70 border border-slate-850 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-slate-500 block">Current Budget</span>
                  <span className="text-xs font-bold text-slate-300">{formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}</span>
                </div>
                <div className="bg-blue-950/50 border border-blue-500/40 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-blue-400 block">+ Prize Money</span>
                  <span className="text-xs font-bold text-emerald-300">+{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}</span>
                </div>
                <div className="bg-slate-950/70 border border-blue-500/50 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-blue-400 block">New Season Budget</span>
                  <span className="text-xs font-bold text-blue-400">{formatCareerCurrency(save.finances.transferBudget + seasonSummary.prizeMoney, save.settings.currency)}</span>
                </div>
              </div>
            </div>

            {/* Squad Progression & Veteran Aging Logs */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <span>🌱</span> Squad Development &amp; Wonderkid Growth
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Players age by 1 year. Under-23 wonderkids experience rapid attribute development, while veterans gradually decline. Summer fitness resets to 100%.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-slate-300 divide-y divide-slate-850/60 pt-1">
                {seasonSummary.progressionReport.logs.slice(0, 8).map((log, idx) => (
                  <div key={idx} className="py-1">
                    {log}
                  </div>
                ))}
                {seasonSummary.progressionReport.logs.length > 8 && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    + {seasonSummary.progressionReport.logs.length - 8} more player development logs
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSeasonReviewModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSeasonReviewModal(false);
                  handleAdvanceToNextSeasonAction();
                }}
                disabled={simulating}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 Kick Off Season {save.season.seasonNumber + 1} (Collect Prize Money)</span>
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
          <div className="bg-slate-950 border border-blue-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl text-left relative">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider font-display">
                  Calendar Fast Forward Confirmation
                </span>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                  {getFastForwardDetails(pendingFastForward).title}
                </h3>
              </div>
              <button
                onClick={() => setPendingFastForward(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg text-sm"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 uppercase font-bold">Target Stop Date</span>
                <span className="font-mono font-bold text-blue-400">
                  {getFastForwardDetails(pendingFastForward).targetDate}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                {getFastForwardDetails(pendingFastForward).description}
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
              <input
                type="checkbox"
                checked={fastForwardUsePreferredEleven}
                onChange={(e) => setFastForwardUsePreferredEleven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-200">Use preferred starting 11</span>
                <span className="text-[10px] text-slate-400">Deploy your chosen starting eleven lineup for all fixtures simulated while away</span>
              </div>
            </label>

            {/* Transfer Window Milestone Halting Option */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-left">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛑</span>
                <span>Transfer Milestone Halting</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Choose when calendar fast-forward should automatically pause for transfer opportunities:
              </p>
              <div className="space-y-1.5 pt-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="ffTransferHalt"
                    value="deadline"
                    checked={fastForwardHaltOnTransferMilestone === 'deadline'}
                    onChange={() => setFastForwardHaltOnTransferMilestone('deadline')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Halt on Transfer Deadline Day (23:00 BST)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="ffTransferHalt"
                    value="window_open_or_close"
                    checked={fastForwardHaltOnTransferMilestone === 'window_open_or_close'}
                    onChange={() => setFastForwardHaltOnTransferMilestone('window_open_or_close')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Halt at Window Opening and Deadline Day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="ffTransferHalt"
                    value="none"
                    checked={fastForwardHaltOnTransferMilestone === 'none'}
                    onChange={() => setFastForwardHaltOnTransferMilestone('none')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Simulate continuously (do not halt)</span>
                </label>
              </div>
            </div>

            <aside aria-label="Caution note" className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Simulated matches are permanent unless &quot;Allow Match Retry&quot; is active in your career settings.
              </span>
            </aside>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPendingFastForward(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
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
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
              >
                Confirm &amp; Fast Forward
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
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl text-center relative">
            <span className="text-5xl block">⚠️</span>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                Board of Directors Executive Notice
              </span>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                Contract Terminated
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                The Board of Directors of {effectiveClubName} has officially relieved you of your duties as first-team manager following an unacceptable run of league results and failure to meet seasonal expectations.
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Board Confidence</div>
              <div className="text-xl font-display font-black text-rose-400">0% (Dismissed)</div>
              <div className="text-[10px] text-slate-400 font-medium">Club Objective Failed</div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/career"
                className="w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-all"
              >
                Accept Dismissal & Resign
              </Link>
              <button
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
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
          isOpen={comparisonState.isOpen}
          onClose={() => setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined })}
          playerA={comparisonState.playerA}
          playerB={comparisonState.playerB}
          squad={save.squad || []}
          marketPlayers={fullMarketPool}
          shortlistedPlayers={shortlistedPool}
          finances={save.finances}
          seniorCount={seniorCount}
          registeredPlayerIds={save.registeredPlayerIds}
          seasonYearStart={save.season?.yearStart}
          settings={save.settings}
          onSwapSquadPlayers={(starterId: string, benchId: string) => {
            handleSwapLineup(starterId, benchId);
          }}
          onSelectTransferTarget={(targetPlayer: MarketPlayer) => {
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
          onClick={() => setShowExitConfirmModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-2xl flex items-center justify-center mx-auto">
              🚪
            </div>
            <div>
              <h3 className="font-display font-black text-white text-base uppercase tracking-tight">
                Exit Career Mode?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your season progress is automatically saved. Do you want to return to the career save slots screen?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Keep Playing
              </button>
              <Link
                href="/career"
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors shadow-lg shadow-rose-900/30"
              >
                Exit to Saves
              </Link>
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="font-display font-black text-sm uppercase tracking-wide text-white">
                    Boardroom Confidence Dossier
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Comprehensive 1% granular club management evaluation
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBoardDossierModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Overall Score Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              boardConfidence >= 65
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : boardConfidence >= 45
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-rose-950/40 border-rose-500/40'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Standing</span>
                <div className="font-display font-black text-lg text-white uppercase flex items-center gap-2">
                  <span>
                    {boardConfidence >= 75
                      ? 'Delighted'
                      : boardConfidence >= 60
                      ? 'Content'
                      : boardConfidence >= 45
                      ? 'Under Scrutiny'
                      : 'Precarious'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                    {boardConfidence}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Season Objective</span>
                <span className="text-xs font-display font-black text-blue-400">
                  {boardStatus.expectation || (save.club.tier === 'elite' ? 'Win Title' : save.club.tier === 'upper' ? 'European Qualification' : 'Avoid Relegation')}
                </span>
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <div className="space-y-2">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
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
                  <div key={idx} className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-200">{pillar.title}</span>
                      <span className={`font-mono ${pillar.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pillar.score}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pillar.score >= 65 ? 'bg-emerald-500' : pillar.score >= 45 ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowBoardDossierModal(false);
                  setTransferHubSubTab('board');
                  handleTabChange('transfers');
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-display font-bold uppercase tracking-wider text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>🏛️ Full Boardroom &amp; Petitions</span>
                <span>➔</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBoardDossierModal(false)}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 cursor-pointer"
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
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Manager Office...
        </div>
      }
    >
      <CareerPlayHubContent />
    </Suspense>
  );
}
