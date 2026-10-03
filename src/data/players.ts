import { Player, Position, Rarity } from '../types/game';

// Interface for player base template
interface PlayerBase {
  name: string;
  lastName: string;
  nationality: string;
  primaryPosition: Position;
  secondaryPositions: Position[];
  era: '90s' | '00s' | '10s' | 'Modern';
  club: string; // Default/main club
  baseRating: number;
  startYear: number;
  baseTrait: string;
  playStyle: string;
  rivals: string[];
  isLegendaryPlayer?: boolean;
  endYear?: number; // Last season start year; no cards are generated after this
}

// 116 Iconic Premier League Base Players (1992 - 2026)
const playerBases: PlayerBase[] = [
  // --- GOALKEEPERS ---
  {
    name: 'Peter Schmeichel', lastName: 'Schmeichel', nationality: 'Denmark',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'Manchester United',
    baseRating: 92, startYear: 1992, baseTrait: 'Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'David Seaman', lastName: 'Seaman', nationality: 'England',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'Arsenal',
    baseRating: 88, startYear: 1992, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Petr Cech', lastName: 'Cech', nationality: 'Czech Republic',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 93, startYear: 2004, baseTrait: 'Shot Stopper', playStyle: 'Defensive Shield',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Edwin van der Sar', lastName: 'Van der Sar', nationality: 'Netherlands',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 90, startYear: 2005, baseTrait: 'Sweeper Keeper', playStyle: 'Tempo Controller',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Shay Given', lastName: 'Given', nationality: 'Ireland',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Newcastle',
    baseRating: 85, startYear: 1997, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Sunderland', 'Middlesbrough'],
  },
  {
    name: 'David de Gea', lastName: 'De Gea', nationality: 'Spain',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Manchester United',
    baseRating: 89, startYear: 2011, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Hugo Lloris', lastName: 'Lloris', nationality: 'France',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Tottenham',
    baseRating: 87, startYear: 2012, baseTrait: 'Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Thibaut Courtois', lastName: 'Courtois', nationality: 'Belgium',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Chelsea',
    baseRating: 89, startYear: 2014, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Alisson Becker', lastName: 'Alisson', nationality: 'Brazil',
    primaryPosition: 'GK', secondaryPositions: [], era: 'Modern', club: 'Liverpool',
    baseRating: 91, startYear: 2018, baseTrait: 'Sweeper Keeper', playStyle: 'Creator Supreme',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Ederson Moraes', lastName: 'Ederson', nationality: 'Brazil',
    primaryPosition: 'GK', secondaryPositions: [], era: 'Modern', club: 'Manchester City',
    baseRating: 89, startYear: 2017, baseTrait: 'Sweeper Keeper', playStyle: 'Tempo Controller',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Jordan Pickford', lastName: 'Pickford', nationality: 'England',
    primaryPosition: 'GK', secondaryPositions: [], era: 'Modern', club: 'Everton',
    baseRating: 82, startYear: 2017, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Liverpool', 'Newcastle'],
  },
  {
    name: 'Emiliano Martinez', lastName: 'E. Martinez', nationality: 'Argentina',
    primaryPosition: 'GK', secondaryPositions: [], era: 'Modern', club: 'Aston Villa',
    baseRating: 86, startYear: 2020, baseTrait: 'Clutch Finisher', playStyle: 'Sweeper Keeper', // trait overridden to Shot Stopper in generator
    rivals: ['Birmingham City', 'Wolverhampton'],
  },

  // --- CENTRE BACKS ---
  {
    name: 'Tony Adams', lastName: 'Adams', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Arsenal',
    baseRating: 90, startYear: 1992, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Sol Campbell', lastName: 'Campbell', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Arsenal',
    baseRating: 91, startYear: 1996, baseTrait: 'Lockdown Fullback', playStyle: 'Lockdown Defender', // Trait overridden in generator
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Rio Ferdinand', lastName: 'Ferdinand', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 92, startYear: 2000, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['Liverpool', 'Leeds United'],
  },
  {
    name: 'John Terry', lastName: 'Terry', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 93, startYear: 2000, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Nemanja Vidic', lastName: 'Vidic', nationality: 'Serbia',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 92, startYear: 2006, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Vincent Kompany', lastName: 'Kompany', nationality: 'Belgium',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Manchester City',
    baseRating: 90, startYear: 2008, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Virgil van Dijk', lastName: 'Van Dijk', nationality: 'Netherlands',
    primaryPosition: 'CB', secondaryPositions: [], era: 'Modern', club: 'Liverpool',
    baseRating: 94, startYear: 2015, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Steve Bruce', lastName: 'Bruce', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Manchester United',
    baseRating: 84, startYear: 1992, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Gary Pallister', lastName: 'Pallister', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Manchester United',
    baseRating: 85, startYear: 1992, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Jamie Carragher', lastName: 'Carragher', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: ['RB', 'LB'], era: '00s', club: 'Liverpool',
    baseRating: 86, startYear: 1998, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Ledley King', lastName: 'King', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: '00s', club: 'Tottenham',
    baseRating: 88, startYear: 1999, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Ricardo Carvalho', lastName: 'Carvalho', nationality: 'Portugal',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 89, startYear: 2004, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Sami Hyypia', lastName: 'Hyypia', nationality: 'Finland',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Liverpool',
    baseRating: 86, startYear: 1999, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Kolo Toure', lastName: 'K. Toure', nationality: 'Ivory Coast',
    primaryPosition: 'CB', secondaryPositions: ['RB'], era: '00s', club: 'Arsenal',
    baseRating: 88, startYear: 2002, baseTrait: 'Lockdown Fullback', playStyle: 'Lockdown Defender',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Jaap Stam', lastName: 'Stam', nationality: 'Netherlands',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Manchester United',
    baseRating: 91, startYear: 1998, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Leeds United'],
  },
  {
    name: 'William Saliba', lastName: 'Saliba', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: [], era: 'Modern', club: 'Arsenal',
    baseRating: 89, startYear: 2022, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Ruben Dias', lastName: 'Dias', nationality: 'Portugal',
    primaryPosition: 'CB', secondaryPositions: [], era: 'Modern', club: 'Manchester City',
    baseRating: 90, startYear: 2020, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Thiago Silva', lastName: 'T. Silva', nationality: 'Brazil',
    primaryPosition: 'CB', secondaryPositions: [], era: 'Modern', club: 'Chelsea',
    baseRating: 88, startYear: 2020, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['Arsenal', 'Tottenham'],
  },

  // --- FULLBACKS (LB/RB) ---
  {
    name: 'Ashley Cole', lastName: 'A. Cole', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 91, startYear: 2000, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Tottenham', 'Arsenal'],
  },
  {
    name: 'Gary Neville', lastName: 'G. Neville', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 86, startYear: 1994, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Patrice Evra', lastName: 'Evra', nationality: 'France',
    primaryPosition: 'LB', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 89, startYear: 2006, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Denis Irwin', lastName: 'Irwin', nationality: 'Ireland',
    primaryPosition: 'LB', secondaryPositions: ['RB'], era: '90s', club: 'Manchester United',
    baseRating: 88, startYear: 1992, baseTrait: 'Lockdown Fullback', playStyle: 'Set Piece Master',
    rivals: ['Liverpool', 'Leeds United'],
  },
  {
    name: 'Leighton Baines', lastName: 'Baines', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: [], era: '10s', club: 'Everton',
    baseRating: 85, startYear: 2007, baseTrait: 'Lockdown Fullback', playStyle: 'Set Piece Master',
    rivals: ['Liverpool', 'Manchester United'],
  },
  {
    name: 'Branislav Ivanovic', lastName: 'Ivanovic', nationality: 'Serbia',
    primaryPosition: 'RB', secondaryPositions: ['CB'], era: '10s', club: 'Chelsea',
    baseRating: 87, startYear: 2008, baseTrait: 'Lockdown Fullback', playStyle: 'Lockdown Defender',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Kyle Walker', lastName: 'Walker', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: ['CB'], era: 'Modern', club: 'Manchester City',
    baseRating: 88, startYear: 2011, baseTrait: 'Lockdown Fullback', playStyle: 'Speedster Fullback',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Andy Robertson', lastName: 'Robertson', nationality: 'Scotland',
    primaryPosition: 'LB', secondaryPositions: [], era: 'Modern', club: 'Liverpool',
    baseRating: 87, startYear: 2017, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Trent Alexander-Arnold', lastName: 'Trent', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: ['CM', 'CDM'], era: 'Modern', club: 'Liverpool',
    baseRating: 89, startYear: 2017, baseTrait: 'Creator Supreme', playStyle: 'Set Piece Master',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Joao Cancelo', lastName: 'Cancelo', nationality: 'Portugal',
    primaryPosition: 'RB', secondaryPositions: ['LB', 'CM'], era: 'Modern', club: 'Manchester City',
    baseRating: 87, startYear: 2019, baseTrait: 'Creator Supreme', playStyle: 'Inverted Playmaker',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Luke Shaw', lastName: 'Shaw', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: ['CB'], era: 'Modern', club: 'Manchester United',
    baseRating: 83, startYear: 2014, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Kieran Trippier', lastName: 'Trippier', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: ['LB'], era: 'Modern', club: 'Newcastle',
    baseRating: 84, startYear: 2015, baseTrait: 'Creator Supreme', playStyle: 'Set Piece Master',
    rivals: ['Sunderland', 'Arsenal'],
  },

  // --- MIDFIELDERS ---
  {
    name: 'Roy Keane', lastName: 'Keane', nationality: 'Ireland',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '90s', club: 'Manchester United',
    baseRating: 92, startYear: 1993, baseTrait: 'Engine Room', playStyle: 'Lockdown Destroyer',
    rivals: ['Arsenal', 'Manchester City'],
  },
  {
    name: 'Patrick Vieira', lastName: 'Vieira', nationality: 'France',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '00s', club: 'Arsenal',
    baseRating: 93, startYear: 1996, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Destroyer',
    rivals: ['Manchester United', 'Tottenham'],
  },
  {
    name: 'Paul Scholes', lastName: 'Scholes', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM'], era: '00s', club: 'Manchester United',
    baseRating: 92, startYear: 1994, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Steven Gerrard', lastName: 'Gerrard', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM', 'RM'], era: '00s', club: 'Liverpool',
    baseRating: 93, startYear: 1998, baseTrait: 'Box-to-Box Monster', playStyle: 'Clutch Playmaker',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Frank Lampard', lastName: 'Lampard', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Chelsea',
    baseRating: 93, startYear: 2001, baseTrait: 'Clutch Finisher', playStyle: 'Goalscoring Midfielder',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Cesc Fabregas', lastName: 'Fabregas', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Arsenal',
    baseRating: 91, startYear: 2004, baseTrait: 'Creator Supreme', playStyle: 'Passing Maestro',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Yaya Toure', lastName: 'Yaya Toure', nationality: 'Ivory Coast',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'CAM'], era: '10s', club: 'Manchester City',
    baseRating: 92, startYear: 2010, baseTrait: 'Box-to-Box Monster', playStyle: 'Explosive Runner',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'David Silva', lastName: 'David Silva', nationality: 'Spain',
    primaryPosition: 'CAM', secondaryPositions: ['CM', 'LW'], era: '10s', club: 'Manchester City',
    baseRating: 91, startYear: 2010, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Kevin De Bruyne', lastName: 'De Bruyne', nationality: 'Belgium',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '10s', club: 'Manchester City',
    baseRating: 94, startYear: 2015, baseTrait: 'Creator Supreme', playStyle: 'Passing Maestro',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'N\'Golo Kante', lastName: 'Kante', nationality: 'France',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '10s', club: 'Chelsea',
    baseRating: 90, startYear: 2015, baseTrait: 'Engine Room', playStyle: 'Interception Specialist',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Rodri Hernandez', lastName: 'Rodri', nationality: 'Spain',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: 'Modern', club: 'Manchester City',
    baseRating: 91, startYear: 2019, baseTrait: 'Tempo Controller', playStyle: 'Deep Lying Pivot',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Fernandinho Roza', lastName: 'Fernandinho', nationality: 'Brazil',
    primaryPosition: 'CDM', secondaryPositions: ['CB', 'CM'], era: '10s', club: 'Manchester City',
    baseRating: 88, startYear: 2013, baseTrait: 'Engine Room', playStyle: 'Lockdown Destroyer',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Bruno Fernandes', lastName: 'B. Fernandes', nationality: 'Portugal',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: 'Modern', club: 'Manchester United',
    baseRating: 90, startYear: 2020, baseTrait: 'Creator Supreme', playStyle: 'Clutch Playmaker',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Martin Odegaard', lastName: 'Odegaard', nationality: 'Norway',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: 'Modern', club: 'Arsenal',
    baseRating: 89, startYear: 2021, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Declan Rice', lastName: 'Rice', nationality: 'England',
    primaryPosition: 'CDM', secondaryPositions: ['CM', 'CB'], era: 'Modern', club: 'Arsenal',
    baseRating: 88, startYear: 2017, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Destroyer',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Claude Makelele', lastName: 'Makelele', nationality: 'France',
    primaryPosition: 'CDM', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 90, startYear: 2003, baseTrait: 'Engine Room', playStyle: 'Deep Anchor',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Gilberto Silva', lastName: 'Gilberto Silva', nationality: 'Brazil',
    primaryPosition: 'CDM', secondaryPositions: ['CB'], era: '00s', club: 'Arsenal',
    baseRating: 87, startYear: 2002, baseTrait: 'Engine Room', playStyle: 'Deep Anchor',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Michael Essien', lastName: 'Essien', nationality: 'Ghana',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'RB'], era: '00s', club: 'Chelsea',
    baseRating: 89, startYear: 2005, baseTrait: 'Box-to-Box Monster', playStyle: 'Physical Engine',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Xabi Alonso', lastName: 'Xabi Alonso', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '00s', club: 'Liverpool',
    baseRating: 89, startYear: 2004, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Michael Carrick', lastName: 'Carrick', nationality: 'England',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '10s', club: 'Manchester United',
    baseRating: 86, startYear: 2004, baseTrait: 'Tempo Controller', playStyle: 'Deep Lying Pivot',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Jordan Henderson', lastName: 'Henderson', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'RM'], era: '10s', club: 'Liverpool',
    baseRating: 85, startYear: 2011, baseTrait: 'Engine Room', playStyle: 'Tactical Leader',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Christian Eriksen', lastName: 'Eriksen', nationality: 'Denmark',
    primaryPosition: 'CAM', secondaryPositions: ['CM', 'LM'], era: '10s', club: 'Tottenham',
    baseRating: 87, startYear: 2013, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Mesut Ozil', lastName: 'Ozil', nationality: 'Germany',
    primaryPosition: 'CAM', secondaryPositions: [], era: '10s', club: 'Arsenal',
    baseRating: 90, startYear: 2013, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Bernardo Silva', lastName: 'Bernardo', nationality: 'Portugal',
    primaryPosition: 'CM', secondaryPositions: ['RW', 'CAM'], era: 'Modern', club: 'Manchester City',
    baseRating: 89, startYear: 2017, baseTrait: 'Tempo Controller', playStyle: 'Pocket Playmaker',
    rivals: ['Manchester United', 'Liverpool'],
  },

  // --- WINGERS (LW/RW/LM/RM) ---
  {
    name: 'Ryan Giggs', lastName: 'Giggs', nationality: 'Wales',
    primaryPosition: 'LW', secondaryPositions: ['LM', 'CM'], era: '90s', club: 'Manchester United',
    baseRating: 90, startYear: 1992, baseTrait: 'Wing Wizard', playStyle: 'Dribbling Winger',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'David Beckham', lastName: 'Beckham', nationality: 'England',
    primaryPosition: 'RM', secondaryPositions: ['CM', 'RW'], era: '90s', club: 'Manchester United',
    baseRating: 91, startYear: 1995, baseTrait: 'Creator Supreme', playStyle: 'Cross Specialist',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Robert Pires', lastName: 'Pires', nationality: 'France',
    primaryPosition: 'LW', secondaryPositions: ['LM', 'CAM'], era: '00s', club: 'Arsenal',
    baseRating: 90, startYear: 2000, baseTrait: 'Creator Supreme', playStyle: 'Inside Forward',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Cristiano Ronaldo', lastName: 'Ronaldo', nationality: 'Portugal',
    primaryPosition: 'RW', secondaryPositions: ['LW', 'ST'], era: '00s', club: 'Manchester United',
    baseRating: 93, startYear: 2003, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Gareth Bale', lastName: 'Bale', nationality: 'Wales',
    primaryPosition: 'LW', secondaryPositions: ['RW', 'CAM', 'LB'], era: '10s', club: 'Tottenham',
    baseRating: 91, startYear: 2007, baseTrait: 'Wing Wizard', playStyle: 'Explosive Runner',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Eden Hazard', lastName: 'Hazard', nationality: 'Belgium',
    primaryPosition: 'LW', secondaryPositions: ['CAM', 'RW', 'LM'], era: '10s', club: 'Chelsea',
    baseRating: 93, startYear: 2010, baseTrait: 'Wing Wizard', playStyle: 'Pocket Playmaker',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Alexis Sanchez', lastName: 'Sanchez', nationality: 'Chile',
    primaryPosition: 'LW', secondaryPositions: ['RW', 'ST', 'CAM'], era: '10s', club: 'Arsenal',
    baseRating: 90, startYear: 2014, baseTrait: 'Chaos Merchant', playStyle: 'Inside Forward',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Mohamed Salah', lastName: 'Salah', nationality: 'Egypt',
    primaryPosition: 'RW', secondaryPositions: ['ST', 'LW'], era: 'Modern', club: 'Liverpool',
    baseRating: 93, startYear: 2017, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Sadio Mane', lastName: 'Mane', nationality: 'Senegal',
    primaryPosition: 'LW', secondaryPositions: ['RW', 'ST'], era: '10s', club: 'Liverpool',
    baseRating: 90, startYear: 2014, baseTrait: 'Chaos Merchant', playStyle: 'Inside Forward',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Son Heung-min', lastName: 'Son', nationality: 'South Korea',
    primaryPosition: 'LW', secondaryPositions: ['ST', 'RW'], era: 'Modern', club: 'Tottenham',
    baseRating: 89, startYear: 2015, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Riyad Mahrez', lastName: 'Mahrez', nationality: 'Algeria',
    primaryPosition: 'RW', secondaryPositions: ['CAM'], era: '10s', club: 'Leicester',
    baseRating: 89, startYear: 2014, baseTrait: 'Wing Wizard', playStyle: 'Pocket Playmaker',
    rivals: ['Nottingham Forest', 'Aston Villa'],
  },
  {
    name: 'Bukayo Saka', lastName: 'Saka', nationality: 'England',
    primaryPosition: 'RW', secondaryPositions: ['LW', 'LB'], era: 'Modern', club: 'Arsenal',
    baseRating: 89, startYear: 2019, baseTrait: 'Creator Supreme', playStyle: 'Inside Forward',
    rivals: ['Tottenham', 'Chelsea'],
  },
  {
    name: 'Phil Foden', lastName: 'Foden', nationality: 'England',
    primaryPosition: 'RW', secondaryPositions: ['CAM', 'LW'], era: 'Modern', club: 'Manchester City',
    baseRating: 89, startYear: 2017, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Cole Palmer', lastName: 'Palmer', nationality: 'England',
    primaryPosition: 'CAM', secondaryPositions: ['RW', 'ST'], era: 'Modern', club: 'Chelsea',
    baseRating: 88, startYear: 2020, baseTrait: 'Creator Supreme', playStyle: 'Clutch Playmaker',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'David Ginola', lastName: 'Ginola', nationality: 'France',
    primaryPosition: 'LW', secondaryPositions: ['LM', 'CAM'], era: '90s', club: 'Newcastle',
    baseRating: 88, startYear: 1995, baseTrait: 'Wing Wizard', playStyle: 'Luxury Player',
    rivals: ['Sunderland', 'Sunderland'],
  },
  {
    name: 'Dimitri Payet', lastName: 'Payet', nationality: 'France',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'LM', 'RW'], era: '10s', club: 'West Ham',
    baseRating: 87, startYear: 2011, baseTrait: 'Creator Supreme', playStyle: 'Set Piece Master',
    rivals: ['Tottenham', 'Chelsea'],
  },

  // --- STRIKERS (ST/CF) ---
  {
    name: 'Alan Shearer', lastName: 'Shearer', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Newcastle',
    baseRating: 93, startYear: 1992, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Sunderland', 'Manchester United'],
  },
  {
    name: 'Andy Cole', lastName: 'Cole', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Manchester United',
    baseRating: 88, startYear: 1993, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Robbie Fowler', lastName: 'Fowler', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Liverpool',
    baseRating: 88, startYear: 1993, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Teddy Sheringham', lastName: 'Sheringham', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'CAM'], era: '90s', club: 'Tottenham',
    baseRating: 87, startYear: 1992, baseTrait: 'Target Man', playStyle: 'Deep Lying Forward',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Thierry Henry', lastName: 'Henry', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['LW', 'CF'], era: '00s', club: 'Arsenal',
    baseRating: 94, startYear: 1999, baseTrait: 'Golden Boot Form', playStyle: 'Inside Forward',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Ruud van Nistelrooy', lastName: 'Van Nistelrooy', nationality: 'Netherlands',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 92, startYear: 2001, baseTrait: 'Golden Boot Form', playStyle: 'Box Fox',
    rivals: ['Arsenal', 'Liverpool'],
  },
  {
    name: 'Didier Drogba', lastName: 'Drogba', nationality: 'Ivory Coast',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 91, startYear: 2004, baseTrait: 'Target Man', playStyle: 'Clutch Goalscorer',
    rivals: ['Arsenal', 'Tottenham'],
  },
  {
    name: 'Wayne Rooney', lastName: 'Rooney', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'CAM', 'CM'], era: '00s', club: 'Manchester United',
    baseRating: 92, startYear: 2002, baseTrait: 'Chaos Merchant', playStyle: 'All Action Forward',
    rivals: ['Liverpool', 'Manchester City'],
  },
  {
    name: 'Robin van Persie', lastName: 'Van Persie', nationality: 'Netherlands',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'RW'], era: '10s', club: 'Arsenal',
    baseRating: 91, startYear: 2004, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Tottenham', 'Manchester United'],
  },
  {
    name: 'Luis Suarez', lastName: 'Suarez', nationality: 'Uruguay',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'LW', 'RW'], era: '10s', club: 'Liverpool',
    baseRating: 93, startYear: 2011, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Manchester United', 'Everton'],
  },
  {
    name: 'Sergio Aguero', lastName: 'Aguero', nationality: 'Argentina',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '10s', club: 'Manchester City',
    baseRating: 92, startYear: 2011, baseTrait: 'Golden Boot Form', playStyle: 'Box Fox',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Harry Kane', lastName: 'Kane', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'CAM'], era: 'Modern', club: 'Tottenham',
    baseRating: 92, startYear: 2013, baseTrait: 'Golden Boot Form', playStyle: 'Deep Lying Forward',
    rivals: ['Arsenal', 'Chelsea'],
  },
  {
    name: 'Jamie Vardy', lastName: 'Vardy', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '10s', club: 'Leicester',
    baseRating: 88, startYear: 2014, baseTrait: 'Chaos Merchant', playStyle: 'Explosive Runner',
    rivals: ['Nottingham Forest', 'Derby'],
  },
  {
    name: 'Erling Haaland', lastName: 'Haaland', nationality: 'Norway',
    primaryPosition: 'ST', secondaryPositions: [], era: 'Modern', club: 'Manchester City',
    baseRating: 92, startYear: 2020, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Manchester United', 'Liverpool'],
  },
  {
    name: 'Gianfranco Zola', lastName: 'Zola', nationality: 'Italy',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '90s', club: 'Chelsea',
    baseRating: 90, startYear: 1996, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Tottenham', 'Arsenal'],
  },
  {
    name: 'Jimmy Floyd Hasselbaink', lastName: 'Hasselbaink', nationality: 'Netherlands',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 88, startYear: 1997, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Arsenal', 'Leeds United'],
  },
  {
    name: 'Matt Le Tissier', lastName: 'Le Tissier', nationality: 'England',
    primaryPosition: 'CAM', secondaryPositions: ['CF', 'ST'], era: '90s', club: 'Southampton',
    baseRating: 88, startYear: 1992, baseTrait: 'Creator Supreme', playStyle: 'Luxury Player',
    rivals: ['Portsmouth', 'Bournemouth'],
  },

  // --- INTERNATIONAL GOALKEEPERS ---
  {
    name: 'Gianluigi Buffon', lastName: 'Buffon', nationality: 'Italy',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Juventus',
    baseRating: 92, startYear: 1995, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['AC Milan', 'Inter Milan'],
  },
  {
    name: 'Iker Casillas', lastName: 'Casillas', nationality: 'Spain',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Real Madrid',
    baseRating: 90, startYear: 1999, baseTrait: 'Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Manuel Neuer', lastName: 'Neuer', nationality: 'Germany',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Bayern Munich',
    baseRating: 92, startYear: 2006, baseTrait: 'Sweeper Keeper', playStyle: 'Creator Supreme',
    rivals: ['Dortmund', 'Schalke'],
  },
  {
    name: 'Oliver Kahn', lastName: 'Kahn', nationality: 'Germany',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'Bayern Munich',
    baseRating: 90, startYear: 1994, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Dortmund'],
  },

  // --- INTERNATIONAL DEFENDERS ---
  {
    name: 'Paolo Maldini', lastName: 'Maldini', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: ['LB'], era: '90s', club: 'AC Milan',
    baseRating: 93, startYear: 1992, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Sergio Ramos', lastName: 'Ramos', nationality: 'Spain',
    primaryPosition: 'CB', secondaryPositions: ['RB'], era: '00s', club: 'Real Madrid',
    baseRating: 91, startYear: 2004, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Fabio Cannavaro', lastName: 'Cannavaro', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Juventus',
    baseRating: 89, startYear: 1995, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Inter Milan', 'AC Milan'],
  },
  {
    name: 'Roberto Carlos', lastName: 'R. Carlos', nationality: 'Brazil',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '90s', club: 'Real Madrid',
    baseRating: 90, startYear: 1996, baseTrait: 'Creator Supreme', playStyle: 'Overlapping Wingback',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Cafu', lastName: 'Cafu', nationality: 'Brazil',
    primaryPosition: 'RB', secondaryPositions: ['RM'], era: '90s', club: 'Roma',
    baseRating: 89, startYear: 1997, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Lazio', 'Juventus'],
  },
  {
    name: 'Dani Alves', lastName: 'Alves', nationality: 'Brazil',
    primaryPosition: 'RB', secondaryPositions: ['RM', 'CM'], era: '00s', club: 'Barcelona',
    baseRating: 90, startYear: 2002, baseTrait: 'Creator Supreme', playStyle: 'Overlapping Wingback',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Philipp Lahm', lastName: 'Lahm', nationality: 'Germany',
    primaryPosition: 'RB', secondaryPositions: ['LB', 'CM', 'CDM'], era: '00s', club: 'Bayern Munich',
    baseRating: 89, startYear: 2003, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Dortmund', 'Schalke'],
  },
  {
    name: 'Javier Zanetti', lastName: 'Zanetti', nationality: 'Argentina',
    primaryPosition: 'RB', secondaryPositions: ['LB', 'CDM', 'CM'], era: '90s', club: 'Inter Milan',
    baseRating: 88, startYear: 1995, baseTrait: 'Engine Room', playStyle: 'Traditional Fullback',
    rivals: ['AC Milan', 'Juventus'],
  },
  {
    name: 'Carles Puyol', lastName: 'Puyol', nationality: 'Spain',
    primaryPosition: 'CB', secondaryPositions: ['RB'], era: '90s', club: 'Barcelona',
    baseRating: 90, startYear: 1999, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Real Madrid', 'Espanyol'],
  },

  // --- INTERNATIONAL MIDFIELDERS ---
  {
    name: 'Zinedine Zidane', lastName: 'Zidane', nationality: 'France',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: '90s', club: 'Real Madrid',
    baseRating: 94, startYear: 1996, baseTrait: 'Creator Supreme', playStyle: 'Passing Maestro',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Ronaldinho Gaucho', lastName: 'Ronaldinho', nationality: 'Brazil',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'LM'], era: '00s', club: 'Barcelona',
    baseRating: 93, startYear: 2001, baseTrait: 'Wing Wizard', playStyle: 'Pocket Playmaker',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Kaka', lastName: 'Kaka', nationality: 'Brazil',
    primaryPosition: 'CAM', secondaryPositions: ['CF'], era: '00s', club: 'AC Milan',
    baseRating: 91, startYear: 2003, baseTrait: 'Wing Wizard', playStyle: 'Pocket Playmaker',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Xavi Hernandez', lastName: 'Xavi', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: [], era: '90s', club: 'Barcelona',
    baseRating: 92, startYear: 1998, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Andres Iniesta', lastName: 'Iniesta', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'LW', 'LM'], era: '00s', club: 'Barcelona',
    baseRating: 92, startYear: 2002, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Andrea Pirlo', lastName: 'Pirlo', nationality: 'Italy',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'AC Milan',
    baseRating: 91, startYear: 1998, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Luka Modric', lastName: 'Modric', nationality: 'Croatia',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Real Madrid',
    baseRating: 91, startYear: 2008, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Toni Kroos', lastName: 'Kroos', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '00s', club: 'Real Madrid',
    baseRating: 90, startYear: 2007, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Bastian Schweinsteiger', lastName: 'Schweinsteiger', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'LM'], era: '00s', club: 'Bayern Munich',
    baseRating: 88, startYear: 2002, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Dortmund', 'Schalke'],
  },
  {
    name: 'Michael Ballack', lastName: 'Ballack', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '90s', club: 'Leverkusen',
    baseRating: 88, startYear: 1997, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Bayern Munich', 'Dortmund'],
  },
  {
    name: 'Franck Ribery', lastName: 'Ribery', nationality: 'France',
    primaryPosition: 'LW', secondaryPositions: ['LM', 'CAM'], era: '00s', club: 'Bayern Munich',
    baseRating: 90, startYear: 2004, baseTrait: 'Wing Wizard', playStyle: 'Dribbling Winger',
    rivals: ['Dortmund', 'Nurnberg'],
  },
  {
    name: 'Arjen Robben', lastName: 'Robben', nationality: 'Netherlands',
    primaryPosition: 'RW', secondaryPositions: ['RM'], era: '00s', club: 'Bayern Munich',
    baseRating: 91, startYear: 2003, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Dortmund', '1860 Munich'],
  },

  // --- INTERNATIONAL ATTACKERS ---
  {
    name: 'Lionel Messi', lastName: 'Messi', nationality: 'Argentina',
    primaryPosition: 'RW', secondaryPositions: ['CF', 'ST', 'CAM'], era: '00s', club: 'Barcelona',
    baseRating: 96, startYear: 2004, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Ronaldo Nazario', lastName: 'Ronaldo Nazario', nationality: 'Brazil',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Real Madrid',
    baseRating: 95, startYear: 1993, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Neymar Jr', lastName: 'Neymar', nationality: 'Brazil',
    primaryPosition: 'LW', secondaryPositions: ['CAM', 'LM'], era: '00s', club: 'Barcelona',
    baseRating: 91, startYear: 2009, baseTrait: 'Wing Wizard', playStyle: 'Dribbling Winger',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Zlatan Ibrahimovic', lastName: 'Ibrahimovic', nationality: 'Sweden',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'AC Milan',
    baseRating: 91, startYear: 1999, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Alessandro Del Piero', lastName: 'Del Piero', nationality: 'Italy',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '90s', club: 'Juventus',
    baseRating: 90, startYear: 1993, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Torino', 'Inter Milan'],
  },
  {
    name: 'Francesco Totti', lastName: 'Totti', nationality: 'Italy',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '90s', club: 'Roma',
    baseRating: 91, startYear: 1993, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Lazio', 'Juventus'],
  },
  {
    name: 'Robert Lewandowski', lastName: 'Lewandowski', nationality: 'Poland',
    primaryPosition: 'ST', secondaryPositions: [], era: '10s', club: 'Bayern Munich',
    baseRating: 92, startYear: 2010, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Dortmund', 'Nurnberg'],
  },
  {
    name: 'Karim Benzema', lastName: 'Benzema', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '00s', club: 'Real Madrid',
    baseRating: 91, startYear: 2005, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Atletico Madrid', 'Barcelona'],
  },
  {
    name: 'Kylian Mbappe', lastName: 'Mbappe', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['LW', 'RW'], era: '10s', club: 'PSG',
    baseRating: 92, startYear: 2015, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Marseille', 'Lille'],
  },
  {
    name: 'Antoine Griezmann', lastName: 'Griezmann', nationality: 'France',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '00s', club: 'Atletico Madrid',
    baseRating: 89, startYear: 2009, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Real Madrid', 'Real Sociedad'],
  },
  {
    name: 'Raul Gonzalez', lastName: 'Raul', nationality: 'Spain',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Real Madrid',
    baseRating: 90, startYear: 1994, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Atletico Madrid', 'Barcelona'],
  },
  {
    name: 'Luis Figo', lastName: 'Figo', nationality: 'Portugal',
    primaryPosition: 'RW', secondaryPositions: ['RM', 'CAM'], era: '90s', club: 'Real Madrid',
    baseRating: 91, startYear: 1992, baseTrait: 'Wing Wizard', playStyle: 'Dribbling Winger',
    rivals: ['Barcelona', 'Atletico Madrid'],
  },
  {
    name: 'Gabriel Batistuta', lastName: 'Batistuta', nationality: 'Argentina',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Fiorentina',
    baseRating: 89, startYear: 1992, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Juventus', 'Bologna'],
  },
  {
    name: 'Roberto Baggio', lastName: 'Baggio', nationality: 'Italy',
    primaryPosition: 'CF', secondaryPositions: ['CAM'], era: '90s', club: 'Juventus',
    baseRating: 92, startYear: 1992, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Torino', 'Fiorentina'],
  },
  {
    name: 'Andriy Shevchenko', lastName: 'Shevchenko', nationality: 'Ukraine',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'AC Milan',
    baseRating: 91, startYear: 1995, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Marco van Basten', lastName: 'Van Basten', nationality: 'Netherlands',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'AC Milan',
    baseRating: 93, startYear: 1992, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Ruud Gullit', lastName: 'Gullit', nationality: 'Netherlands',
    primaryPosition: 'CF', secondaryPositions: ['CM', 'CAM', 'CB'], era: '90s', club: 'AC Milan',
    baseRating: 92, startYear: 1992, baseTrait: 'Box-to-Box Monster', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Inter Milan', 'Juventus'],
  },
  {
    name: 'Samuel Eto\'o', lastName: 'Eto\'o', nationality: 'Cameroon',
    primaryPosition: 'ST', secondaryPositions: ['RW'], era: '90s', club: 'Barcelona',
    baseRating: 90, startYear: 1997, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
    rivals: ['Real Madrid', 'Espanyol'],
  },
  {
    name: 'Hernan Crespo', lastName: 'Crespo', nationality: 'Argentina',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Parma',
    baseRating: 87, startYear: 1996, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Bologna', 'Juventus'],
  },
  {
    name: 'David Trezeguet', lastName: 'Trezeguet', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Juventus',
    baseRating: 88, startYear: 1995, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Torino', 'Inter Milan'],
  },
  {
    name: 'Miroslav Klose', lastName: 'Klose', nationality: 'Germany',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Bremen',
    baseRating: 87, startYear: 1999, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Hamburg', 'Bayern Munich'],
  },
  {
    name: 'Thomas Müller', lastName: 'Muller', nationality: 'Germany',
    primaryPosition: 'CAM', secondaryPositions: ['CF', 'RW', 'RM'], era: '00s', club: 'Bayern Munich',
    baseRating: 88, startYear: 2008, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Dortmund', 'Schalke'],
  },
  {
    name: 'Marco Reus', lastName: 'Reus', nationality: 'Germany',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'LM', 'ST'], era: '00s', club: 'Dortmund',
    baseRating: 88, startYear: 2009, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Schalke', 'Bayern Munich'],
  },
  // --- NON-LEGENDS DAILY CHALLENGE BANK ---
  // Goalkeepers
  {
    name: 'Mark Schwarzer', lastName: 'Schwarzer', nationality: 'Australia',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Middlesbrough',
    baseRating: 81, startYear: 1997, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Newcastle', 'Sunderland'], isLegendaryPlayer: false,
  },
  {
    name: 'Brad Friedel', lastName: 'Friedel', nationality: 'United States',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Blackburn',
    baseRating: 82, startYear: 2000, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Burnley', 'Bolton'], isLegendaryPlayer: false,
  },
  {
    name: 'Tim Howard', lastName: 'Howard', nationality: 'United States',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Everton',
    baseRating: 82, startYear: 2003, baseTrait: 'Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['Liverpool', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Lukasz Fabianski', lastName: 'Fabianski', nationality: 'Poland',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Swansea',
    baseRating: 80, startYear: 2007, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Cardiff', 'West Ham'], isLegendaryPlayer: false,
  },
  {
    name: 'Fraser Forster', lastName: 'Forster', nationality: 'England',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Southampton',
    baseRating: 80, startYear: 2010, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Portsmouth', 'Bournemouth'], isLegendaryPlayer: false,
  },
  // Centre Backs
  {
    name: 'Phil Jagielka', lastName: 'Jagielka', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Everton',
    baseRating: 81, startYear: 2007, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Sheffield United'], isLegendaryPlayer: false,
  },
  {
    name: 'Ryan Shawcross', lastName: 'Shawcross', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Stoke City',
    baseRating: 80, startYear: 2007, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Port Vale', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Brede Hangeland', lastName: 'Hangeland', nationality: 'Norway',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Fulham',
    baseRating: 81, startYear: 2008, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Chelsea', 'QPR'], isLegendaryPlayer: false,
  },
  {
    name: 'Sylvain Distin', lastName: 'Distin', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: ['LB'], era: '00s', club: 'Everton',
    baseRating: 81, startYear: 2001, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Liverpool', 'Manchester City'], isLegendaryPlayer: false,
  },
  {
    name: 'Wes Morgan', lastName: 'Morgan', nationality: 'Jamaica',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Leicester',
    baseRating: 81, startYear: 2012, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Derby County', 'Nottingham Forest'], isLegendaryPlayer: false,
  },
  {
    name: 'Martin Skrtel', lastName: 'Skrtel', nationality: 'Slovakia',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Liverpool',
    baseRating: 82, startYear: 2008, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Manchester United', 'Everton'], isLegendaryPlayer: false,
  },
  {
    name: 'Conor Coady', lastName: 'Coady', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: 'Modern', club: 'Wolverhampton',
    baseRating: 79, startYear: 2015, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['West Brom', 'Aston Villa'], isLegendaryPlayer: false,
  },
  {
    name: 'Lewis Dunk', lastName: 'Dunk', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: 'Modern', club: 'Brighton',
    baseRating: 81, startYear: 2010, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['Crystal Palace', 'Southampton'], isLegendaryPlayer: false,
  },
  // Full Backs
  {
    name: 'John Arne Riise', lastName: 'Riise', nationality: 'Norway',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '00s', club: 'Liverpool',
    baseRating: 83, startYear: 2001, baseTrait: 'Wing Wizard', playStyle: 'Overlapping Wingback',
    rivals: ['Everton', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Stephen Carr', lastName: 'Carr', nationality: 'Ireland',
    primaryPosition: 'RB', secondaryPositions: [], era: '90s', club: 'Tottenham',
    baseRating: 81, startYear: 1993, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Seamus Coleman', lastName: 'Coleman', nationality: 'Ireland',
    primaryPosition: 'RB', secondaryPositions: ['RM'], era: '10s', club: 'Everton',
    baseRating: 81, startYear: 2009, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Liverpool', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Danny Rose', lastName: 'Rose', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'Tottenham',
    baseRating: 81, startYear: 2007, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Glen Johnson', lastName: 'Johnson', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: [], era: '00s', club: 'Liverpool',
    baseRating: 82, startYear: 2002, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Everton', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Ben Davies', lastName: 'Davies', nationality: 'Wales',
    primaryPosition: 'LB', secondaryPositions: ['CB'], era: 'Modern', club: 'Tottenham',
    baseRating: 79, startYear: 2012, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  // Midfielders (CDM/CM/CAM)
  {
    name: 'James Milner', lastName: 'Milner', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'LB', 'RB'], era: '00s', club: 'Aston Villa',
    baseRating: 83, startYear: 2002, baseTrait: 'Engine Room', playStyle: 'Tactical Leader',
    rivals: ['Birmingham City', 'Leeds United'], isLegendaryPlayer: false,
  },
  {
    name: 'Gareth Barry', lastName: 'Barry', nationality: 'England',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '00s', club: 'Aston Villa',
    baseRating: 83, startYear: 1998, baseTrait: 'Engine Room', playStyle: 'Deep Lying Pivot',
    rivals: ['Birmingham City', 'Wolverhampton'], isLegendaryPlayer: false,
  },
  {
    name: 'Mark Noble', lastName: 'Noble', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '00s', club: 'West Ham',
    baseRating: 80, startYear: 2004, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Tottenham', 'Millwall'], isLegendaryPlayer: false,
  },
  {
    name: 'James Ward-Prowse', lastName: 'Ward-Prowse', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['RM'], era: '10s', club: 'Southampton',
    baseRating: 82, startYear: 2011, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Portsmouth', 'Bournemouth'], isLegendaryPlayer: false,
  },
  {
    name: 'Wilfred Ndidi', lastName: 'Ndidi', nationality: 'Nigeria',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: 'Modern', club: 'Leicester',
    baseRating: 81, startYear: 2017, baseTrait: 'Engine Room', playStyle: 'Interception Specialist',
    rivals: ['Coventry City', 'Derby County'], isLegendaryPlayer: false,
  },
  {
    name: 'Rory Delap', lastName: 'Delap', nationality: 'Ireland',
    primaryPosition: 'CM', secondaryPositions: ['RM'], era: '00s', club: 'Stoke City',
    baseRating: 78, startYear: 1998, baseTrait: 'Engine Room', playStyle: 'Physical Engine',
    rivals: ['Port Vale', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Etienne Capoue', lastName: 'Capoue', nationality: 'France',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '10s', club: 'Watford',
    baseRating: 80, startYear: 2013, baseTrait: 'Engine Room', playStyle: 'Lockdown Destroyer',
    rivals: ['Luton Town', 'Crystal Palace'], isLegendaryPlayer: false,
  },
  {
    name: 'Leon Osman', lastName: 'Osman', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['RM', 'LM'], era: '00s', club: 'Everton',
    baseRating: 80, startYear: 2002, baseTrait: 'Tempo Controller', playStyle: 'Pocket Playmaker',
    rivals: ['Liverpool', 'Manchester United'], isLegendaryPlayer: false,
  },
  // Wingers & Attacking Midfielders
  {
    name: 'Morten Gamst Pedersen', lastName: 'Pedersen', nationality: 'Norway',
    primaryPosition: 'LM', secondaryPositions: ['LW', 'CM'], era: '00s', club: 'Blackburn',
    baseRating: 81, startYear: 2004, baseTrait: 'Wing Wizard', playStyle: 'Cross Specialist',
    rivals: ['Burnley', 'Bolton'], isLegendaryPlayer: false,
  },
  {
    name: 'Sebastian Larsson', lastName: 'Larsson', nationality: 'Sweden',
    primaryPosition: 'RM', secondaryPositions: ['CM'], era: '00s', club: 'Sunderland',
    baseRating: 80, startYear: 2004, baseTrait: 'Tempo Controller', playStyle: 'Cross Specialist',
    rivals: ['Newcastle', 'Middlesbrough'], isLegendaryPlayer: false,
  },
  {
    name: 'Gylfi Sigurdsson', lastName: 'Sigurdsson', nationality: 'Iceland',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: '10s', club: 'Swansea',
    baseRating: 83, startYear: 2010, baseTrait: 'Creator Supreme', playStyle: 'Clutch Playmaker',
    rivals: ['Cardiff City', 'Everton'], isLegendaryPlayer: false,
  },
  {
    name: 'Clint Dempsey', lastName: 'Dempsey', nationality: 'United States',
    primaryPosition: 'CAM', secondaryPositions: ['CF', 'LW'], era: '00s', club: 'Fulham',
    baseRating: 82, startYear: 2004, baseTrait: 'Clutch Finisher', playStyle: 'Pocket Playmaker',
    rivals: ['Chelsea', 'QPR'], isLegendaryPlayer: false,
  },
  {
    name: 'Salomon Kalou', lastName: 'Kalou', nationality: 'Ivory Coast',
    primaryPosition: 'RW', secondaryPositions: ['LW', 'ST'], era: '00s', club: 'Chelsea',
    baseRating: 81, startYear: 2006, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Arsenal', 'Tottenham'], isLegendaryPlayer: false,
  },
  {
    name: 'Wilfried Zaha', lastName: 'Zaha', nationality: 'Ivory Coast',
    primaryPosition: 'LW', secondaryPositions: ['RW', 'ST'], era: '10s', club: 'Crystal Palace',
    baseRating: 83, startYear: 2010, baseTrait: 'Wing Wizard', playStyle: 'Dribbling Winger',
    rivals: ['Brighton', 'Millwall'], isLegendaryPlayer: false,
  },
  {
    name: 'Pascal Gross', lastName: 'Gross', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'RB'], era: 'Modern', club: 'Brighton',
    baseRating: 82, startYear: 2017, baseTrait: 'Creator Supreme', playStyle: 'Passing Maestro',
    rivals: ['Crystal Palace', 'Southampton'], isLegendaryPlayer: false,
  },
  // Strikers
  {
    name: 'Peter Crouch', lastName: 'Crouch', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Stoke City',
    baseRating: 82, startYear: 2000, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Port Vale', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Olivier Giroud', lastName: 'Giroud', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: [], era: '10s', club: 'Arsenal',
    baseRating: 83, startYear: 2012, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Darren Bent', lastName: 'Bent', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Sunderland',
    baseRating: 82, startYear: 2001, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Newcastle', 'Middlesbrough'], isLegendaryPlayer: false,
  },
  {
    name: 'Michail Antonio', lastName: 'Antonio', nationality: 'Jamaica',
    primaryPosition: 'ST', secondaryPositions: ['RW', 'RM'], era: '10s', club: 'West Ham',
    baseRating: 80, startYear: 2015, baseTrait: 'Target Man', playStyle: 'Physical Engine',
    rivals: ['Tottenham', 'Millwall'], isLegendaryPlayer: false,
  },
  {
    name: 'Danny Ings', lastName: 'Ings', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '10s', club: 'Southampton',
    baseRating: 81, startYear: 2010, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Portsmouth', 'Bournemouth'], isLegendaryPlayer: false,
  },
  {
    name: 'Troy Deeney', lastName: 'Deeney', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '10s', club: 'Watford',
    baseRating: 79, startYear: 2010, baseTrait: 'Target Man', playStyle: 'Physical Engine',
    rivals: ['Luton Town', 'Crystal Palace'], isLegendaryPlayer: false,
  },
  {
    name: 'Chris Wood', lastName: 'Wood', nationality: 'New Zealand',
    primaryPosition: 'ST', secondaryPositions: [], era: 'Modern', club: 'Burnley',
    baseRating: 80, startYear: 2009, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Blackburn', 'Newcastle'], isLegendaryPlayer: false,
  },
  // --- ADDITIONAL FULLBACKS (LB/RB) ---
  {
    name: 'Aaron Cresswell', lastName: 'Cresswell', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: ['CB', 'LM'], era: '10s', club: 'West Ham',
    baseRating: 80, startYear: 2014, baseTrait: 'Creator Supreme', playStyle: 'Set Piece Master',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Christian Fuchs', lastName: 'Fuchs', nationality: 'Austria',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'Leicester',
    baseRating: 81, startYear: 2015, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Derby County', 'Nottingham Forest'], isLegendaryPlayer: false,
  },
  {
    name: 'Jose Holebas', lastName: 'Holebas', nationality: 'Greece',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'Watford',
    baseRating: 79, startYear: 2015, baseTrait: 'Wing Wizard', playStyle: 'Overlapping Wingback',
    rivals: ['Luton Town', 'Crystal Palace'], isLegendaryPlayer: false,
  },
  {
    name: 'Charlie Taylor', lastName: 'C. Taylor', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: 'Modern', club: 'Burnley',
    baseRating: 78, startYear: 2017, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Blackburn', 'Bolton'], isLegendaryPlayer: false,
  },
  {
    name: 'Erik Pieters', lastName: 'Pieters', nationality: 'Netherlands',
    primaryPosition: 'LB', secondaryPositions: ['CB'], era: '10s', club: 'Stoke City',
    baseRating: 78, startYear: 2013, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Port Vale', 'Wolverhampton'], isLegendaryPlayer: false,
  },
  {
    name: 'Patrick van Aanholt', lastName: 'Van Aanholt', nationality: 'Netherlands',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'Sunderland',
    baseRating: 80, startYear: 2009, baseTrait: 'Wing Wizard', playStyle: 'Overlapping Wingback',
    rivals: ['Newcastle', 'Middlesbrough'], isLegendaryPlayer: false,
  },
  {
    name: 'Kieran Gibbs', lastName: 'Gibbs', nationality: 'England',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'Arsenal',
    baseRating: 80, startYear: 2007, baseTrait: 'Lockdown Fullback', playStyle: 'Overlapping Wingback',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Neil Taylor', lastName: 'N. Taylor', nationality: 'Wales',
    primaryPosition: 'LB', secondaryPositions: [], era: '10s', club: 'Swansea',
    baseRating: 78, startYear: 2010, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Cardiff', 'Bristol City'], isLegendaryPlayer: false,
  },
  {
    name: 'Arthur Masuaku', lastName: 'Masuaku', nationality: 'DR Congo',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: 'Modern', club: 'West Ham',
    baseRating: 78, startYear: 2016, baseTrait: 'Wing Wizard', playStyle: 'Overlapping Wingback',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Bacary Sagna', lastName: 'Sagna', nationality: 'France',
    primaryPosition: 'RB', secondaryPositions: ['CB'], era: '00s', club: 'Arsenal',
    baseRating: 84, startYear: 2007, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Alan Hutton', lastName: 'Hutton', nationality: 'Scotland',
    primaryPosition: 'RB', secondaryPositions: [], era: '00s', club: 'Aston Villa',
    baseRating: 78, startYear: 2008, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Birmingham City', 'Wolverhampton'], isLegendaryPlayer: false,
  },
  {
    name: 'Danny Simpson', lastName: 'Simpson', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: [], era: '10s', club: 'Leicester',
    baseRating: 79, startYear: 2006, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Derby County', 'Nottingham Forest'], isLegendaryPlayer: false,
  },
  {
    name: 'Matthew Lowton', lastName: 'Lowton', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: [], era: '10s', club: 'Burnley',
    baseRating: 78, startYear: 2012, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Blackburn', 'Bolton'], isLegendaryPlayer: false,
  },

  // --- MULTI-LEAGUE NON-LEGENDS ---
  // Goalkeepers
  {
    name: 'Diego Alves', lastName: 'Diego Alves', nationality: 'Brazil',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Valencia',
    baseRating: 81, startYear: 2007, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Levante', 'Villarreal'], isLegendaryPlayer: false,
  },
  {
    name: 'Roman Weidenfeller', lastName: 'Weidenfeller', nationality: 'Germany',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Dortmund',
    baseRating: 81, startYear: 2002, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Samir Handanovic', lastName: 'Handanovic', nationality: 'Slovenia',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Inter Milan',
    baseRating: 84, startYear: 2004, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Steve Mandanda', lastName: 'Mandanda', nationality: 'France',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Marseille',
    baseRating: 82, startYear: 2007, baseTrait: 'Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['PSG', 'Lyon'], isLegendaryPlayer: false,
  },
  // Centre Backs
  {
    name: 'Andrea Barzagli', lastName: 'Barzagli', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Juventus',
    baseRating: 83, startYear: 2001, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Torino', 'AC Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Marquinhos', lastName: 'Marquinhos', nationality: 'Brazil',
    primaryPosition: 'CB', secondaryPositions: ['RB', 'CDM'], era: '10s', club: 'PSG',
    baseRating: 84, startYear: 2013, baseTrait: 'Defensive Leader', playStyle: 'Ball Playing Defender',
    rivals: ['Marseille', 'Monaco'], isLegendaryPlayer: false,
  },
  // Full Backs
  {
    name: 'Jordi Alba', lastName: 'Alba', nationality: 'Spain',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '00s', club: 'Barcelona',
    baseRating: 84, startYear: 2009, baseTrait: 'Wing Wizard', playStyle: 'Overlapping Wingback',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Filipe Luis', lastName: 'Filipe Luis', nationality: 'Brazil',
    primaryPosition: 'LB', secondaryPositions: [], era: '00s', club: 'Atletico Madrid',
    baseRating: 83, startYear: 2005, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Real Madrid', 'Barcelona'], isLegendaryPlayer: false,
  },
  {
    name: 'Lukasz Piszczek', lastName: 'Piszczek', nationality: 'Poland',
    primaryPosition: 'RB', secondaryPositions: ['CB', 'RM'], era: '00s', club: 'Dortmund',
    baseRating: 83, startYear: 2007, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Jonas Hector', lastName: 'Hector', nationality: 'Germany',
    primaryPosition: 'LB', secondaryPositions: ['CDM', 'CM'], era: '10s', club: 'FC Koln',
    baseRating: 80, startYear: 2010, baseTrait: 'Engine Room', playStyle: 'Traditional Fullback',
    rivals: ['Gladbach', 'Leverkusen'], isLegendaryPlayer: false,
  },
  {
    name: 'Lucas Digne', lastName: 'Digne', nationality: 'France',
    primaryPosition: 'LB', secondaryPositions: ['LM'], era: '10s', club: 'PSG',
    baseRating: 81, startYear: 2011, baseTrait: 'Creator Supreme', playStyle: 'Overlapping Wingback',
    rivals: ['Marseille', 'Monaco'], isLegendaryPlayer: false,
  },
  {
    name: 'Christophe Jallet', lastName: 'Jallet', nationality: 'France',
    primaryPosition: 'RB', secondaryPositions: ['RM'], era: '00s', club: 'PSG',
    baseRating: 79, startYear: 2003, baseTrait: 'Lockdown Fullback', playStyle: 'Traditional Fullback',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: false,
  },
  // Midfielders
  {
    name: 'Ever Banega', lastName: 'Banega', nationality: 'Argentina',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'CAM'], era: '00s', club: 'Sevilla',
    baseRating: 82, startYear: 2007, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Real Betis', 'Valencia'], isLegendaryPlayer: false,
  },
  {
    name: 'Dani Parejo', lastName: 'Parejo', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Valencia',
    baseRating: 83, startYear: 2008, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Levante', 'Villarreal'], isLegendaryPlayer: false,
  },
  {
    name: 'Gabi Fernandez', lastName: 'Gabi', nationality: 'Spain',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '00s', club: 'Atletico Madrid',
    baseRating: 82, startYear: 2004, baseTrait: 'Engine Room', playStyle: 'Deep Lying Pivot',
    rivals: ['Real Madrid', 'Barcelona'], isLegendaryPlayer: false,
  },
  {
    name: 'Lars Bender', lastName: 'L. Bender', nationality: 'Germany',
    primaryPosition: 'CDM', secondaryPositions: ['RB', 'CM'], era: '00s', club: 'Leverkusen',
    baseRating: 81, startYear: 2006, baseTrait: 'Engine Room', playStyle: 'Lockdown Destroyer',
    rivals: ['Koln', 'Dortmund'], isLegendaryPlayer: false,
  },
  {
    name: 'Sven Bender', lastName: 'S. Bender', nationality: 'Germany',
    primaryPosition: 'CDM', secondaryPositions: ['CB', 'CM'], era: '00s', club: 'Dortmund',
    baseRating: 81, startYear: 2006, baseTrait: 'Engine Room', playStyle: 'Lockdown Destroyer',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Maximilian Arnold', lastName: 'Arnold', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '10s', club: 'Wolfsburg',
    baseRating: 81, startYear: 2011, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Hannover', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Radja Nainggolan', lastName: 'Nainggolan', nationality: 'Belgium',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM'], era: '00s', club: 'Roma',
    baseRating: 84, startYear: 2006, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Lazio', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Marek Hamsik', lastName: 'Hamsik', nationality: 'Slovakia',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Napoli',
    baseRating: 84, startYear: 2004, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Juventus', 'Roma'], isLegendaryPlayer: false,
  },
  {
    name: 'Josip Ilicic', lastName: 'Ilicic', nationality: 'Slovenia',
    primaryPosition: 'CAM', secondaryPositions: ['ST', 'CF'], era: '10s', club: 'Atalanta',
    baseRating: 82, startYear: 2010, baseTrait: 'Wing Wizard', playStyle: 'Clutch Playmaker',
    rivals: ['Brescia', 'Inter Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Marco Verratti', lastName: 'Verratti', nationality: 'Italy',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '10s', club: 'PSG',
    baseRating: 85, startYear: 2008, baseTrait: 'Tempo Controller', playStyle: 'Passing Maestro',
    rivals: ['Marseille', 'Monaco'], isLegendaryPlayer: false,
  },
  {
    name: 'Blaise Matuidi', lastName: 'Matuidi', nationality: 'France',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'LM'], era: '00s', club: 'PSG',
    baseRating: 83, startYear: 2004, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Marseille', 'Monaco'], isLegendaryPlayer: false,
  },
  // Attackers
  {
    name: 'Iago Aspas', lastName: 'Aspas', nationality: 'Spain',
    primaryPosition: 'ST', secondaryPositions: ['RW', 'CF'], era: '00s', club: 'Celta Vigo',
    baseRating: 83, startYear: 2008, baseTrait: 'Clutch Finisher', playStyle: 'Inside Forward',
    rivals: ['Deportivo', 'Real Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Carlos Vela', lastName: 'Vela', nationality: 'Mexico',
    primaryPosition: 'RW', secondaryPositions: ['LW', 'ST'], era: '00s', club: 'Real Sociedad',
    baseRating: 82, startYear: 2006, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Athletic Bilbao', 'Real Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Florian Thauvin', lastName: 'Thauvin', nationality: 'France',
    primaryPosition: 'RW', secondaryPositions: ['RM', 'LW'], era: '10s', club: 'Marseille',
    baseRating: 81, startYear: 2011, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['PSG', 'Lyon'], isLegendaryPlayer: false,
  },
  {
    name: 'Domenico Berardi', lastName: 'Berardi', nationality: 'Italy',
    primaryPosition: 'RW', secondaryPositions: ['RM', 'ST'], era: '10s', club: 'Sassuolo',
    baseRating: 82, startYear: 2012, baseTrait: 'Clutch Finisher', playStyle: 'Inside Forward',
    rivals: ['Bologna', 'Inter Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Wissam Ben Yedder', lastName: 'Ben Yedder', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '10s', club: 'Monaco',
    baseRating: 82, startYear: 2010, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Nice', 'PSG'], isLegendaryPlayer: false,
  },
  {
    name: 'Mario Gomez', lastName: 'Gomez', nationality: 'Germany',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Bayern Munich',
    baseRating: 83, startYear: 2003, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Dortmund', 'Stuttgart'], isLegendaryPlayer: false,
  },
  {
    name: 'Vedad Ibisevic', lastName: 'Ibisevic', nationality: 'Bosnia and Herzegovina',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Hoffenheim',
    baseRating: 79, startYear: 2004, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Stuttgart', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Antonio Di Natale', lastName: 'Di Natale', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Udinese',
    baseRating: 84, startYear: 1996, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Triestina', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Fabio Quagliarella', lastName: 'Quagliarella', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '00s', club: 'Sampdoria',
    baseRating: 81, startYear: 1999, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Genoa', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Alexandre Lacazette', lastName: 'Lacazette', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '10s', club: 'Lyon',
    baseRating: 83, startYear: 2010, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Saint-Etienne', 'PSG'], isLegendaryPlayer: false,
  },
  {
    name: 'Loic Remy', lastName: 'Remy', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['RW'], era: '00s', club: 'Marseille',
    baseRating: 80, startYear: 2006, baseTrait: 'Clutch Finisher', playStyle: 'Inside Forward',
    rivals: ['PSG', 'Lyon'], isLegendaryPlayer: false,
  },
  // --- LA LIGA ---
  {
    name: 'Jan Oblak', lastName: 'Oblak', nationality: 'Slovenia',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Atletico Madrid',
    baseRating: 90, startYear: 2014, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Real Madrid', 'Barcelona'], isLegendaryPlayer: false,
  },
  {
    name: 'Victor Valdes', lastName: 'Valdes', nationality: 'Spain',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Barcelona',
    baseRating: 87, startYear: 2003, baseTrait: 'Sweeper Keeper', playStyle: 'Sweeper Keeper',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Gerard Pique', lastName: 'Pique', nationality: 'Spain',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Barcelona',
    baseRating: 89, startYear: 2008, baseTrait: 'Ball Playing Defender', playStyle: 'Build-up Leader',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Diego Godin', lastName: 'Godin', nationality: 'Uruguay',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Atletico Madrid',
    baseRating: 89, startYear: 2010, baseTrait: 'Defensive Anchor', playStyle: 'Hard Tackler',
    rivals: ['Real Madrid', 'Barcelona'], isLegendaryPlayer: false,
  },
  {
    name: 'Ronald Koeman', lastName: 'Koeman', nationality: 'Netherlands',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: '90s', club: 'Barcelona',
    baseRating: 91, startYear: 1989, baseTrait: 'Set Piece Specialist', playStyle: 'Libero',
    rivals: ['Real Madrid'], isLegendaryPlayer: true,
  },
  {
    name: 'Roberto Ayala', lastName: 'Ayala', nationality: 'Argentina',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Valencia',
    baseRating: 88, startYear: 2000, baseTrait: 'Air General', playStyle: 'Stopper',
    rivals: ['Real Madrid', 'Levante'], isLegendaryPlayer: false,
  },
  {
    name: 'Dani Carvajal', lastName: 'Carvajal', nationality: 'Spain',
    primaryPosition: 'RB', secondaryPositions: [], era: '10s', club: 'Real Madrid',
    baseRating: 87, startYear: 2013, baseTrait: 'Tenacious Defender', playStyle: 'Wing Back',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Michel Salgado', lastName: 'Salgado', nationality: 'Spain',
    primaryPosition: 'RB', secondaryPositions: [], era: '90s', club: 'Real Madrid',
    baseRating: 85, startYear: 1999, baseTrait: 'Tenacious Defender', playStyle: 'Full Back',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Gavi', lastName: 'Gavi', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: 'Modern', club: 'Barcelona',
    baseRating: 84, startYear: 2021, baseTrait: 'Tenacious Presser', playStyle: 'Box to Box',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Pedri', lastName: 'Pedri', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: 'Modern', club: 'Barcelona',
    baseRating: 86, startYear: 2020, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Jude Bellingham', lastName: 'Bellingham', nationality: 'England',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: 'Modern', club: 'Real Madrid',
    baseRating: 89, startYear: 2023, baseTrait: 'Box to Box Threat', playStyle: 'Box to Box',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Isco', lastName: 'Isco', nationality: 'Spain',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'CM'], era: '10s', club: 'Real Madrid',
    baseRating: 86, startYear: 2013, baseTrait: 'Dribbling Wizard', playStyle: 'Creative Playmaker',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Ivan Rakitic', lastName: 'Rakitic', nationality: 'Croatia',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'CAM'], era: '10s', club: 'Sevilla',
    baseRating: 86, startYear: 2011, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Real Betis', 'Barcelona'], isLegendaryPlayer: false,
  },
  {
    name: 'David Villa', lastName: 'Villa', nationality: 'Spain',
    primaryPosition: 'ST', secondaryPositions: ['LW'], era: '00s', club: 'Valencia',
    baseRating: 89, startYear: 2005, baseTrait: 'Clinical Finisher', playStyle: 'Goal Machine',
    rivals: ['Levante', 'Real Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Rivaldo', lastName: 'Rivaldo', nationality: 'Brazil',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'CF'], era: '90s', club: 'Barcelona',
    baseRating: 91, startYear: 1997, baseTrait: 'Spectacular Scorer', playStyle: 'Inside Forward',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: true,
  },
  // --- SERIE A ---
  {
    name: 'Francesco Toldo', lastName: 'Toldo', nationality: 'Italy',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'Inter Milan',
    baseRating: 87, startYear: 1993, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Julio Cesar', lastName: 'Cesar', nationality: 'Brazil',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Inter Milan',
    baseRating: 89, startYear: 2005, baseTrait: 'Reflex Saver', playStyle: 'Traditional GK',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Alessandro Nesta', lastName: 'Nesta', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'AC Milan',
    baseRating: 92, startYear: 1993, baseTrait: 'Tactical Interceptor', playStyle: 'Stopper',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: true,
  },
  {
    name: 'Giorgio Chiellini', lastName: 'Chiellini', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: ['LB'], era: '00s', club: 'Juventus',
    baseRating: 89, startYear: 2005, baseTrait: 'Physical Warrior', playStyle: 'Hard Tackler',
    rivals: ['Torino', 'Inter Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Leonardo Bonucci', lastName: 'Bonucci', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Juventus',
    baseRating: 88, startYear: 2010, baseTrait: 'Ball Playing Defender', playStyle: 'Build-up Leader',
    rivals: ['Torino', 'Inter Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Franco Baresi', lastName: 'Baresi', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'AC Milan',
    baseRating: 93, startYear: 1977, baseTrait: 'Defensive Anchor', playStyle: 'Libero',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: true,
  },
  {
    name: 'Gianluca Zambrotta', lastName: 'Zambrotta', nationality: 'Italy',
    primaryPosition: 'RB', secondaryPositions: ['LB', 'RM'], era: '00s', club: 'Juventus',
    baseRating: 88, startYear: 1999, baseTrait: 'Tenacious Defender', playStyle: 'Wing Back',
    rivals: ['Torino', 'AC Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Maicon', lastName: 'Maicon', nationality: 'Brazil',
    primaryPosition: 'RB', secondaryPositions: [], era: '00s', club: 'Inter Milan',
    baseRating: 89, startYear: 2006, baseTrait: 'Athletic Runner', playStyle: 'Wing Back',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Giuseppe Bergomi', lastName: 'Bergomi', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: ['RB'], era: '90s', club: 'Inter Milan',
    baseRating: 89, startYear: 1980, baseTrait: 'Defensive Anchor', playStyle: 'Stopper',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: true,
  },
  {
    name: 'Gennaro Gattuso', lastName: 'Gattuso', nationality: 'Italy',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '00s', club: 'AC Milan',
    baseRating: 88, startYear: 1999, baseTrait: 'Tenacious Presser', playStyle: 'Ball Winning Midfielder',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Dejan Stankovic', lastName: 'Stankovic', nationality: 'Serbia',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM'], era: '00s', club: 'Inter Milan',
    baseRating: 86, startYear: 2004, baseTrait: 'Long Shot Specialist', playStyle: 'Box to Box',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Clarence Seedorf', lastName: 'Seedorf', nationality: 'Netherlands',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '90s', club: 'AC Milan',
    baseRating: 90, startYear: 1992, baseTrait: 'Technique Master', playStyle: 'Tempo Controller',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: true,
  },
  {
    name: 'Pavel Nedved', lastName: 'Nedved', nationality: 'Czech Republic',
    primaryPosition: 'LM', secondaryPositions: ['CAM', 'CM'], era: '00s', club: 'Juventus',
    baseRating: 91, startYear: 2001, baseTrait: 'Stamina Machine', playStyle: 'Playmaker',
    rivals: ['Torino', 'Inter Milan'], isLegendaryPlayer: true,
  },
  {
    name: 'Christian Vieri', lastName: 'Vieri', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Inter Milan',
    baseRating: 89, startYear: 1999, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Filippo Inzaghi', lastName: 'Inzaghi', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'AC Milan',
    baseRating: 88, startYear: 1997, baseTrait: 'Off the Ball Master', playStyle: 'Goal Machine',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Lautaro Martinez', lastName: 'Martinez', nationality: 'Argentina',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: 'Modern', club: 'Inter Milan',
    baseRating: 88, startYear: 2018, baseTrait: 'Tenacious Presser', playStyle: 'Goal Machine',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Victor Osimhen', lastName: 'Osimhen', nationality: 'Nigeria',
    primaryPosition: 'ST', secondaryPositions: [], era: 'Modern', club: 'Napoli',
    baseRating: 87, startYear: 2020, baseTrait: 'Athletic Runner', playStyle: 'Goal Machine',
    rivals: ['Juventus', 'Roma'], isLegendaryPlayer: false,
  },
  // --- BUNDESLIGA ---
  {
    name: 'Jens Lehmann', lastName: 'Lehmann', nationality: 'Germany',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'Dortmund',
    baseRating: 86, startYear: 1999, baseTrait: 'Sweeper Keeper', playStyle: 'Sweeper Keeper',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Marc-Andre ter Stegen', lastName: 'ter Stegen', nationality: 'Germany',
    primaryPosition: 'GK', secondaryPositions: [], era: '10s', club: 'Monchengladbach',
    baseRating: 86, startYear: 2010, baseTrait: 'Sweeper Keeper', playStyle: 'Sweeper Keeper',
    rivals: ['Koln', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Mats Hummels', lastName: 'Hummels', nationality: 'Germany',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Dortmund',
    baseRating: 88, startYear: 2008, baseTrait: 'Ball Playing Defender', playStyle: 'Build-up Leader',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Jerome Boateng', lastName: 'Boateng', nationality: 'Germany',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Bayern Munich',
    baseRating: 87, startYear: 2011, baseTrait: 'Ball Playing Defender', playStyle: 'Build-up Leader',
    rivals: ['Dortmund', 'Nurnberg'], isLegendaryPlayer: false,
  },
  {
    name: 'Matthias Sammer', lastName: 'Sammer', nationality: 'Germany',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: '90s', club: 'Dortmund',
    baseRating: 91, startYear: 1993, baseTrait: 'Tactical Interceptor', playStyle: 'Libero',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: true,
  },
  {
    name: 'David Alaba', lastName: 'Alaba', nationality: 'Austria',
    primaryPosition: 'LB', secondaryPositions: ['CB', 'CM'], era: '10s', club: 'Bayern Munich',
    baseRating: 87, startYear: 2010, baseTrait: 'Versatility Master', playStyle: 'Wing Back',
    rivals: ['Dortmund', 'Nurnberg'], isLegendaryPlayer: false,
  },
  {
    name: 'Bixente Lizarazu', lastName: 'Lizarazu', nationality: 'France',
    primaryPosition: 'LB', secondaryPositions: [], era: '90s', club: 'Bayern Munich',
    baseRating: 88, startYear: 1997, baseTrait: 'Tenacious Defender', playStyle: 'Wing Back',
    rivals: ['Dortmund', '1860 Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Joshua Kimmich', lastName: 'Kimmich', nationality: 'Germany',
    primaryPosition: 'CDM', secondaryPositions: ['RB', 'CM'], era: 'Modern', club: 'Bayern Munich',
    baseRating: 88, startYear: 2015, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Dortmund', 'Nurnberg'], isLegendaryPlayer: false,
  },
  {
    name: 'Lothar Matthäus', lastName: 'Matthäus', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CB', 'CDM'], era: '90s', club: 'Bayern Munich',
    baseRating: 93, startYear: 1984, baseTrait: 'Leader', playStyle: 'Box to Box',
    rivals: ['Dortmund', 'Nurnberg'], isLegendaryPlayer: true,
  },
  {
    name: 'Stefan Effenberg', lastName: 'Effenberg', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'Bayern Munich',
    baseRating: 88, startYear: 1990, baseTrait: 'Leader', playStyle: 'Tempo Controller',
    rivals: ['Dortmund', '1860 Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Ilkay Gündogan', lastName: 'Gündogan', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM'], era: '10s', club: 'Dortmund',
    baseRating: 86, startYear: 2011, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Schalke', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Giovane Elber', lastName: 'Elber', nationality: 'Brazil',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Bayern Munich',
    baseRating: 85, startYear: 1997, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Dortmund', '1860 Munich'], isLegendaryPlayer: false,
  },
  {
    name: 'Claudio Pizarro', lastName: 'Pizarro', nationality: 'Peru',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Werder Bremen',
    baseRating: 84, startYear: 1999, baseTrait: 'Target Man', playStyle: 'Goal Machine',
    rivals: ['Hamburg', 'Bayern Munich'], isLegendaryPlayer: false,
  },
  // --- LIGUE 1 ---
  {
    name: 'Gregory Coupet', lastName: 'Coupet', nationality: 'France',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Lyon',
    baseRating: 86, startYear: 1997, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Saint-Etienne', 'Marseille'], isLegendaryPlayer: false,
  },
  {
    name: 'Bernard Lama', lastName: 'Lama', nationality: 'France',
    primaryPosition: 'GK', secondaryPositions: [], era: '90s', club: 'PSG',
    baseRating: 86, startYear: 1992, baseTrait: 'Acrobatic Shot Stopper', playStyle: 'Sweeper Keeper',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: false,
  },
  {
    name: 'Laurent Blanc', lastName: 'Blanc', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'Marseille',
    baseRating: 90, startYear: 1983, baseTrait: 'Tactical Interceptor', playStyle: 'Libero',
    rivals: ['PSG', 'Lyon'], isLegendaryPlayer: true,
  },
  {
    name: 'Cris', lastName: 'Cris', nationality: 'Brazil',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Lyon',
    baseRating: 85, startYear: 2004, baseTrait: 'Defensive Anchor', playStyle: 'Stopper',
    rivals: ['Saint-Etienne', 'Marseille'], isLegendaryPlayer: false,
  },
  {
    name: 'Presnel Kimpembe', lastName: 'Kimpembe', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'PSG',
    baseRating: 83, startYear: 2015, baseTrait: 'Physical Warrior', playStyle: 'Stopper',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: false,
  },
  {
    name: 'Maxwell', lastName: 'Maxwell', nationality: 'Brazil',
    primaryPosition: 'LB', secondaryPositions: [], era: '10s', club: 'PSG',
    baseRating: 84, startYear: 2012, baseTrait: 'Wing Back', playStyle: 'Wing Back',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: false,
  },
  {
    name: 'Juninho Pernambucano', lastName: 'Juninho', nationality: 'Brazil',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '00s', club: 'Lyon',
    baseRating: 90, startYear: 2001, baseTrait: 'Free Kick Master', playStyle: 'Creative Playmaker',
    rivals: ['Saint-Etienne', 'Marseille'], isLegendaryPlayer: true,
  },
  {
    name: 'Corentin Tolisso', lastName: 'Tolisso', nationality: 'France',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '10s', club: 'Lyon',
    baseRating: 82, startYear: 2013, baseTrait: 'Box to Box', playStyle: 'Box to Box',
    rivals: ['Saint-Etienne', 'Marseille'], isLegendaryPlayer: false,
  },
  {
    name: 'Pauleta', lastName: 'Pauleta', nationality: 'Portugal',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'PSG',
    baseRating: 86, startYear: 2003, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: false,
  },
  // --- EXPANSION: 55 additional players (mixed skill levels) ---
  {
    name: 'Dennis Bergkamp', lastName: 'Bergkamp', nationality: 'Netherlands',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '90s', club: 'Arsenal',
    baseRating: 90, startYear: 1995, endYear: 2005, baseTrait: 'Creator Supreme', playStyle: 'Deep Lying Forward',
    rivals: ['Tottenham', 'Manchester United'], isLegendaryPlayer: true,
  },
  {
    name: 'Eric Cantona', lastName: 'Cantona', nationality: 'France',
    primaryPosition: 'CF', secondaryPositions: ['CAM', 'ST'], era: '90s', club: 'Manchester United',
    baseRating: 91, startYear: 1992, endYear: 1996, baseTrait: 'Clutch Finisher', playStyle: 'Deep Lying Forward',
    rivals: ['Liverpool', 'Leeds United'], isLegendaryPlayer: true,
  },
  {
    name: 'Ole Gunnar Solskjaer', lastName: 'Solskjaer', nationality: 'Norway',
    primaryPosition: 'ST', secondaryPositions: ['RW'], era: '90s', club: 'Manchester United',
    baseRating: 83, startYear: 1996, endYear: 2006, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Arsenal', 'Liverpool'], isLegendaryPlayer: false,
  },
  {
    name: 'Dwight Yorke', lastName: 'Yorke', nationality: 'Trinidad and Tobago',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'CAM'], era: '90s', club: 'Aston Villa',
    baseRating: 85, startYear: 1996, endYear: 2006, baseTrait: 'Clutch Finisher', playStyle: 'Inside Forward',
    rivals: ['Birmingham', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Nicolas Anelka', lastName: 'Anelka', nationality: 'France',
    primaryPosition: 'ST', secondaryPositions: ['LW'], era: '90s', club: 'Arsenal',
    baseRating: 85, startYear: 1997, endYear: 2007, baseTrait: 'Athletic Runner', playStyle: 'Explosive Runner',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Emmanuel Petit', lastName: 'Petit', nationality: 'France',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'Arsenal',
    baseRating: 84, startYear: 1997, endYear: 2004, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Tottenham', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Marc Overmars', lastName: 'Overmars', nationality: 'Netherlands',
    primaryPosition: 'LW', secondaryPositions: ['LM'], era: '90s', club: 'Arsenal',
    baseRating: 85, startYear: 1997, endYear: 2003, baseTrait: 'Wing Wizard', playStyle: 'Explosive Runner',
    rivals: ['Tottenham', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Freddie Ljungberg', lastName: 'Ljungberg', nationality: 'Sweden',
    primaryPosition: 'RM', secondaryPositions: ['RW', 'CAM'], era: '90s', club: 'Arsenal',
    baseRating: 83, startYear: 1998, endYear: 2007, baseTrait: 'Box-to-Box Engine', playStyle: 'Inside Forward',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Ray Parlour', lastName: 'Parlour', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['RM'], era: '90s', club: 'Arsenal',
    baseRating: 79, startYear: 1993, endYear: 2003, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Tottenham', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Lee Dixon', lastName: 'Dixon', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: [], era: '90s', club: 'Arsenal',
    baseRating: 80, startYear: 1992, endYear: 2001, baseTrait: 'Tenacious Defender', playStyle: 'Wing Back',
    rivals: ['Tottenham', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Marcel Desailly', lastName: 'Desailly', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: '90s', club: 'AC Milan',
    baseRating: 89, startYear: 1993, endYear: 2003, baseTrait: 'Defensive Anchor', playStyle: 'Stopper',
    rivals: ['Inter Milan', 'Juventus'], isLegendaryPlayer: true,
  },
  {
    name: 'Roberto Di Matteo', lastName: 'Matteo', nationality: 'Italy',
    primaryPosition: 'CM', secondaryPositions: ['CAM'], era: '90s', club: 'Chelsea',
    baseRating: 80, startYear: 1996, endYear: 2001, baseTrait: 'Long Shot Specialist', playStyle: 'Box to Box',
    rivals: ['Arsenal', 'Tottenham'], isLegendaryPlayer: false,
  },
  {
    name: 'Gianluca Vialli', lastName: 'Vialli', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Chelsea',
    baseRating: 88, startYear: 1992, endYear: 1998, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Arsenal', 'Tottenham'], isLegendaryPlayer: false,
  },
  {
    name: 'Steve McManaman', lastName: 'McManaman', nationality: 'England',
    primaryPosition: 'RW', secondaryPositions: ['RM', 'CAM'], era: '90s', club: 'Liverpool',
    baseRating: 84, startYear: 1993, endYear: 2004, baseTrait: 'Dribbling Wizard', playStyle: 'Inside Forward',
    rivals: ['Manchester United', 'Everton'], isLegendaryPlayer: false,
  },
  {
    name: 'Jamie Redknapp', lastName: 'Redknapp', nationality: 'England',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'Liverpool',
    baseRating: 80, startYear: 1993, endYear: 2001, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Manchester United', 'Everton'], isLegendaryPlayer: false,
  },
  {
    name: 'Michael Owen', lastName: 'Owen', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Liverpool',
    baseRating: 89, startYear: 1997, endYear: 2007, baseTrait: 'Athletic Runner', playStyle: 'Goal Machine',
    rivals: ['Manchester United', 'Everton'], isLegendaryPlayer: true,
  },
  {
    name: 'Fernando Torres', lastName: 'Torres', nationality: 'Spain',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '00s', club: 'Liverpool',
    baseRating: 90, startYear: 2007, endYear: 2017, baseTrait: 'Golden Boot Form', playStyle: 'Explosive Runner',
    rivals: ['Manchester United', 'Everton'], isLegendaryPlayer: true,
  },
  {
    name: 'Jermain Defoe', lastName: 'Defoe', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '00s', club: 'Tottenham',
    baseRating: 80, startYear: 2004, endYear: 2012, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Ashley Young', lastName: 'Young', nationality: 'England',
    primaryPosition: 'LW', secondaryPositions: ['RW', 'LM'], era: '00s', club: 'Aston Villa',
    baseRating: 80, startYear: 2007, endYear: 2017, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Birmingham', 'Liverpool'], isLegendaryPlayer: false,
  },
  {
    name: 'Gary Cahill', lastName: 'Cahill', nationality: 'England',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Chelsea',
    baseRating: 83, startYear: 2008, endYear: 2018, baseTrait: 'Physical Warrior', playStyle: 'Stopper',
    rivals: ['Arsenal', 'Tottenham'], isLegendaryPlayer: false,
  },
  {
    name: 'Joe Hart', lastName: 'Hart', nationality: 'England',
    primaryPosition: 'GK', secondaryPositions: [], era: '00s', club: 'Manchester City',
    baseRating: 85, startYear: 2008, endYear: 2018, baseTrait: 'Shot Stopper', playStyle: 'Traditional GK',
    rivals: ['Manchester United', 'Liverpool'], isLegendaryPlayer: false,
  },
  {
    name: 'Robbie Keane', lastName: 'Keane', nationality: 'Ireland',
    primaryPosition: 'ST', secondaryPositions: ['CF', 'CAM'], era: '00s', club: 'Tottenham',
    baseRating: 82, startYear: 2002, endYear: 2012, baseTrait: 'Clutch Finisher', playStyle: 'Inside Forward',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Dimitar Berbatov', lastName: 'Berbatov', nationality: 'Bulgaria',
    primaryPosition: 'CF', secondaryPositions: ['ST', 'CAM'], era: '00s', club: 'Tottenham',
    baseRating: 86, startYear: 2006, endYear: 2013, baseTrait: 'Technique Master', playStyle: 'Deep Lying Forward',
    rivals: ['Arsenal', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Stewart Downing', lastName: 'Downing', nationality: 'England',
    primaryPosition: 'LM', secondaryPositions: ['LW'], era: '00s', club: 'Middlesbrough',
    baseRating: 78, startYear: 2005, endYear: 2015, baseTrait: 'Wing Wizard', playStyle: 'Inside Forward',
    rivals: ['Sunderland', 'Newcastle'], isLegendaryPlayer: false,
  },
  {
    name: 'Mikel Arteta', lastName: 'Arteta', nationality: 'Spain',
    primaryPosition: 'CM', secondaryPositions: ['CDM', 'CAM'], era: '00s', club: 'Everton',
    baseRating: 83, startYear: 2005, endYear: 2015, baseTrait: 'Playmaker', playStyle: 'Tempo Controller',
    rivals: ['Liverpool', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Tim Cahill', lastName: 'Cahill', nationality: 'Australia',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'ST'], era: '00s', club: 'Everton',
    baseRating: 79, startYear: 2004, endYear: 2011, baseTrait: 'Box-to-Box Engine', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Liverpool', 'Manchester United'], isLegendaryPlayer: false,
  },
  {
    name: 'Phil Neville', lastName: 'Neville', nationality: 'England',
    primaryPosition: 'RB', secondaryPositions: ['CM'], era: '90s', club: 'Manchester United',
    baseRating: 77, startYear: 1996, endYear: 2006, baseTrait: 'Tenacious Defender', playStyle: 'Wing Back',
    rivals: ['Liverpool', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Jonny Evans', lastName: 'Evans', nationality: 'Northern Ireland',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Manchester United',
    baseRating: 78, startYear: 2008, endYear: 2018, baseTrait: 'Ball Playing Defender', playStyle: 'Build-up Leader',
    rivals: ['Liverpool', 'Manchester City'], isLegendaryPlayer: false,
  },
  {
    name: 'Per Mertesacker', lastName: 'Mertesacker', nationality: 'Germany',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Arsenal',
    baseRating: 82, startYear: 2008, endYear: 2018, baseTrait: 'Tactical Interceptor', playStyle: 'Stopper',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Laurent Koscielny', lastName: 'Koscielny', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Arsenal',
    baseRating: 84, startYear: 2010, endYear: 2020, baseTrait: 'Ball Playing Defender', playStyle: 'Stopper',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Thomas Vermaelen', lastName: 'Vermaelen', nationality: 'Belgium',
    primaryPosition: 'CB', secondaryPositions: ['LB'], era: '00s', club: 'Arsenal',
    baseRating: 83, startYear: 2009, endYear: 2019, baseTrait: 'Physical Warrior', playStyle: 'Stopper',
    rivals: ['Tottenham', 'Chelsea'], isLegendaryPlayer: false,
  },
  {
    name: 'Edgar Davids', lastName: 'Davids', nationality: 'Netherlands',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'Juventus',
    baseRating: 88, startYear: 1994, endYear: 2002, baseTrait: 'Tenacious Presser', playStyle: 'Ball Winning Midfielder',
    rivals: ['Inter Milan', 'AC Milan'], isLegendaryPlayer: true,
  },
  {
    name: 'Patrick Kluivert', lastName: 'Kluivert', nationality: 'Netherlands',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Barcelona',
    baseRating: 86, startYear: 1994, endYear: 2004, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: false,
  },
  {
    name: 'Hristo Stoichkov', lastName: 'Stoichkov', nationality: 'Bulgaria',
    primaryPosition: 'ST', secondaryPositions: ['LW', 'CF'], era: '90s', club: 'Barcelona',
    baseRating: 90, startYear: 1992, endYear: 1997, baseTrait: 'Spectacular Scorer', playStyle: 'Inside Forward',
    rivals: ['Real Madrid', 'Espanyol'], isLegendaryPlayer: true,
  },
  {
    name: 'Jari Litmanen', lastName: 'Litmanen', nationality: 'Finland',
    primaryPosition: 'CAM', secondaryPositions: ['CF'], era: '90s', club: 'Ajax',
    baseRating: 87, startYear: 1993, endYear: 2001, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Feyenoord', 'PSV'], isLegendaryPlayer: false,
  },
  {
    name: 'Gheorghe Hagi', lastName: 'Hagi', nationality: 'Romania',
    primaryPosition: 'CAM', secondaryPositions: ['LW'], era: '90s', club: 'Barcelona',
    baseRating: 89, startYear: 1994, endYear: 2000, baseTrait: 'Creator Supreme', playStyle: 'Pocket Playmaker',
    rivals: ['Real Madrid', 'Fenerbahce'], isLegendaryPlayer: true,
  },
  {
    name: 'Rui Costa', lastName: 'Costa', nationality: 'Portugal',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: '90s', club: 'Fiorentina',
    baseRating: 88, startYear: 1996, endYear: 2006, baseTrait: 'Creator Supreme', playStyle: 'Playmaker',
    rivals: ['Roma', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Deco', lastName: 'Deco', nationality: 'Portugal',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: '00s', club: 'Porto',
    baseRating: 87, startYear: 2002, endYear: 2009, baseTrait: 'Creator Supreme', playStyle: 'Creative Playmaker',
    rivals: ['Benfica', 'Sporting CP'], isLegendaryPlayer: false,
  },
  {
    name: 'Juan Roman Riquelme', lastName: 'Riquelme', nationality: 'Argentina',
    primaryPosition: 'CAM', secondaryPositions: ['CM'], era: '00s', club: 'Villarreal',
    baseRating: 88, startYear: 2003, endYear: 2012, baseTrait: 'Creator Supreme', playStyle: 'Tempo Controller',
    rivals: ['Valencia', 'Real Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Fabrizio Ravanelli', lastName: 'Ravanelli', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Juventus',
    baseRating: 84, startYear: 1993, endYear: 2000, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Inter Milan', 'AC Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Marco Materazzi', lastName: 'Materazzi', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '00s', club: 'Inter Milan',
    baseRating: 83, startYear: 2001, endYear: 2010, baseTrait: 'Physical Warrior', playStyle: 'Hard Tackler',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Daniele De Rossi', lastName: 'Rossi', nationality: 'Italy',
    primaryPosition: 'CDM', secondaryPositions: ['CM'], era: '00s', club: 'Roma',
    baseRating: 86, startYear: 2003, endYear: 2013, baseTrait: 'Tenacious Presser', playStyle: 'Ball Winning Midfielder',
    rivals: ['Lazio', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'Antonio Conte', lastName: 'Conte', nationality: 'Italy',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '90s', club: 'Juventus',
    baseRating: 83, startYear: 1992, endYear: 2002, baseTrait: 'Engine Room', playStyle: 'Box to Box',
    rivals: ['Inter Milan', 'AC Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Fernando Hierro', lastName: 'Hierro', nationality: 'Spain',
    primaryPosition: 'CB', secondaryPositions: ['CDM'], era: '90s', club: 'Real Madrid',
    baseRating: 87, startYear: 1992, endYear: 2002, baseTrait: 'Ball Playing Defender', playStyle: 'Libero',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Jurgen Klinsmann', lastName: 'Klinsmann', nationality: 'Germany',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Monaco',
    baseRating: 89, startYear: 1992, endYear: 1998, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['PSG', 'Marseille'], isLegendaryPlayer: true,
  },
  {
    name: 'Sami Khedira', lastName: 'Khedira', nationality: 'Germany',
    primaryPosition: 'CM', secondaryPositions: ['CDM'], era: '00s', club: 'Stuttgart',
    baseRating: 85, startYear: 2008, endYear: 2018, baseTrait: 'Engine Room', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Bayern Munich', 'Dortmund'], isLegendaryPlayer: false,
  },
  {
    name: 'Lilian Thuram', lastName: 'Thuram', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: ['RB'], era: '90s', club: 'Monaco',
    baseRating: 87, startYear: 1993, endYear: 2003, baseTrait: 'Defensive Anchor', playStyle: 'Stopper',
    rivals: ['PSG', 'Marseille'], isLegendaryPlayer: true,
  },
  {
    name: 'Raphael Varane', lastName: 'Varane', nationality: 'France',
    primaryPosition: 'CB', secondaryPositions: [], era: '10s', club: 'Real Madrid',
    baseRating: 87, startYear: 2011, endYear: 2021, baseTrait: 'Ball Playing Defender', playStyle: 'Stopper',
    rivals: ['Barcelona', 'Atletico Madrid'], isLegendaryPlayer: false,
  },
  {
    name: 'Paul Pogba', lastName: 'Pogba', nationality: 'France',
    primaryPosition: 'CM', secondaryPositions: ['CAM', 'CDM'], era: '10s', club: 'Juventus',
    baseRating: 88, startYear: 2012, endYear: 2022, baseTrait: 'Box-to-Box Engine', playStyle: 'Box-to-Box Midfielder',
    rivals: ['Inter Milan', 'AC Milan'], isLegendaryPlayer: false,
  },
  {
    name: 'Jay-Jay Okocha', lastName: 'Okocha', nationality: 'Nigeria',
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'CM'], era: '90s', club: 'Fenerbahce',
    baseRating: 86, startYear: 1996, endYear: 2006, baseTrait: 'Dribbling Wizard', playStyle: 'Creative Playmaker',
    rivals: ['Galatasaray', 'Besiktas'], isLegendaryPlayer: false,
  },
  {
    name: 'Nwankwo Kanu', lastName: 'Kanu', nationality: 'Nigeria',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'Inter Milan',
    baseRating: 82, startYear: 1996, endYear: 2006, baseTrait: 'Technique Master', playStyle: 'Deep Lying Forward',
    rivals: ['AC Milan', 'Juventus'], isLegendaryPlayer: false,
  },
  {
    name: 'George Weah', lastName: 'Weah', nationality: 'Liberia',
    primaryPosition: 'ST', secondaryPositions: ['CF'], era: '90s', club: 'PSG',
    baseRating: 90, startYear: 1992, endYear: 2000, baseTrait: 'Athletic Runner', playStyle: 'Inside Forward',
    rivals: ['Marseille', 'Lyon'], isLegendaryPlayer: true,
  },
  {
    name: 'Paolo Di Canio', lastName: 'Canio', nationality: 'Italy',
    primaryPosition: 'ST', secondaryPositions: ['CAM', 'CF'], era: '90s', club: 'Celtic',
    baseRating: 83, startYear: 1996, endYear: 2004, baseTrait: 'Spectacular Scorer', playStyle: 'Inside Forward',
    rivals: ['Rangers', 'Arsenal'], isLegendaryPlayer: false,
  },
  {
    name: 'Craig Bellamy', lastName: 'Bellamy', nationality: 'Wales',
    primaryPosition: 'ST', secondaryPositions: ['RW'], era: '00s', club: 'Newcastle',
    baseRating: 80, startYear: 2002, endYear: 2010, baseTrait: 'Athletic Runner', playStyle: 'Explosive Runner',
    rivals: ['Sunderland', 'Liverpool'], isLegendaryPlayer: false,
  },
  {
    name: 'Kevin Phillips', lastName: 'Phillips', nationality: 'England',
    primaryPosition: 'ST', secondaryPositions: [], era: '90s', club: 'Sunderland',
    baseRating: 80, startYear: 1999, endYear: 2006, baseTrait: 'Clutch Finisher', playStyle: 'Goal Machine',
    rivals: ['Newcastle', 'Middlesbrough'], isLegendaryPlayer: false,
  },
];

function getLeagueForClub(clubName: string): string {
  const c = clubName.toLowerCase();
  if (
    c.includes('real madrid') ||
    c.includes('barcelona') ||
    c.includes('atletico') ||
    c.includes('sevilla') ||
    c.includes('valencia') ||
    c.includes('villarreal') ||
    c.includes('real sociedad') ||
    c.includes('betis') ||
    c.includes('getafe') ||
    c.includes('celta vigo') ||
    c.includes('deportivo') ||
    c.includes('zaragoza') ||
    c.includes('mallorca') ||
    c.includes('malaga') ||
    c.includes('almeria')
  ) {
    return 'La Liga';
  }
  if (
    c.includes('bayern munich') ||
    c.includes('dortmund') ||
    c.includes('leverkusen') ||
    c.includes('leipzig') ||
    c.includes('gladbach') ||
    c.includes('schalke') ||
    c.includes('frankfurt') ||
    c.includes('wolfsburg') ||
    c.includes('stuttgart') ||
    c.includes('werder bremen') ||
    c.includes('fc koln') ||
    c.includes('mainz') ||
    c.includes('bochum') ||
    c.includes('hertha bsc') ||
    c.includes('bremen') ||
    c.includes('union berlin') ||
    c.includes('kaiserslautern') ||
    c.includes('hamburg') ||
    c.includes('hoffenheim')
  ) {
    return 'Bundesliga';
  }
  if (
    c.includes('juventus') ||
    c.includes('ac milan') ||
    c.includes('inter milan') ||
    c.includes('roma') ||
    c.includes('napoli') ||
    c.includes('lazio') ||
    c.includes('fiorentina') ||
    c.includes('atalanta') ||
    c.includes('parma') ||
    c.includes('brescia') ||
    c.includes('bologna') ||
    c.includes('udinese') ||
    c.includes('sampdoria') ||
    c.includes('sassuolo') ||
    c.includes('cagliari') ||
    c.includes('chievo') ||
    c.includes('palermo') ||
    c.includes('genoa')
  ) {
    return 'Serie A';
  }
  if (
    c.includes('psg') ||
    c.includes('marseille') ||
    c.includes('lyon') ||
    c.includes('monaco') ||
    c.includes('lille') ||
    c.includes('nice') ||
    c.includes('rennes') ||
    c.includes('lens') ||
    c.includes('bordeaux') ||
    c.includes('auxerre') ||
    c.includes('saint-etienne') ||
    c.includes('toulouse')
  ) {
    return 'Ligue 1';
  }
  if (
    c.includes('inter miami') ||
    c.includes('la galaxy') ||
    c.includes('lafc') ||
    c.includes('nycfc') ||
    c.includes('dc united') ||
    c.includes('chicago fire') ||
    c.includes('montreal impact') ||
    c.includes('new york red bulls') ||
    c.includes('orlando city')
  ) {
    return 'MLS';
  }
  if (c.includes('ajax') || c.includes('psv') || c.includes('feyenoord')) {
    return 'Eredivisie';
  }
  if (c.includes('sporting cp') || c.includes('benfica') || c.includes('porto')) {
    return 'Primeira Liga';
  }
  if (c.includes('galatasaray') || c.includes('fenerbahce') || c.includes('besiktas')) {
    return 'Super Lig';
  }
  if (
    c.includes('al-ahli') ||
    c.includes('al-nassr') ||
    c.includes('al-hilal') ||
    c.includes('al-ittihad') ||
    c.includes('al-ettifaq') ||
    c.includes('al-shabab')
  ) {
    return 'Saudi Pro League';
  }
  if (c.includes('celtic') || c.includes('rangers')) {
    return 'Scottish Premiership';
  }
  if (
    c.includes('flamengo') ||
    c.includes('santos') ||
    c.includes('sao paulo') ||
    c.includes('corinthians') ||
    c.includes('cruzeiro') ||
    c.includes('fluminense') ||
    c.includes('gremio')
  ) {
    return 'Brasileirao';
  }
  if (c.includes('torino')) return 'Serie A';
  if (c.includes('vissel kobe')) return 'J1 League';
  if (c.includes('boca juniors')) return 'Argentine Primera';
  // Default to Premier League
  return 'Premier League';
}

// Helper: Formats starting year to visual label (e.g. 2003/04)
function formatSeason(start: number): string {
  const end = start + 1;
  const startStr = start.toString();
  const endStr = (end % 100).toString().padStart(2, '0');
  return `${startStr}/${endStr}`;
}

// Helper: Career stage ratings modifications
const careerStages = [
  { stepYear: 0, ratingOffset: -7, rarity: 'solid' as Rarity, trait: 'Chaos Merchant', bio: 'Promising breakthrough season showcasing raw potential.' },
  { stepYear: 1, ratingOffset: -5, rarity: 'solid' as Rarity, trait: 'Chaos Merchant', bio: 'Exciting rising star campaign showing rapid progression.' },
  { stepYear: 2, ratingOffset: -3, rarity: 'rare' as Rarity, trait: '', bio: 'Established key starter with consistent first-team performances.' },
  { stepYear: 3, ratingOffset: 0, rarity: 'elite' as Rarity, trait: '', bio: 'A dominant prime campaign showcasing top tier positional quality.' },
  { stepYear: 4, ratingOffset: 3, rarity: 'legend' as Rarity, trait: 'Golden Boot Form', bio: 'An iconic, career-defining season entering league folklore.' },
  { stepYear: 5, ratingOffset: 2, rarity: 'elite' as Rarity, trait: '', bio: 'An exceptional season maintaining elite performance levels at the top.' },
  { stepYear: 6, ratingOffset: 1, rarity: 'elite' as Rarity, trait: '', bio: 'Blending peak athletic skills with experience to dominate opponents.' },
  { stepYear: 7, ratingOffset: -1, rarity: 'rare' as Rarity, trait: '', bio: 'Highly intelligent positional play compensating for physical changes.' },
  { stepYear: 8, ratingOffset: -3, rarity: 'rare' as Rarity, trait: 'Leadership', bio: 'Crucial veteran leader providing tactical wisdom and stability.' },
  { stepYear: 10, ratingOffset: -6, rarity: 'cult' as Rarity, trait: 'Luxury Player', bio: 'Farewell campaign showing nostalgic flashes of standard brilliance.' },
];

// Transfer timelines for the expansion players: year -> club (undefined keeps the base club)
const careerPaths: Record<string, (y: number) => string | undefined> = {
  'Eric Cantona': (y) => y === 1992 ? 'Leeds United' : undefined,
  'Dwight Yorke': (y) => y >= 1998 && y <= 2001 ? 'Manchester United' : (y === 2002 || y === 2003) ? 'Blackburn' : (y >= 2004 && y <= 2005) ? 'Birmingham' : y >= 2006 ? 'Sunderland' : undefined,
  'Nicolas Anelka': (y) => y === 1999 ? 'Real Madrid' : (y === 2000 || y === 2001) ? 'PSG' : (y >= 2002 && y <= 2004) ? 'Manchester City' : y === 2005 ? 'Fenerbahce' : y >= 2006 ? 'Bolton' : undefined,
  'Emmanuel Petit': (y) => y === 2000 ? 'Barcelona' : y >= 2001 ? 'Chelsea' : undefined,
  'Marc Overmars': (y) => y >= 2000 ? 'Barcelona' : undefined,
  'Marcel Desailly': (y) => y >= 1998 ? 'Chelsea' : undefined,
  'Gianluca Vialli': (y) => y < 1996 ? 'Juventus' : undefined,
  'Steve McManaman': (y) => (y >= 1999 && y < 2003) ? 'Real Madrid' : y >= 2003 ? 'Manchester City' : undefined,
  'Michael Owen': (y) => y === 2004 ? 'Real Madrid' : y >= 2005 ? 'Newcastle' : undefined,
  'Fernando Torres': (y) => (y >= 2011 && y <= 2013) ? 'Chelsea' : y === 2014 ? 'AC Milan' : y >= 2015 ? 'Atletico Madrid' : undefined,
  'Jermain Defoe': (y) => y === 2008 ? 'Portsmouth' : undefined,
  'Ashley Young': (y) => y >= 2011 ? 'Manchester United' : undefined,
  'Gary Cahill': (y) => y < 2012 ? 'Bolton' : undefined,
  'Joe Hart': (y) => y === 2016 ? 'Torino' : y >= 2018 ? 'Burnley' : undefined,
  'Robbie Keane': (y) => y === 2008 ? 'Liverpool' : y >= 2012 ? 'LA Galaxy' : undefined,
  'Dimitar Berbatov': (y) => (y >= 2008 && y <= 2011) ? 'Manchester United' : y >= 2012 ? 'Fulham' : undefined,
  'Stewart Downing': (y) => (y === 2009 || y === 2010) ? 'Aston Villa' : (y === 2011 || y === 2012) ? 'Liverpool' : y === 2013 ? 'West Ham' : undefined,
  'Mikel Arteta': (y) => y >= 2011 ? 'Arsenal' : undefined,
  'Phil Neville': (y) => y >= 2005 ? 'Everton' : undefined,
  'Jonny Evans': (y) => (y >= 2015 && y <= 2017) ? 'West Brom' : y >= 2018 ? 'Leicester' : undefined,
  'Per Mertesacker': (y) => y < 2011 ? 'Werder Bremen' : undefined,
  'Laurent Koscielny': (y) => y >= 2019 ? 'Bordeaux' : undefined,
  'Thomas Vermaelen': (y) => y >= 2019 ? 'Vissel Kobe' : y >= 2014 ? 'Barcelona' : undefined,
  'Edgar Davids': (y) => y < 1996 ? 'Ajax' : y === 1996 ? 'AC Milan' : undefined,
  'Patrick Kluivert': (y) => y < 1997 ? 'Ajax' : y === 1997 ? 'AC Milan' : y >= 2004 ? 'Newcastle' : undefined,
  'Hristo Stoichkov': (y) => y === 1995 ? 'Parma' : undefined,
  'Jari Litmanen': (y) => (y === 1999 || y === 2000) ? 'Barcelona' : y >= 2001 ? 'Liverpool' : undefined,
  'Gheorghe Hagi': (y) => y >= 1996 ? 'Galatasaray' : undefined,
  'Rui Costa': (y) => (y >= 2001 && y < 2006) ? 'AC Milan' : y >= 2006 ? 'Benfica' : undefined,
  'Deco': (y) => (y >= 2004 && y <= 2007) ? 'Barcelona' : y >= 2008 ? 'Chelsea' : undefined,
  'Juan Roman Riquelme': (y) => y >= 2007 ? 'Boca Juniors' : undefined,
  'Fabrizio Ravanelli': (y) => y === 1996 ? 'Middlesbrough' : y === 1997 ? 'Marseille' : y >= 1998 ? 'Lazio' : undefined,
  'Jurgen Klinsmann': (y) => y === 1994 || y === 1998 ? 'Tottenham' : (y === 1995 || y === 1996) ? 'Bayern Munich' : y === 1997 ? 'Sampdoria' : undefined,
  'Sami Khedira': (y) => (y >= 2010 && y <= 2014) ? 'Real Madrid' : y >= 2015 ? 'Juventus' : undefined,
  'Lilian Thuram': (y) => (y >= 1996 && y <= 2000) ? 'Parma' : y >= 2001 ? 'Juventus' : undefined,
  'Raphael Varane': (y) => y >= 2021 ? 'Manchester United' : undefined,
  'Paul Pogba': (y) => (y >= 2016 && y <= 2020) ? 'Manchester United' : undefined,
  'Jay-Jay Okocha': (y) => (y >= 1998 && y <= 2001) ? 'PSG' : y >= 2002 ? 'Bolton' : undefined,
  'Nwankwo Kanu': (y) => (y >= 1999 && y <= 2003) ? 'Arsenal' : y === 2004 ? 'West Brom' : y >= 2006 ? 'Portsmouth' : undefined,
  'George Weah': (y) => (y >= 1995 && y <= 1999) ? 'AC Milan' : y >= 2000 ? 'Manchester City' : undefined,
  'Paolo Di Canio': (y) => (y === 1997 || y === 1998) ? 'Sheffield Wednesday' : (y >= 1999 && y <= 2002) ? 'West Ham' : y >= 2003 ? 'Charlton' : undefined,
  'Craig Bellamy': (y) => y === 2005 ? 'Blackburn' : y === 2006 ? 'Liverpool' : y === 2007 ? 'West Ham' : y >= 2008 ? 'Manchester City' : undefined,
  'Kevin Phillips': (y) => (y === 2003 || y === 2004) ? 'Southampton' : y === 2005 ? 'Aston Villa' : y === 2006 ? 'West Brom' : undefined,
};

// Known real-world profiles. Values are pre-scale baselines (they are multiplied by rating/84),
// so a value of 80 on a 90-rated card ends up around 86. Unlisted players use the position defaults.
type StatOverride = Partial<Record<
  'pace' | 'defence' | 'defending' | 'passing' | 'creativity' | 'finishing' | 'dribbling' | 'physical' | 'aerial',
  number
>>;
const statOverrides: Record<string, StatOverride> = {
  // Playmaking full-backs: elite passing and crossing, modest pace and defending
  'Trent Alexander-Arnold': { pace: 72, defence: 64, defending: 60, passing: 94, creativity: 90 },
  'Joao Cancelo': { pace: 78, defence: 68, defending: 66, passing: 88, dribbling: 84 },
  'Dani Alves': { pace: 80, defence: 70, defending: 68, passing: 86, creativity: 86 },
  'Roberto Carlos': { pace: 86, defence: 70, defending: 66, finishing: 70 },
  'Andy Robertson': { pace: 82, defence: 74, defending: 72, passing: 84 },
  'Kyle Walker': { pace: 92, defence: 82, defending: 84 },
  'Cafu': { pace: 84, defence: 76 },
  'Maicon': { pace: 86, defence: 76 },
  'Patrice Evra': { pace: 82, defence: 76 },
  'Ashley Cole': { pace: 84, defence: 86, defending: 88 },
  'Paolo Maldini': { pace: 78, defence: 94, defending: 95 },
  'Philipp Lahm': { pace: 78, defence: 84, defending: 84, passing: 84 },
  // Slower but intelligent defenders
  'Jamie Carragher': { pace: 62, defending: 92, aerial: 86 },
  'John Terry': { pace: 62, defending: 92, aerial: 90 },
  'Nemanja Vidic': { pace: 66, defending: 92, aerial: 92, physical: 90 },
  'Rio Ferdinand': { pace: 74, defending: 90, passing: 78 },
  'Sergio Ramos': { pace: 76, defending: 90, aerial: 90 },
  'Ledley King': { pace: 74, defending: 90 },
  'Jaap Stam': { pace: 72, defending: 92, physical: 94 },
  'Virgil van Dijk': { pace: 74, defending: 92, aerial: 92 },
  'Franco Baresi': { pace: 68, defending: 96 },
  'Sami Hyypia': { pace: 56, defending: 88, aerial: 94 },
  'Wes Morgan': { pace: 58, defending: 84, aerial: 90 },
  'Ryan Shawcross': { pace: 62, defending: 82, aerial: 86 },
  // Quick forwards and wingers
  'Kylian Mbappe': { pace: 98, dribbling: 92, finishing: 90 },
  'Thierry Henry': { pace: 94, finishing: 92, dribbling: 90 },
  'Erling Haaland': { pace: 91, finishing: 95, physical: 95, aerial: 86 },
  'Mohamed Salah': { pace: 92, finishing: 90, dribbling: 90 },
  'Sadio Mane': { pace: 92, dribbling: 90 },
  'Jamie Vardy': { pace: 94, finishing: 86, physical: 78 },
  'Gareth Bale': { pace: 95, physical: 86 },
  'Arjen Robben': { pace: 93, dribbling: 94 },
  'Wilfried Zaha': { pace: 90, dribbling: 90 },
  'Cristiano Ronaldo': { pace: 92, finishing: 94, aerial: 90 },
  'Ronaldo Nazario': { pace: 92, finishing: 96, dribbling: 96 },
  'Neymar Jr': { pace: 90, dribbling: 96 },
  'Lionel Messi': { pace: 86, dribbling: 98, finishing: 94, physical: 66 },
  'Son Heung-min': { pace: 90, finishing: 88 },
  'Sergio Aguero': { pace: 84, finishing: 94 },
  'Victor Osimhen': { pace: 92, aerial: 88 },
  'Luis Suarez': { pace: 82, finishing: 93, dribbling: 90 },
  // Slower creators and target men
  'Andrea Pirlo': { pace: 52, passing: 98, creativity: 94, defending: 58 },
  'Xavi Hernandez': { pace: 60, passing: 98, creativity: 92 },
  'Paul Scholes': { pace: 62, passing: 94, defending: 62 },
  'Michael Carrick': { pace: 60, passing: 90, defending: 78 },
  'Luka Modric': { pace: 72, passing: 92, dribbling: 90 },
  'Toni Kroos': { pace: 56, passing: 96, creativity: 90 },
  'Xabi Alonso': { pace: 56, passing: 95, defending: 76 },
  'Peter Crouch': { pace: 58, aerial: 96, finishing: 82 },
  'Didier Drogba': { pace: 80, aerial: 90, physical: 96 },
  'Alan Shearer': { pace: 74, finishing: 95, aerial: 92 },
  'Harry Kane': { pace: 68, finishing: 94, passing: 86, aerial: 82 },
  'Zlatan Ibrahimovic': { pace: 74, aerial: 90, physical: 92 },
  'Miroslav Klose': { pace: 74, aerial: 94 },
  // Set-piece and range passers
  'David Beckham': { pace: 74, passing: 94, creativity: 92 },
  'Kevin De Bruyne': { pace: 76, passing: 96, creativity: 96 },
  'Mesut Ozil': { pace: 68, passing: 94, creativity: 98 },
  'Dimitri Payet': { pace: 70, passing: 90, creativity: 90 },
  'James Ward-Prowse': { pace: 64, passing: 90, creativity: 86 },
  'Christian Eriksen': { pace: 66, passing: 92, creativity: 92 },
  // Expansion profiles
  'Dennis Bergkamp': { pace: 70, passing: 94, creativity: 94, finishing: 90 },
  'Eric Cantona': { pace: 72, passing: 88, creativity: 90, finishing: 90 },
  'Ole Gunnar Solskjaer': { pace: 82, finishing: 88 },
  'Dwight Yorke': { pace: 82, finishing: 86 },
  'Nicolas Anelka': { pace: 92, finishing: 86 },
  'Marc Overmars': { pace: 95, dribbling: 90 },
  'Freddie Ljungberg': { pace: 86 },
  'Ray Parlour': { pace: 72, defending: 66 },
  'Lee Dixon': { pace: 76, defending: 84 },
  'Marcel Desailly': { pace: 78, defending: 92, physical: 94 },
  'Gianluca Vialli': { pace: 78, finishing: 90 },
  'Steve McManaman': { pace: 82, dribbling: 90 },
  'Michael Owen': { pace: 95, finishing: 92 },
  'Fernando Torres': { pace: 92, finishing: 92 },
  'Jermain Defoe': { pace: 88, finishing: 88 },
  'Ashley Young': { pace: 86, dribbling: 86 },
  'Gary Cahill': { pace: 64, defending: 88, aerial: 88 },
  'Robbie Keane': { pace: 80, finishing: 88 },
  'Dimitar Berbatov': { pace: 64, passing: 88, creativity: 88, finishing: 88 },
  'Mikel Arteta': { pace: 60, passing: 90, defending: 74 },
  'Tim Cahill': { pace: 72, aerial: 92 },
  'Jonny Evans': { pace: 66, defending: 86, aerial: 86 },
  'Per Mertesacker': { pace: 40, defending: 90, aerial: 92 },
  'Laurent Koscielny': { pace: 76, defending: 90 },
  'Thomas Vermaelen': { pace: 70, defending: 88, aerial: 88 },
  'Edgar Davids': { pace: 80, defending: 88, physical: 94 },
  'Patrick Kluivert': { pace: 80, finishing: 90, aerial: 86 },
  'Hristo Stoichkov': { pace: 84, finishing: 92 },
  'Jari Litmanen': { pace: 70, passing: 92, creativity: 94 },
  'Gheorghe Hagi': { pace: 64, passing: 94, creativity: 96, finishing: 86 },
  'Rui Costa': { pace: 68, passing: 94, creativity: 94 },
  'Deco': { pace: 72, passing: 92, creativity: 94, dribbling: 90 },
  'Juan Roman Riquelme': { pace: 50, passing: 96, creativity: 97 },
  'Fabrizio Ravanelli': { pace: 76, finishing: 88 },
  'Marco Materazzi': { pace: 62, defending: 88, aerial: 90, physical: 94 },
  'Daniele De Rossi': { pace: 70, defending: 90, passing: 86 },
  'Antonio Conte': { pace: 74, defending: 84 },
  'Fernando Hierro': { pace: 66, defending: 92, passing: 88 },
  'Jurgen Klinsmann': { pace: 84, finishing: 92, aerial: 88 },
  'Sami Khedira': { pace: 74, defending: 82 },
  'Lilian Thuram': { pace: 82, defending: 92 },
  'Raphael Varane': { pace: 84, defending: 92, aerial: 90 },
  'Paul Pogba': { pace: 78, passing: 88, physical: 92 },
  'Jay-Jay Okocha': { pace: 78, dribbling: 96, creativity: 94 },
  'Nwankwo Kanu': { pace: 76, dribbling: 88 },
  'George Weah': { pace: 94, finishing: 92, dribbling: 92 },
  'Paolo Di Canio': { pace: 78, finishing: 88, dribbling: 90 },
  'Craig Bellamy': { pace: 92, finishing: 80 },
  'Kevin Phillips': { pace: 78, finishing: 90 },
};


// Dynamically generate the 800+ player seasons database
function generatePlayersDatabase(): Player[] {
  const allPlayerSeasons: Player[] = [];

  playerBases.forEach((base, playerIdx) => {
    careerStages.forEach((stage, stageIdx) => {
      const year = base.startYear + stage.stepYear;
      
      // Prevent generating future seasons beyond 2026/27
      if (year > 2026) return;
      if (base.endYear !== undefined && year > base.endYear) return;

      const seasonLabel = formatSeason(year);
      const rating = Math.min(99, Math.max(70, base.baseRating + stage.ratingOffset));
      
      // Determine era based on season year
      let era: '90s' | '00s' | '10s' | 'Modern' = base.era;
      if (year >= 2018) era = 'Modern';
      else if (year >= 2010) era = '10s';
      else if (year >= 2000) era = '00s';
      else era = '90s';

      // Setup dynamic secondary positions for maximum versatility
      const secondaryPositions = [...base.secondaryPositions];
      
      // LW <-> LM compatibility
      if (base.primaryPosition === 'LW' && !secondaryPositions.includes('LM')) {
        secondaryPositions.push('LM');
      }
      if (base.primaryPosition === 'LM' && !secondaryPositions.includes('LW')) {
        secondaryPositions.push('LW');
      }
      // RW <-> RM compatibility
      if (base.primaryPosition === 'RW' && !secondaryPositions.includes('RM')) {
        secondaryPositions.push('RM');
      }
      if (base.primaryPosition === 'RM' && !secondaryPositions.includes('RW')) {
        secondaryPositions.push('RW');
      }
      // ST <-> CF compatibility
      if (base.primaryPosition === 'ST' && !secondaryPositions.includes('CF')) {
        secondaryPositions.push('CF');
      }
      if (base.primaryPosition === 'CF' && !secondaryPositions.includes('ST')) {
        secondaryPositions.push('ST');
      }
      // CM <-> CAM/CDM compatibility
      if (base.primaryPosition === 'CM') {
        if (!secondaryPositions.includes('CAM')) secondaryPositions.push('CAM');
        if (!secondaryPositions.includes('CDM')) secondaryPositions.push('CDM');
      }
      if (base.primaryPosition === 'CAM' && !secondaryPositions.includes('CM')) {
        secondaryPositions.push('CM');
      }
      if (base.primaryPosition === 'CDM' && !secondaryPositions.includes('CM')) {
        secondaryPositions.push('CM');
      }

      // Check if secondary positions list implies the other winger/midfield position
      if (secondaryPositions.includes('LW') && !secondaryPositions.includes('LM')) {
        secondaryPositions.push('LM');
      }
      if (secondaryPositions.includes('LM') && !secondaryPositions.includes('LW')) {
        secondaryPositions.push('LW');
      }
      if (secondaryPositions.includes('RW') && !secondaryPositions.includes('RM')) {
        secondaryPositions.push('RM');
      }
      if (secondaryPositions.includes('RM') && !secondaryPositions.includes('RW')) {
        secondaryPositions.push('RW');
      }

      // Override club transfers historically
      let club = base.club;
      if (base.name === 'Alan Shearer' && year < 1996) {
        club = 'Blackburn';
      } else if (base.name === 'Wayne Rooney') {
        if (year <= 2003) club = 'Everton';
        else if (year >= 2017 && year < 2018) club = 'Everton';
        else if (year >= 2018) club = 'DC United';
      } else if (base.name === 'Thierry Henry') {
        if (year >= 2007 && year < 2010) club = 'Barcelona';
        else if (year >= 2010) club = 'New York Red Bulls';
      } else if (base.name === 'Robin van Persie') {
        if (year < 2004) club = 'Feyenoord';
        else if (year >= 2012 && year < 2015) club = 'Manchester United';
        else if (year >= 2015) club = 'Fenerbahce';
      } else if (base.name === 'Sol Campbell') {
        if (year < 2001) club = 'Tottenham';
        else if (year > 2006) club = 'Portsmouth';
      } else if (base.name === 'Cole Palmer' && year < 2023) {
        club = 'Manchester City';
      } else if (base.name === 'Frank Lampard') {
        if (year < 2001) club = 'West Ham';
        else if (year === 2014) club = 'Manchester City';
        else if (year >= 2015) club = 'NYCFC';
      } else if (base.name === 'Gareth Bale') {
        if (year >= 2013 && year < 2022) club = 'Real Madrid';
        else if (year >= 2022) club = 'LAFC';
      } else if (base.name === 'Alexis Sanchez') {
        if (year < 2014) club = 'Barcelona';
        else if (year >= 2014 && year < 2018) club = 'Arsenal';
        else if (year >= 2018 && year < 2019) club = 'Manchester United';
        else if (year >= 2019 && year < 2022) club = 'Inter Milan';
        else if (year >= 2022) club = 'Marseille';
      } else if (base.name === "N'Golo Kante") {
        if (year <= 2015) club = 'Leicester';
        else if (year >= 2023) club = 'Al-Ittihad';
      } else if (base.name === 'Cristiano Ronaldo') {
        if (year >= 2009 && year < 2018) club = 'Real Madrid';
        else if (year >= 2018 && year < 2021) club = 'Juventus';
        else if (year >= 2021 && year < 2023) club = 'Manchester United';
        else if (year >= 2023) club = 'Al-Nassr';
      } else if (base.name === 'Lionel Messi') {
        if (year >= 2021 && year < 2023) club = 'PSG';
        else if (year >= 2023) club = 'Inter Miami';
      } else if (base.name === 'Zlatan Ibrahimovic') {
        if (year >= 2020) club = 'AC Milan';
        else if (year >= 2018 && year <= 2019) club = 'LA Galaxy';
        else if (year >= 2016 && year <= 2017) club = 'Manchester United';
        else if (year >= 2012 && year < 2016) club = 'PSG';
        else if (year >= 2010 && year < 2012) club = 'AC Milan';
        else if (year === 2009) club = 'Barcelona';
        else if (year >= 2006 && year < 2009) club = 'Inter Milan';
        else if (year >= 2004 && year < 2006) club = 'Juventus';
        else if (year < 2004) club = 'Ajax';
      } else if (base.name === 'Zinedine Zidane') {
        if (year < 1996) club = 'Bordeaux';
        else if (year < 2001) club = 'Juventus';
        else club = 'Real Madrid';
      } else if (base.name === 'Ronaldinho Gaucho') {
        if (year < 2003) club = 'PSG';
        else if (year >= 2003 && year < 2008) club = 'Barcelona';
        else if (year >= 2008 && year < 2011) club = 'AC Milan';
        else if (year >= 2011) club = 'Flamengo';
      } else if (base.name === 'Kaka') {
        if (year >= 2009 && year < 2013) club = 'Real Madrid';
        else if (year === 2013) club = 'AC Milan';
        else if (year >= 2014) club = 'Orlando City';
      } else if (base.name === 'Sergio Ramos') {
        if (year < 2005) club = 'Sevilla';
        else if (year >= 2021 && year < 2023) club = 'PSG';
        else if (year >= 2023) club = 'Sevilla';
      } else if (base.name === 'Fabio Cannavaro') {
        if (year >= 2006 && year < 2009) club = 'Real Madrid';
        else if (year >= 2004 && year < 2006) club = 'Juventus';
        else if (year === 2009) club = 'Juventus';
        else if (year >= 2002 && year < 2004) club = 'Inter Milan';
        else if (year < 2002) club = 'Parma';
      } else if (base.name === 'Ronaldo Nazario') {
        if (year >= 2007) club = 'AC Milan';
        else if (year >= 2002 && year < 2007) club = 'Real Madrid';
        else if (year >= 1997 && year < 2002) club = 'Inter Milan';
        else if (year >= 1996 && year < 1997) club = 'Barcelona';
        else if (year >= 1994 && year < 1996) club = 'PSV';
        else if (year < 1994) club = 'Cruzeiro';
      } else if (base.name === 'Neymar Jr') {
        if (year < 2013) club = 'Santos';
        else if (year >= 2013 && year < 2017) club = 'Barcelona';
        else if (year >= 2017 && year < 2023) club = 'PSG';
        else if (year >= 2023) club = 'Al-Hilal';
      } else if (base.name === 'Robert Lewandowski') {
        if (year < 2014) club = 'Dortmund';
        else if (year >= 2014 && year < 2022) club = 'Bayern Munich';
        else if (year >= 2022) club = 'Barcelona';
      } else if (base.name === 'Karim Benzema') {
        if (year < 2009) club = 'Lyon';
        else if (year >= 2009 && year < 2023) club = 'Real Madrid';
        else if (year >= 2023) club = 'Al-Ittihad';
      } else if (base.name === 'Luis Figo') {
        if (year < 1995) club = 'Sporting CP';
        else if (year >= 1995 && year < 2000) club = 'Barcelona';
        else if (year >= 2000 && year < 2005) club = 'Real Madrid';
        else if (year >= 2005) club = 'Inter Milan';
      } else if (base.name === "Samuel Eto'o") {
        if (year < 2004) club = 'Mallorca';
        else if (year >= 2004 && year < 2009) club = 'Barcelona';
        else if (year >= 2009 && year <= 2011) club = 'Inter Milan';
        else if (year >= 2013 && year <= 2014) club = 'Chelsea';
        else if (year > 2014) club = 'Everton';
      } else if (base.name === 'Gabriel Batistuta') {
        if (year < 2000) club = 'Fiorentina';
        else if (year >= 2000 && year < 2003) club = 'Roma';
        else if (year >= 2003) club = 'Inter Milan';
      } else if (base.name === 'Roberto Baggio') {
        if (year < 1995) club = 'Juventus';
        else if (year >= 1995 && year < 1997) club = 'AC Milan';
        else if (year >= 1997 && year < 1998) club = 'Bologna';
        else if (year >= 1998 && year < 2000) club = 'Inter Milan';
        else if (year >= 2000) club = 'Brescia';
      } else if (base.name === 'Andrea Pirlo') {
        if (year < 2001) club = 'Inter Milan';
        else if (year >= 2001 && year < 2011) club = 'AC Milan';
        else if (year >= 2011 && year < 2015) club = 'Juventus';
        else if (year >= 2015) club = 'NYCFC';
      } else if (base.name === 'Toni Kroos') {
        if (year < 2014) club = 'Bayern Munich';
        else club = 'Real Madrid';
      } else if (base.name === 'Luka Modric') {
        if (year < 2012) club = 'Tottenham';
        else club = 'Real Madrid';
      } else if (base.name === 'Philipp Lahm') {
        if (year >= 2003 && year < 2005) club = 'Stuttgart';
        else club = 'Bayern Munich';
      } else if (base.name === 'Riyad Mahrez') {
        if (year < 2018) club = 'Leicester';
        else if (year >= 2018 && year < 2023) club = 'Manchester City';
        else club = 'Al-Ahli';
      } else if (base.name === 'Declan Rice') {
        if (year < 2023) club = 'West Ham';
        else club = 'Arsenal';
      } else if (base.name === 'Sadio Mane') {
        if (year < 2016) club = 'Southampton';
        else if (year >= 2016 && year < 2022) club = 'Liverpool';
        else if (year === 2022) club = 'Bayern Munich';
        else club = 'Al-Nassr';
      } else if (base.name === 'Ashley Cole') {
        if (year < 2006) club = 'Arsenal';
        else if (year >= 2006 && year < 2014) club = 'Chelsea';
        else club = 'Roma';
      } else if (base.name === 'Cesc Fabregas') {
        if (year < 2011) club = 'Arsenal';
        else if (year >= 2011 && year < 2014) club = 'Barcelona';
        else if (year >= 2014 && year < 2019) club = 'Chelsea';
        else club = 'Monaco';
      } else if (base.name === 'Kylian Mbappe') {
        if (year < 2017) club = 'Monaco';
        else if (year >= 2017 && year < 2024) club = 'PSG';
        else club = 'Real Madrid';
      } else if (base.name === 'Antoine Griezmann') {
        if (year < 2014) club = 'Real Sociedad';
        else if (year >= 2014 && year < 2019) club = 'Atletico Madrid';
        else if (year >= 2019 && year < 2021) club = 'Barcelona';
        else club = 'Atletico Madrid';
      } else if (base.name === 'David Silva') {
        if (year < 2010) club = 'Valencia';
        else if (year >= 2010 && year < 2020) club = 'Manchester City';
        else club = 'Real Sociedad';
      } else if (base.name === 'Harry Kane') {
        if (year < 2023) club = 'Tottenham';
        else club = 'Bayern Munich';
      } else if (base.name === 'Thibaut Courtois') {
        if (year < 2014) club = 'Atletico Madrid';
        else if (year >= 2014 && year < 2018) club = 'Chelsea';
        else club = 'Real Madrid';
      } else if (base.name === 'Christian Eriksen') {
        if (year < 2013) club = 'Ajax';
        else if (year >= 2013 && year < 2020) club = 'Tottenham';
        else if (year >= 2020 && year < 2022) club = 'Inter Milan';
        else if (year === 2022) club = 'Brentford';
        else club = 'Manchester United';
      } else if (base.name === 'Michael Carrick') {
        if (year < 2004) club = 'West Ham';
        else if (year >= 2004 && year < 2006) club = 'Tottenham';
        else club = 'Manchester United';
      } else if (base.name === 'Petr Cech') {
        if (year < 2015) club = 'Chelsea';
        else club = 'Arsenal';
      } else if (base.name === 'Ruud van Nistelrooy') {
        if (year < 2006) club = 'Manchester United';
        else if (year >= 2006 && year < 2010) club = 'Real Madrid';
        else if (year === 2010) club = 'Hamburg';
        else club = 'Malaga';
      } else if (base.name === 'Xabi Alonso') {
        if (year < 2004) club = 'Real Sociedad';
        else if (year >= 2004 && year < 2009) club = 'Liverpool';
        else if (year >= 2009 && year < 2014) club = 'Real Madrid';
        else club = 'Bayern Munich';
      } else if (base.name === 'Ilkay Gündogan') {
        if (year < 2016) club = 'Dortmund';
        else if (year >= 2016 && year < 2023) club = 'Manchester City';
        else if (year === 2023) club = 'Barcelona';
        else club = 'Manchester City';
      } else if (base.name === 'Mats Hummels') {
        if (year < 2016) club = 'Dortmund';
        else if (year >= 2016 && year < 2019) club = 'Bayern Munich';
        else if (year >= 2019 && year < 2024) club = 'Dortmund';
        else club = 'Roma';
      } else if (base.name === 'David Alaba') {
        if (year < 2021) club = 'Bayern Munich';
        else club = 'Real Madrid';
      } else if (base.name === 'Jens Lehmann') {
        if (year < 2003) club = 'Dortmund';
        else if (year >= 2003 && year < 2008) club = 'Arsenal';
        else club = 'Stuttgart';
      } else if (base.name === 'Marc-Andre ter Stegen') {
        if (year < 2014) club = 'Monchengladbach';
        else club = 'Barcelona';
      } else if (base.name === 'Ivan Rakitic') {
        if (year < 2011) club = 'Schalke';
        else if (year >= 2011 && year < 2014) club = 'Sevilla';
        else if (year >= 2014 && year < 2020) club = 'Barcelona';
        else if (year >= 2020 && year < 2024) club = 'Sevilla';
        else club = 'Hajduk Split';
      } else if (base.name === 'David Villa') {
        if (year < 2005) club = 'Zaragoza';
        else if (year >= 2005 && year < 2010) club = 'Valencia';
        else if (year >= 2010 && year < 2013) club = 'Barcelona';
        else if (year === 2013) club = 'Atletico Madrid';
        else club = 'NYCFC';
      } else if (base.name === 'Alessandro Nesta') {
        if (year < 2002) club = 'Lazio';
        else if (year >= 2002 && year < 2012) club = 'AC Milan';
        else club = 'Montreal Impact';
      } else if (base.name === 'Gianluca Zambrotta') {
        if (year < 2006) club = 'Juventus';
        else if (year >= 2006 && year < 2008) club = 'Barcelona';
        else club = 'AC Milan';
      } else if (base.name === 'Filippo Inzaghi') {
        if (year < 2001) club = 'Juventus';
        else club = 'AC Milan';
      } else if (base.name === 'Claudio Pizarro') {
        if (year <= 2000) club = 'Werder Bremen';
        else if (year >= 2001 && year < 2007) club = 'Bayern Munich';
        else if (year === 2007) club = 'Chelsea';
        else if (year >= 2008 && year < 2012) club = 'Werder Bremen';
        else if (year >= 2012 && year < 2015) club = 'Bayern Munich';
        else club = 'Werder Bremen';
      } else if (base.name === 'Corentin Tolisso') {
        if (year < 2017) club = 'Lyon';
        else if (year >= 2017 && year < 2022) club = 'Bayern Munich';
        else club = 'Lyon';
      } else if (base.name === 'Leonardo Bonucci') {
        if (year === 2017) club = 'AC Milan';
        else if (year >= 2023) club = 'Union Berlin';
        else club = 'Juventus';
      } else if (base.name === 'Dani Alves') {
        if (year < 2008) club = 'Sevilla';
        else if (year >= 2008 && year < 2016) club = 'Barcelona';
        else if (year === 2016) club = 'Juventus';
        else if (year >= 2017 && year < 2019) club = 'PSG';
        else club = 'Sao Paulo';
      } else if (base.name === 'Manuel Neuer') {
        if (year < 2011) club = 'Schalke';
        else club = 'Bayern Munich';
      } else if (base.name === 'Cafu') {
        if (year < 2003) club = 'Roma';
        else club = 'AC Milan';
      } else if (base.name === 'Andriy Shevchenko') {
        if (year < 1999) club = 'Dynamo Kyiv';
        else if (year >= 1999 && year < 2006) club = 'AC Milan';
        else if (year >= 2006 && year < 2008) club = 'Chelsea';
        else if (year === 2008) club = 'AC Milan';
        else club = 'Dynamo Kyiv';
      } else if (base.name === 'Arjen Robben') {
        if (year < 2004) club = 'PSV';
        else if (year >= 2004 && year < 2007) club = 'Chelsea';
        else if (year >= 2007 && year < 2009) club = 'Real Madrid';
        else club = 'Bayern Munich';
      } else if (base.name === 'Franck Ribery') {
        if (year < 2005) club = 'Galatasaray';
        else if (year >= 2005 && year < 2007) club = 'Marseille';
        else if (year >= 2007 && year < 2019) club = 'Bayern Munich';
        else club = 'Fiorentina';
      } else if (base.name === 'Kyle Walker') {
        if (year < 2017) club = 'Tottenham';
        else club = 'Manchester City';
      } else if (base.name === 'Kieran Trippier') {
        if (year < 2019) club = 'Tottenham';
        else if (year >= 2019 && year < 2022) club = 'Atletico Madrid';
        else club = 'Newcastle';
      } else if (base.name === 'Kolo Toure') {
        if (year < 2009) club = 'Arsenal';
        else if (year >= 2009 && year < 2013) club = 'Manchester City';
        else if (year >= 2013 && year < 2016) club = 'Liverpool';
        else club = 'Celtic';
      } else if (base.name === 'Joao Cancelo') {
        if (year < 2018) club = 'Valencia';
        else if (year === 2018) club = 'Juventus';
        else if (year >= 2019 && year < 2023) club = 'Manchester City';
        else if (year === 2023) club = 'Barcelona';
        else club = 'Al-Hilal';
      } else if (base.name === 'Teddy Sheringham') {
        if (year < 1997) club = 'Tottenham';
        else if (year >= 1997 && year < 2001) club = 'Manchester United';
        else if (year >= 2001 && year < 2003) club = 'Tottenham';
        else if (year === 2003) club = 'Portsmouth';
        else club = 'West Ham';
      } else if (base.name === 'David Beckham') {
        if (year < 2003) club = 'Manchester United';
        else if (year >= 2003 && year < 2007) club = 'Real Madrid';
        else if (year >= 2007 && year < 2013) club = 'LA Galaxy';
        else club = 'PSG';
      } else if (base.name === 'Jimmy Floyd Hasselbaink') {
        if (year < 1999) club = 'Leeds United';
        else if (year === 1999) club = 'Atletico Madrid';
        else if (year >= 2000 && year < 2004) club = 'Chelsea';
        else if (year >= 2004 && year < 2006) club = 'Middlesbrough';
        else club = 'Charlton';
      } else if (base.name === 'Michael Ballack') {
        if (year < 1999) club = 'Kaiserslautern';
        else if (year >= 1999 && year < 2002) club = 'Leverkusen';
        else if (year >= 2002 && year < 2006) club = 'Bayern Munich';
        else if (year >= 2006 && year < 2010) club = 'Chelsea';
        else club = 'Leverkusen';
      } else if (base.name === 'Raul Gonzalez') {
        if (year < 2010) club = 'Real Madrid';
        else if (year >= 2010 && year < 2012) club = 'Schalke';
        else club = 'Al Sadd';
      } else if (base.name === 'Bastian Schweinsteiger') {
        if (year < 2015) club = 'Bayern Munich';
        else if (year >= 2015 && year < 2017) club = 'Manchester United';
        else club = 'Chicago Fire';
      } else if (base.name === 'Erling Haaland') {
        if (year < 2020) club = 'Salzburg';
        else if (year >= 2020 && year < 2022) club = 'Dortmund';
        else club = 'Manchester City';
      } else if (base.name === 'Victor Osimhen') {
        if (year < 2020) club = 'Lille';
        else if (year >= 2020 && year < 2024) club = 'Napoli';
        else club = 'Galatasaray';
      } else if (base.name === 'Isco') {
        if (year < 2013) club = 'Malaga';
        else if (year >= 2013 && year < 2022) club = 'Real Madrid';
        else if (year === 2022) club = 'Sevilla';
        else club = 'Real Betis';
      } else if (base.name === 'James Ward-Prowse') {
        if (year < 2023) club = 'Southampton';
        else if (year === 2023) club = 'West Ham';
        else club = 'Nottingham Forest';
      } else if (base.name === 'Pascal Gross') {
        if (year < 2024) club = 'Brighton';
        else club = 'Dortmund';
      } else if (base.name === 'Salomon Kalou') {
        if (year < 2012) club = 'Chelsea';
        else if (year >= 2012 && year < 2014) club = 'Lille';
        else club = 'Hertha BSC';
      } else if (base.name === 'Andrea Barzagli') {
        if (year < 2004) club = 'Chievo';
        else if (year >= 2004 && year < 2008) club = 'Palermo';
        else if (year >= 2008 && year < 2011) club = 'Wolfsburg';
        else club = 'Juventus';
      } else if (base.name === 'Miroslav Klose') {
        if (year < 2004) club = 'Kaiserslautern';
        else if (year >= 2004 && year < 2007) club = 'Werder Bremen';
        else if (year >= 2007 && year < 2011) club = 'Bayern Munich';
        else club = 'Lazio';
      } else if (base.name === 'Hernan Crespo') {
        if (year < 2000) club = 'Parma';
        else if (year >= 2000 && year < 2002) club = 'Lazio';
        else if (year === 2002) club = 'Inter Milan';
        else if (year === 2003 || year === 2005) club = 'Chelsea';
        else if (year === 2004) club = 'AC Milan';
        else if (year >= 2006 && year < 2009) club = 'Inter Milan';
        else club = 'Parma';
      } else if (base.name === 'Danny Simpson') {
        if (year < 2010) club = 'Manchester United';
        else if (year >= 2010 && year < 2013) club = 'Newcastle';
        else if (year === 2013) club = 'QPR';
        else club = 'Leicester';
      } else if (base.name === 'Sylvain Distin') {
        if (year <= 2001) club = 'Newcastle';
        else if (year >= 2002 && year < 2007) club = 'Manchester City';
        else if (year >= 2007 && year < 2009) club = 'Portsmouth';
        else if (year >= 2009 && year < 2015) club = 'Everton';
        else club = 'Bournemouth';
      } else if (base.name === 'Wilfried Zaha') {
        if (year === 2013) club = 'Manchester United';
        else if (year >= 2023) club = 'Galatasaray';
        else club = 'Crystal Palace';
      } else if (base.name === 'Chris Wood') {
        if (year < 2013) club = 'West Brom';
        else if (year >= 2013 && year < 2015) club = 'Leicester';
        else if (year >= 2015 && year < 2017) club = 'Leeds United';
        else if (year >= 2017 && year < 2022) club = 'Burnley';
        else if (year === 2022) club = 'Newcastle';
        else club = 'Nottingham Forest';
      } else if (base.name === 'Jordan Henderson') {
        if (year < 2011) club = 'Sunderland';
        else if (year >= 2011 && year < 2023) club = 'Liverpool';
        else if (year === 2023) club = 'Al-Ettifaq';
        else club = 'Ajax';
      } else if (base.name === 'Clarence Seedorf') {
        if (year < 1995) club = 'Ajax';
        else if (year === 1995) club = 'Sampdoria';
        else if (year >= 1996 && year < 2000) club = 'Real Madrid';
        else if (year >= 2000 && year < 2002) club = 'Inter Milan';
        else if (year >= 2002 && year < 2012) club = 'AC Milan';
        else club = 'Botafogo';
      } else if (base.name === 'Eden Hazard') {
        if (year < 2012) club = 'Lille';
        else if (year >= 2012 && year < 2019) club = 'Chelsea';
        else club = 'Real Madrid';
      } else if (base.name === 'Luis Suarez') {
        if (year < 2011) club = 'Ajax';
        else if (year >= 2011 && year < 2014) club = 'Liverpool';
        else if (year >= 2014 && year < 2020) club = 'Barcelona';
        else if (year >= 2020 && year < 2022) club = 'Atletico Madrid';
        else club = 'Inter Miami';
      } else if (base.name === 'Virgil van Dijk') {
        if (year < 2018) club = 'Southampton';
        else club = 'Liverpool';
      } else if (base.name === 'Andy Robertson') {
        if (year < 2017) club = 'Hull City';
        else club = 'Liverpool';
      } else if (base.name === 'Luke Shaw') {
        if (year < 2014) club = 'Southampton';
        else club = 'Manchester United';
      } else if (base.name === 'Mesut Ozil') {
        if (year < 2013) club = 'Real Madrid';
        else if (year >= 2013 && year < 2021) club = 'Arsenal';
        else club = 'Fenerbahce';
      } else if (base.name === 'Bernardo Silva') {
        if (year < 2017) club = 'Monaco';
        else club = 'Manchester City';
      } else if (base.name === 'Mohamed Salah') {
        if (year < 2017) club = 'Roma';
        else club = 'Liverpool';
      } else if (base.name === 'Son Heung-min') {
        if (year < 2015) club = 'Leverkusen';
        else club = 'Tottenham';
      } else if (base.name === 'Rio Ferdinand') {
        if (year < 2002) club = 'Leeds United';
        else if (year >= 2002 && year < 2014) club = 'Manchester United';
        else club = 'QPR';
      } else if (base.name === 'Andy Cole') {
        if (year < 1995) club = 'Newcastle';
        else if (year >= 1995 && year < 2002) club = 'Manchester United';
        else if (year >= 2002 && year < 2004) club = 'Blackburn';
        else if (year === 2004) club = 'Fulham';
        else club = 'Manchester City';
      } else if (base.name === 'Robbie Fowler') {
        if (year <= 2001) club = 'Liverpool';
        else if (year >= 2001 && year < 2003) club = 'Leeds United';
        else if (year >= 2003 && year < 2006) club = 'Manchester City';
        else club = 'Liverpool';
      } else if (base.name === 'Sergio Aguero') {
        if (year < 2011) club = 'Atletico Madrid';
        else if (year >= 2011 && year < 2021) club = 'Manchester City';
        else club = 'Barcelona';
      } else if (base.name === 'Peter Schmeichel') {
        if (year < 1999) club = 'Manchester United';
        else if (year >= 1999 && year < 2001) club = 'Sporting CP';
        else if (year === 2001) club = 'Aston Villa';
        else club = 'Manchester City';
      } else if (base.name === 'David Seaman') {
        if (year < 2003) club = 'Arsenal';
        else club = 'Manchester City';
      } else if (base.name === 'Patrick Vieira') {
        if (year < 2005) club = 'Arsenal';
        else if (year === 2005) club = 'Juventus';
        else if (year >= 2006 && year < 2010) club = 'Inter Milan';
        else club = 'Manchester City';
      } else if (base.name === 'Claude Makelele') {
        if (year < 2003) club = 'Real Madrid';
        else if (year >= 2003 && year < 2008) club = 'Chelsea';
        else club = 'PSG';
      } else if (base.name === 'Michael Essien') {
        if (year < 2005) club = 'Lyon';
        else if (year >= 2005 && year < 2012) club = 'Chelsea';
        else if (year === 2012) club = 'Real Madrid';
        else club = 'AC Milan';
      } else if (base.name === 'Robert Pires') {
        if (year < 2006) club = 'Arsenal';
        else if (year >= 2006 && year < 2010) club = 'Villarreal';
        else club = 'Aston Villa';
      } else if (base.name === 'Patrice Evra') {
        if (year < 2014) club = 'Manchester United';
        else if (year >= 2014 && year < 2017) club = 'Juventus';
        else club = 'Marseille';
      } else if (base.name === 'Yaya Toure') {
        if (year < 2010) club = 'Barcelona';
        else if (year >= 2010 && year < 2018) club = 'Manchester City';
        else club = 'Olympiacos';
      } else if (base.name === 'Kevin De Bruyne') {
        if (year < 2015) club = 'Wolfsburg';
        else club = 'Manchester City';
      } else if (base.name === 'Rodri Hernandez') {
        if (year < 2018) club = 'Villarreal';
        else if (year === 2018) club = 'Atletico Madrid';
        else club = 'Manchester City';
      } else if (base.name === 'Bruno Fernandes') {
        if (year < 2020) club = 'Sporting CP';
        else club = 'Manchester United';
      } else if (base.name === 'Martin Odegaard') {
        if (year < 2020) club = 'Real Sociedad';
        else if (year === 2020) club = 'Real Madrid';
        else club = 'Arsenal';
      } else if (base.name === 'Nemanja Vidic') {
        if (year < 2014) club = 'Manchester United';
        else club = 'Inter Milan';
      } else if (base.name === 'Vincent Kompany') {
        if (year < 2019) club = 'Manchester City';
        else club = 'Anderlecht';
      } else if (base.name === 'Thiago Silva') {
        if (year < 2024) club = 'Chelsea';
        else club = 'Fluminense';
      } else if (base.name === 'John Terry') {
        if (year < 2017) club = 'Chelsea';
        else club = 'Aston Villa';
      } else if (base.name === 'Ricardo Carvalho') {
        if (year < 2010) club = 'Chelsea';
        else if (year >= 2010 && year < 2013) club = 'Real Madrid';
        else club = 'Monaco';
      } else if (base.name === 'Jaap Stam') {
        if (year < 2001) club = 'Manchester United';
        else if (year >= 2001 && year < 2004) club = 'Lazio';
        else if (year >= 2004 && year < 2006) club = 'AC Milan';
        else club = 'Ajax';
      } else if (base.name === 'Shay Given') {
        if (year < 2009) club = 'Newcastle';
        else if (year >= 2009 && year < 2011) club = 'Manchester City';
        else club = 'Aston Villa';
      } else if (base.name === 'David de Gea') {
        if (year < 2023) club = 'Manchester United';
        else club = 'Fiorentina';
      } else if (base.name === 'Hugo Lloris') {
        if (year < 2024) club = 'Tottenham';
        else club = 'LAFC';
      } else if (base.name === 'Steven Gerrard') {
        if (year < 2015) club = 'Liverpool';
        else club = 'LA Galaxy';
      } else if (base.name === 'Mark Schwarzer') {
        if (year >= 2015) club = 'Leicester';
        else if (year >= 2013) club = 'Chelsea';
        else if (year >= 2008) club = 'Fulham';
      } else if (base.name === 'Brad Friedel') {
        if (year >= 2011) club = 'Tottenham';
        else if (year >= 2008) club = 'Aston Villa';
      } else if (base.name === 'Tim Howard' && year < 2006) {
        club = 'Manchester United';
      } else if (base.name === 'Lukasz Fabianski') {
        if (year >= 2018) club = 'West Ham';
        else if (year < 2014) club = 'Arsenal';
      } else if (base.name === 'James Milner') {
        if (year >= 2023) club = 'Brighton';
        else if (year >= 2015) club = 'Liverpool';
        else if (year >= 2010) club = 'Manchester City';
        else if (year < 2008) club = 'Newcastle';
      } else if (base.name === 'Gareth Barry') {
        if (year >= 2017) club = 'West Brom';
        else if (year >= 2013) club = 'Everton';
        else if (year >= 2009) club = 'Manchester City';
      } else if (base.name === 'Peter Crouch') {
        if (year >= 2019) club = 'Burnley';
        else if (year >= 2011) club = 'Stoke City';
        else if (year >= 2009) club = 'Tottenham';
        else if (year === 2008) club = 'Portsmouth';
        else if (year >= 2005 && year < 2008) club = 'Liverpool';
        else if (year < 2005) club = 'Aston Villa';
      } else if (base.name === 'Olivier Giroud') {
        if (year >= 2024) club = 'LAFC';
        else if (year >= 2021) club = 'AC Milan';
        else if (year >= 2018) club = 'Chelsea';
        else if (year < 2012) club = 'Montpellier';
      } else if (base.name === 'Darren Bent') {
        if (year >= 2011) club = 'Aston Villa';
        else if (year < 2009 && year >= 2007) club = 'Tottenham';
        else if (year < 2007) club = 'Charlton';
      } else if (base.name === 'Danny Ings') {
        if (year >= 2023) club = 'West Ham';
        else if (year >= 2021) club = 'Aston Villa';
        else if (year < 2018) club = 'Liverpool';
      } else if (base.name === 'Gylfi Sigurdsson') {
        if (year >= 2017) club = 'Everton';
        else if (year >= 2012 && year < 2014) club = 'Tottenham';
      } else if (base.name === 'Clint Dempsey' && year === 2012) {
        club = 'Tottenham';
      } else if (base.name === 'John Arne Riise') {
        if (year >= 2011) club = 'Fulham';
        else if (year >= 2008 && year < 2011) club = 'Roma';
      } else if (base.name === 'Glen Johnson') {
        if (year >= 2015) club = 'Stoke City';
        else if (year >= 2007 && year < 2009) club = 'Portsmouth';
        else if (year >= 2003 && year < 2007) club = 'Chelsea';
      } else if (base.name === 'Sebastian Larsson') {
        if (year >= 2017) club = 'Hull City';
        else if (year < 2011) club = 'Birmingham';
      } else if (base.name === 'Ben Davies' && year < 2014) {
        club = 'Swansea';
      } else if (base.name === 'Diego Alves' && year < 2011) {
        club = 'Almeria';
      } else if (base.name === 'Samir Handanovic' && year < 2012) {
        club = 'Udinese';
      } else if (base.name === 'Steve Mandanda') {
        if (year >= 2022) club = 'Rennes';
        else if (year === 2016) club = 'Crystal Palace';
      } else if (base.name === 'Jordi Alba') {
        if (year >= 2023) club = 'Inter Miami';
        else if (year < 2012) club = 'Valencia';
      } else if (base.name === 'Lucas Digne') {
        if (year >= 2022) club = 'Aston Villa';
        else if (year >= 2018) club = 'Everton';
        else if (year >= 2016) club = 'Barcelona';
        else if (year === 2015) club = 'Roma';
        else if (year < 2013) club = 'Lille';
      } else if (base.name === 'Marquinhos' && year === 2012) {
        club = 'Roma';
      } else if (base.name === 'Ever Banega') {
        if (year >= 2020) club = 'Al-Shabab';
        else if (year >= 2017) club = 'Sevilla';
        else if (year === 2016) club = 'Inter Milan';
        else if (year >= 2014) club = 'Sevilla';
        else if (year < 2014) club = 'Valencia';
      } else if (base.name === 'Dani Parejo') {
        if (year >= 2020) club = 'Villarreal';
        else if (year < 2011) club = 'Getafe';
      } else if (base.name === 'Radja Nainggolan') {
        if (year >= 2018) club = 'Inter Milan';
        else if (year < 2014) club = 'Cagliari';
      } else if (base.name === 'Marek Hamsik' && year < 2007) {
        club = 'Brescia';
      } else if (base.name === 'Marco Verratti') {
        if (year >= 2023) club = 'Al-Arabi';
        else if (year < 2012) club = 'Pescara';
      } else if (base.name === 'Blaise Matuidi') {
        if (year >= 2020) club = 'Inter Miami';
        else if (year >= 2017) club = 'Juventus';
        else if (year < 2011) club = 'Saint-Etienne';
      } else if (base.name === 'Dimitri Payet') {
        if (year >= 2017) club = 'Marseille';
        else if (year >= 2015 && year < 2017) club = 'West Ham';
        else if (year >= 2013 && year < 2015) club = 'Marseille';
        else if (year >= 2011 && year < 2013) club = 'Lille';
        else if (year < 2011) club = 'Saint-Etienne';
      } else if (base.name === 'Iago Aspas') {
        if (year === 2013) club = 'Liverpool';
        else if (year === 2014) club = 'Sevilla';
      } else if (base.name === 'Carlos Vela') {
        if (year >= 2018) club = 'LAFC';
        else if (year < 2011) club = 'Arsenal';
      } else if (base.name === 'Wissam Ben Yedder') {
        if (year >= 2019) club = 'Monaco';
        else if (year < 2016) club = 'Toulouse';
        else club = 'Sevilla';
      } else if (base.name === 'Mario Gomez') {
        if (year >= 2018) club = 'Stuttgart';
        else if (year >= 2016) club = 'Wolfsburg';
        else if (year === 2015) club = 'Besiktas';
        else if (year === 2013 || year === 2014) club = 'Fiorentina';
        else if (year < 2009) club = 'Stuttgart';
      } else if (base.name === 'Alexandre Lacazette') {
        if (year >= 2022) club = 'Lyon';
        else if (year >= 2017 && year < 2022) club = 'Arsenal';
      } else if (base.name === 'Loic Remy') {
        if (year >= 2014 && year <= 2016) club = 'Chelsea';
        else if (year === 2013) club = 'Newcastle';
        else if (year < 2010) club = 'Nice';
      } else if (base.name === 'Filipe Luis') {
        if (year >= 2019) club = 'Flamengo';
        else if (year === 2014) club = 'Chelsea';
        else if (year < 2010) club = 'Deportivo';
      } else if (base.name === 'Lukasz Piszczek' && year < 2010) {
        club = 'Hertha BSC';
      } else if (base.name === 'Bacary Sagna') {
        if (year >= 2014) club = 'Manchester City';
        else if (year < 2007) club = 'Auxerre';
      } else if (base.name === 'Christian Fuchs') {
        if (year >= 2021) club = 'Charlotte FC';
        else if (year >= 2011 && year < 2015) club = 'Schalke';
        else if (year === 2010) club = 'Mainz';
        else if (year < 2010) club = 'Bochum';
      } else if (base.name === 'Patrick van Aanholt') {
        if (year >= 2021) club = 'Galatasaray';
        else if (year >= 2017) club = 'Crystal Palace';
        else if (year < 2014) club = 'Chelsea';
      } else if (base.name === 'Kieran Gibbs') {
        if (year >= 2021) club = 'Inter Miami';
        else if (year >= 2017) club = 'West Brom';
      } else if (base.name === 'Alan Hutton') {
        if (year < 2008) club = 'Rangers';
        else if (year < 2011) club = 'Tottenham';
      }

      const careerPath = careerPaths[base.name];
      if (careerPath) {
        const resolved = careerPath(year);
        if (resolved) club = resolved;
      }

      // Generate unique player card ID based on player name, resolved club, and year
      const id = `${base.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${club.toLowerCase().replace(/[^a-z0-9]/g, '')}_${year}`;

      // Determine Rarity
      let rarity = stage.rarity;
      if (rating >= 95) rarity = 'legend';
      else if (rating >= 90) rarity = 'elite';
      else if (rating >= 85) rarity = 'rare';
      else if (rating >= 79) rarity = 'solid';
      else rarity = 'common';

      // Inject cult status for specific milestones
      if (stage.rarity === 'cult' && rating < 90) {
        rarity = 'cult';
      }

      // Determine Special Trait
      let specialTrait = stage.trait || base.baseTrait;

      // Position-based sanitization of stage traits (e.g. preventing defenders/GKs from getting Golden Boot Form)
      if (stage.trait === 'Golden Boot Form') {
        const pos = base.primaryPosition;
        if (pos === 'GK') {
          specialTrait = 'Clean Sheet Master';
        } else if (pos === 'CB' || pos === 'LB' || pos === 'RB') {
          // Playmaker fullbacks keep their Creator Supreme / Set Piece Master traits
          if (base.baseTrait === 'Creator Supreme') {
            specialTrait = 'Creator Supreme';
          } else {
            specialTrait = 'Lockdown Defender';
          }
        } else if (pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'LM' || pos === 'RM') {
          if (base.baseTrait === 'Creator Supreme' || base.baseTrait === 'Midfield General' || base.baseTrait === 'Box-to-Box Engine') {
            specialTrait = base.baseTrait;
          } else {
            specialTrait = 'Midfield Maestro';
          }
        } else {
          // ST, CF, LW, RW keep their baseTrait if it's specific, or get Golden Boot Form
          specialTrait = base.baseTrait !== 'Chaos Merchant' ? base.baseTrait : 'Golden Boot Form';
        }
      }

      // If GK, force Shot Stopper or Sweeper Keeper
      if (base.primaryPosition === 'GK' && specialTrait !== 'Sweeper Keeper') {
        specialTrait = 'Shot Stopper';
      }

      // Scale core stats dynamically based on rating and positions
      const scaleStat = (baseVal: number, scaleFactor: number) => {
        return Math.min(99, Math.max(35, Math.round(baseVal * scaleFactor)));
      };

      const baseAvg = 84; // normalized baseline average (refined from 80 for realistic scaling)
      const scaleFactor = rating / baseAvg;

      const pos = base.primaryPosition;

      // Category baselines
      let baseAttack = 45;
      let baseMidfield = 45;
      let baseDefence = 45;

      if (pos === 'ST' || pos === 'CF' || pos === 'LW' || pos === 'RW') {
        baseAttack = 88; baseMidfield = 65; baseDefence = 35;
      } else if (pos === 'CAM' || pos === 'CM' || pos === 'LM' || pos === 'RM') {
        baseAttack = 68; baseMidfield = 88; baseDefence = 55;
      } else if (pos === 'CDM') {
        baseAttack = 50; baseMidfield = 85; baseDefence = 82;
      } else if (pos === 'CB') {
        baseAttack = 35; baseMidfield = 50; baseDefence = 92;
      } else if (pos === 'LB' || pos === 'RB') {
        baseAttack = 55; baseMidfield = 68; baseDefence = 80; // Fullbacks have lower base defense than CBs
      } else if (pos === 'GK') {
        baseAttack = 12; baseMidfield = 15; baseDefence = 92;
      }

      // Core attribute baselines
      let basePaceVal = (pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'RB' || pos === 'LB') ? 88 : 72;
      let baseTechniqueVal = (pos === 'CAM' || pos === 'CM' || pos === 'LW' || pos === 'RW') ? 88 : 74;
      let basePhysicalVal = (pos === 'CB' || pos === 'ST' || pos === 'CDM') ? 86 : 72;
      let baseMentalityVal = 80;

      // Sub-stats baselines
      let baseFinishing = (pos === 'ST' || pos === 'CF') ? 90 : (pos === 'LW' || pos === 'RW' || pos === 'CAM') ? 78 : 45;
      let baseCreativity = (pos === 'CAM' || pos === 'LW' || pos === 'RW' || pos === 'CM') ? 88 : 50;
      let basePassing = (pos === 'CAM' || pos === 'CM' || pos === 'CDM') ? 86 : 65;
      let baseDribbling = (pos === 'LW' || pos === 'RW' || pos === 'CAM') ? 90 : 65;
      let baseDefending = (pos === 'CB' || pos === 'CDM') ? 90 : (pos === 'LB' || pos === 'RB') ? 82 : 35;
      let baseAerial = (pos === 'CB' || pos === 'ST') ? 84 : 60;

      // --- APPLY PROFILE SKEWS BASED ON TRAIT/PLAYSTYLE ---
      
      // 1. Playmakers/Creators (e.g. Trent Alexander-Arnold, Pirlo, Modric, Kroos, Cancelo)
      if (
        base.baseTrait === 'Creator Supreme' || 
        base.playStyle === 'Set Piece Master' || 
        base.playStyle === 'Inverted Playmaker' || 
        base.playStyle === 'Creative Playmaker' ||
        base.playStyle === 'Tempo Controller'
      ) {
        basePassing = Math.max(basePassing, 88);
        baseCreativity = Math.max(baseCreativity, 88);
        baseTechniqueVal = Math.max(baseTechniqueVal, 88);
        baseMidfield = Math.max(baseMidfield, 78);
        
        // Fullback playmaker adjustments (Trent, Cancelo)
        if (pos === 'LB' || pos === 'RB') {
          baseDefence = 70; // Playmaker fullback base defense
          baseDefending = 62;
          basePaceVal = 78;
          baseAttack = Math.max(baseAttack, 55);
        }
      }

      // 2. Speedsters vs slower tactical/technical players
      const isSpeedster = 
        base.playStyle.toLowerCase().includes('speedster') || 
        base.playStyle.toLowerCase().includes('wingback') || 
        base.playStyle.toLowerCase().includes('overlapping') || 
        base.playStyle.toLowerCase().includes('runner');
        
      if (isSpeedster) {
        basePaceVal = Math.max(basePaceVal, 88);
      } else if (pos === 'LB' || pos === 'RB') {
        // Tone down pace for technical/lockdown fullbacks
        basePaceVal = 78;
      }

      // 3. Defensive Anchors / Hard Tacklers (e.g. Chiellini, Baresi, Nesta, Walker, Wan-Bissaka)
      if (
        base.baseTrait === 'Lockdown Fullback' || 
        base.baseTrait === 'Defensive Anchor' || 
        base.baseTrait === 'Tactical Interceptor' || 
        base.playStyle === 'Hard Tackler' || 
        base.playStyle === 'Stopper' ||
        base.playStyle === 'Ball Winning Midfielder'
      ) {
        baseDefence = Math.max(baseDefence, pos === 'CB' ? 92 : 86); // CB gets 92, Fullback gets 86
        baseDefending = Math.max(baseDefending, 90);
        basePhysicalVal = Math.max(basePhysicalVal, 84);
      }

      // 4. Known real-world profiles override the generic position/style formulas
      const ov = statOverrides[base.name];
      if (ov) {
        if (ov.pace !== undefined) basePaceVal = ov.pace;
        if (ov.defence !== undefined) baseDefence = ov.defence;
        if (ov.defending !== undefined) baseDefending = ov.defending;
        if (ov.passing !== undefined) basePassing = ov.passing;
        if (ov.creativity !== undefined) baseCreativity = ov.creativity;
        if (ov.finishing !== undefined) baseFinishing = ov.finishing;
        if (ov.dribbling !== undefined) baseDribbling = ov.dribbling;
        if (ov.physical !== undefined) basePhysicalVal = ov.physical;
        if (ov.aerial !== undefined) baseAerial = ov.aerial;
      }

      // Pace declines with age: late-career stages lose a little each season
      basePaceVal -= Math.max(0, stageIdx - 4) * 2;

      const attack = scaleStat(baseAttack, scaleFactor);
      const midfield = scaleStat(baseMidfield, scaleFactor);
      const defence = scaleStat(baseDefence, scaleFactor);

      const pace = Math.min(base.name === 'Kylian Mbappe' ? 99 : 96, scaleStat(basePaceVal, scaleFactor));
      const technique = scaleStat(baseTechniqueVal, scaleFactor);
      const physical = scaleStat(basePhysicalVal, scaleFactor);
      const mentality = scaleStat(baseMentalityVal, scaleFactor);

      // Detailed sub-stats
      const finishing = scaleStat(baseFinishing, scaleFactor);
      const creativity = scaleStat(baseCreativity, scaleFactor);
      const passing = scaleStat(basePassing, scaleFactor);
      const dribbling = scaleStat(baseDribbling, scaleFactor);
      const defending = scaleStat(baseDefending, scaleFactor);
      const aerial = scaleStat(baseAerial, scaleFactor);
      const pressing = scaleStat(pos === 'ST' || pos === 'CM' || pos === 'CDM' ? 80 : 60, scaleFactor);
      const leadership = scaleStat(stageIdx >= 5 ? 90 : 70, scaleFactor);
      const bigGame = scaleStat(80, scaleFactor);
      const consistency = scaleStat(82, scaleFactor);

      // Construct strengths and weaknesses dynamically
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (pace >= 85) strengths.push('Speed');
      if (finishing >= 85) strengths.push('Finishing');
      if (dribbling >= 85) strengths.push('Dribbling');
      if (defending >= 85) strengths.push('Tackling');
      if (passing >= 85) strengths.push('Passing');
      if (physical >= 85) strengths.push('Strength');
      if (aerial >= 82) strengths.push('Aerial Duels');
      
      // Ensure at least 2 strengths
      if (strengths.length < 2) {
        strengths.push('Technique');
        strengths.push('Work Rate');
      }

      if (pos !== 'GK' && defending < 55) weaknesses.push('Defending Work');
      if (pos === 'ST' && passing < 65) weaknesses.push('Link Play');
      if (pace < 65) weaknesses.push('Acceleration');
      if (physical < 62) weaknesses.push('Stamina');
      if (aerial < 55) weaknesses.push('Aerial Presence');

      if (weaknesses.length === 0) {
        weaknesses.push('Injury Risk');
      }

      // Best Role & Boosts
      let bestRole = 'All-Rounder';
      if (pos === 'GK') bestRole = specialTrait;
      else if (pos === 'ST' || pos === 'CF') bestRole = rating >= 90 ? 'Elite Poacher' : 'Target Forward';
      else if (pos === 'CAM') bestRole = 'Advanced Playmaker';
      else if (pos === 'CM') bestRole = 'Box-to-Box Midfielder';
      else if (pos === 'CDM') bestRole = 'Deep Defensive Shield';
      else if (pos === 'CB') bestRole = 'Lockdown Defender';
      else if (pos === 'LB' || pos === 'RB') bestRole = 'Overlapping Wingback';

      // Build Tags
      const chemistryTags = [club, base.nationality, era, specialTrait, base.playStyle];
      const clubTags = [club];
      const playStyleTags = [base.playStyle];
      
      allPlayerSeasons.push({
        id,
        playerName: base.name,
        displayName: `${base.lastName} ${seasonLabel.split('/')[0].substring(2)}/${seasonLabel.split('/')[1]}`,
        season: seasonLabel,
        club,
        league: getLeagueForClub(club),
        nationality: base.nationality,
        primaryPosition: base.primaryPosition,
        secondaryPositions: secondaryPositions,
        era,
        rating,
        attack,
        midfield,
        defence,
        pace,
        technique,
        physical,
        mentality,
        finishing,
        creativity,
        passing,
        dribbling,
        defending,
        aerial,
        pressing,
        leadership,
        bigGame,
        consistency,
        chemistryTags,
        clubTags,
        nationalityTag: base.nationality,
        eraTag: era,
        playStyleTags,
        rivalryTags: base.rivals,
        rarity,
        specialTrait,
        shortBio: stage.bio,
        whyIncluded: `Iconic representation of ${base.name} during the ${seasonLabel} Premier League campaign.`,
        dataConfidence: 'high',
        seasonLabel,
        clubSeasonLabel: `${club} ${seasonLabel}`,
        oneLineDescription: stage.bio,
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 2),
        bestRole,
        chemistryBoosts: [club, base.nationality, era],
        isLegendaryPlayer: base.isLegendaryPlayer !== false,
      });
    });
  });

  return allPlayerSeasons;
}

export const players: Player[] = generatePlayersDatabase();
