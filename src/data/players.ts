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
    primaryPosition: 'LW', secondaryPositions: ['CAM', 'RW'], era: '10s', club: 'Chelsea',
    baseRating: 93, startYear: 2012, baseTrait: 'Wing Wizard', playStyle: 'Pocket Playmaker',
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
    primaryPosition: 'CAM', secondaryPositions: ['LW', 'LM'], era: '10s', club: 'West Ham',
    baseRating: 87, startYear: 2015, baseTrait: 'Creator Supreme', playStyle: 'Set Piece Master',
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
    baseRating: 92, startYear: 2022, baseTrait: 'Golden Boot Form', playStyle: 'Goal Machine',
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
    name: 'Alessandro Nesta', lastName: 'Nesta', nationality: 'Italy',
    primaryPosition: 'CB', secondaryPositions: [], era: '90s', club: 'AC Milan',
    baseRating: 92, startYear: 1993, baseTrait: 'Defensive Leader', playStyle: 'Lockdown Defender',
    rivals: ['Inter Milan', 'Juventus'],
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
];

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

// Dynamically generate the 800+ player seasons database
function generatePlayersDatabase(): Player[] {
  const allPlayerSeasons: Player[] = [];

  playerBases.forEach((base, playerIdx) => {
    careerStages.forEach((stage, stageIdx) => {
      const year = base.startYear + stage.stepYear;
      
      // Prevent generating future seasons beyond 2026/27
      if (year > 2026) return;

      const seasonLabel = formatSeason(year);
      const rating = Math.min(99, Math.max(70, base.baseRating + stage.ratingOffset));
      
      const id = `${base.lastName.toLowerCase().replace(/[^a-z]/g, '')}_${base.club.toLowerCase().replace(/[^a-z]/g, '')}_${year}`;
      
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
      } else if (base.name === 'Wayne Rooney' && (year <= 2004 || year >= 2017)) {
        club = 'Everton';
      } else if (base.name === 'Thierry Henry' && year > 2007) {
        club = 'Barcelona';
      } else if (base.name === 'Robin van Persie' && year >= 2012) {
        club = 'Manchester United';
      } else if (base.name === 'Sol Campbell' && year < 2001) {
        club = 'Tottenham';
      } else if (base.name === 'Sol Campbell' && year > 2006) {
        club = 'Portsmouth';
      } else if (base.name === 'Cole Palmer' && year < 2023) {
        club = 'Manchester City';
      } else if (base.name === 'Frank Lampard' && year < 2001) {
        club = 'West Ham';
      } else if (base.name === 'Gareth Bale' && year >= 2013) {
        club = 'Real Madrid';
      } else if (base.name === 'Alexis Sanchez' && year >= 2018) {
        club = 'Manchester United';
      } else if (base.name === 'N\'Golo Kante' && year === 2015) {
        club = 'Leicester';
      } else if (base.name === 'Cristiano Ronaldo' && year >= 2009 && year < 2018) {
        club = 'Real Madrid';
      } else if (base.name === 'Cristiano Ronaldo' && year >= 2018 && year < 2021) {
        club = 'Juventus';
      } else if (base.name === 'Lionel Messi') {
        if (year >= 2021 && year < 2023) club = 'PSG';
        else if (year >= 2023) club = 'Inter Miami';
      } else if (base.name === 'Zlatan Ibrahimovic') {
        if (year >= 2018 && year <= 2019) club = 'LA Galaxy';
        else if (year >= 2016 && year <= 2017) club = 'Manchester United';
        else if (year >= 2012 && year < 2016) club = 'PSG';
        else if (year >= 2010 && year < 2012) club = 'AC Milan';
        else if (year === 2009) club = 'Barcelona';
        else if (year >= 2006 && year < 2009) club = 'Inter Milan';
        else if (year >= 2004 && year < 2006) club = 'Juventus';
        else if (year < 2004) club = 'Ajax';
      } else if (base.name === 'Zinedine Zidane' && year < 2001) {
        club = 'Juventus';
      } else if (base.name === 'Ronaldinho Gaucho') {
        if (year < 2003) club = 'PSG';
        else if (year >= 2008) club = 'AC Milan';
      } else if (base.name === 'Kaka' && year >= 2009) {
        club = 'Real Madrid';
      } else if (base.name === 'Sergio Ramos' && year >= 2021) {
        club = 'PSG';
      } else if (base.name === 'Fabio Cannavaro') {
        if (year >= 2006 && year < 2009) club = 'Real Madrid';
        else if (year >= 2004 && year < 2006) club = 'Juventus';
        else if (year < 2002) club = 'Parma';
      } else if (base.name === 'Ronaldo Nazario') {
        if (year >= 2002) club = 'Real Madrid';
        else if (year >= 1997 && year < 2002) club = 'Inter Milan';
        else if (year >= 1996 && year < 1997) club = 'Barcelona';
        else if (year >= 1994 && year < 1996) club = 'PSV';
      } else if (base.name === 'Neymar Jr' && year >= 2017) {
        club = 'PSG';
      } else if (base.name === 'Robert Lewandowski') {
        if (year < 2014) club = 'Dortmund';
        else if (year >= 2022) club = 'Barcelona';
      } else if (base.name === 'Karim Benzema' && year < 2009) {
        club = 'Lyon';
      } else if (base.name === 'Luis Figo') {
        if (year < 2000) club = 'Barcelona';
        else if (year >= 2005) club = 'Inter Milan';
      } else if (base.name === 'Samuel Eto\'o') {
        if (year >= 2009 && year <= 2011) club = 'Inter Milan';
        else if (year >= 2013 && year <= 2014) club = 'Chelsea';
        else if (year < 2004) club = 'Mallorca';
      } else if (base.name === 'Gabriel Batistuta' && year >= 2000) {
        club = 'Roma';
      } else if (base.name === 'Roberto Baggio') {
        if (year >= 1995 && year < 1997) club = 'AC Milan';
        else if (year >= 1997 && year < 1998) club = 'Bologna';
        else if (year >= 1998 && year < 2000) club = 'Inter Milan';
        else if (year >= 2000) club = 'Brescia';
      } else if (base.name === 'Andrea Pirlo' && year >= 2011) {
        club = 'Juventus';
      } else if (base.name === 'Toni Kroos' && year < 2014) {
        club = 'Bayern Munich';
      } else if (base.name === 'Luka Modric' && year < 2012) {
        club = 'Tottenham';
      } else if (base.name === 'Philipp Lahm' && year === 2003) {
        club = 'Stuttgart';
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
        if (year >= 2015) club = 'Liverpool';
        else if (year >= 2010) club = 'Manchester City';
        else if (year < 2008) club = 'Newcastle';
      } else if (base.name === 'Gareth Barry') {
        if (year >= 2013) club = 'Everton';
        else if (year >= 2009) club = 'Manchester City';
      } else if (base.name === 'Peter Crouch') {
        if (year >= 2011) club = 'Stoke City';
        else if (year >= 2009) club = 'Tottenham';
        else if (year === 2008) club = 'Portsmouth';
        else if (year >= 2005 && year < 2008) club = 'Liverpool';
        else if (year < 2005) club = 'Aston Villa';
      } else if (base.name === 'Olivier Giroud' && year >= 2018) {
        club = 'Chelsea';
      } else if (base.name === 'Darren Bent') {
        if (year >= 2011) club = 'Aston Villa';
        else if (year < 2009 && year >= 2007) club = 'Tottenham';
        else if (year < 2007) club = 'Charlton';
      } else if (base.name === 'Danny Ings') {
        if (year >= 2021) club = 'Aston Villa';
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
        if (year >= 2007 && year < 2009) club = 'Portsmouth';
        else if (year >= 2003 && year < 2007) club = 'Chelsea';
      } else if (base.name === 'Sebastian Larsson' && year < 2011) {
        club = 'Birmingham';
      } else if (base.name === 'Ben Davies' && year < 2014) {
        club = 'Swansea';
      }

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
      if (rarity === 'legend' || rating >= 94) {
        if (base.primaryPosition === 'ST' || base.primaryPosition === 'CF') {
          specialTrait = 'Golden Boot Form';
        } else if (base.primaryPosition === 'CB' || base.primaryPosition === 'LB' || base.primaryPosition === 'RB') {
          specialTrait = 'Lockdown Fullback';
        } else if (base.primaryPosition === 'GK') {
          specialTrait = 'Shot Stopper';
        } else {
          specialTrait = 'Creator Supreme';
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

      const baseAvg = 80; // normalized baseline average
      const scaleFactor = rating / baseAvg;

      // Primary position category weights
      let attack = 45;
      let midfield = 45;
      let defence = 45;

      const pos = base.primaryPosition;
      if (pos === 'ST' || pos === 'CF' || pos === 'LW' || pos === 'RW') {
        attack = 88; midfield = 65; defence = 35;
      } else if (pos === 'CAM' || pos === 'CM' || pos === 'LM' || pos === 'RM') {
        attack = 68; midfield = 88; defence = 55;
      } else if (pos === 'CDM') {
        attack = 50; midfield = 85; defence = 82;
      } else if (pos === 'CB' || pos === 'LB' || pos === 'RB') {
        attack = 40; midfield = 60; defence = 90;
      } else if (pos === 'GK') {
        attack = 12; midfield = 15; defence = 92;
      }

      attack = scaleStat(attack, scaleFactor);
      midfield = scaleStat(midfield, scaleFactor);
      defence = scaleStat(defence, scaleFactor);

      const pace = scaleStat(pos === 'ST' || pos === 'LW' || pos === 'RW' || pos === 'RB' || pos === 'LB' ? 88 : 72, scaleFactor);
      const technique = scaleStat(pos === 'CAM' || pos === 'CM' || pos === 'LW' || pos === 'RW' ? 88 : 74, scaleFactor);
      const physical = scaleStat(pos === 'CB' || pos === 'ST' || pos === 'CDM' ? 86 : 72, scaleFactor);
      const mentality = scaleStat(80, scaleFactor);

      // Detailed sub-stats
      const finishing = scaleStat(pos === 'ST' || pos === 'CF' ? 90 : pos === 'LW' || pos === 'RW' || pos === 'CAM' ? 78 : 45, scaleFactor);
      const creativity = scaleStat(pos === 'CAM' || pos === 'LW' || pos === 'RW' || pos === 'CM' ? 88 : 50, scaleFactor);
      const passing = scaleStat(pos === 'CAM' || pos === 'CM' || pos === 'CDM' ? 86 : 65, scaleFactor);
      const dribbling = scaleStat(pos === 'LW' || pos === 'RW' || pos === 'CAM' ? 90 : 65, scaleFactor);
      const defending = scaleStat(pos === 'CB' || pos === 'CDM' ? 90 : pos === 'LB' || pos === 'RB' ? 82 : 35, scaleFactor);
      const aerial = scaleStat(pos === 'CB' || pos === 'ST' ? 84 : 60, scaleFactor);
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
        league: 'Premier League',
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
