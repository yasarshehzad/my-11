/**
 * Authoritative Player Biometric & Physical Database
 * Provides authentic real-world data for modern football stars and legendary icons:
 * - Preferred Foot ('Right' | 'Left' | 'Both')
 * - Real Height (cm) & Weight (kg)
 * - Date of Birth (YYYY-MM-DD) & Birth Year
 * - Peak Season & Authentic Peak Age
 */

export interface PlayerBioInfo {
  preferredFoot: 'Right' | 'Left' | 'Both';
  heightCm: number;
  weightKg: number;
  birthYear: number;
  dateOfBirth?: string;
  peakSeason?: string;
  peakAge?: number;
}

// Normalized player lookup key: lowercase, stripped punctuation
export function normalizePlayerNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Verified Real-World Biometric & Profile Database
 */
export const PLAYER_BIO_RECORDS: Record<string, PlayerBioInfo> = {
  // ==========================================
  // TOP ALL-TIME LEGENDS & ICONS
  // ==========================================
  lionelmessi: { preferredFoot: 'Left', heightCm: 170, weightKg: 72, birthYear: 1987, dateOfBirth: '1987-06-24', peakSeason: '2011/12', peakAge: 24 },
  cristianoronaldo: { preferredFoot: 'Right', heightCm: 187, weightKg: 83, birthYear: 1985, dateOfBirth: '1985-02-05', peakSeason: '2011/12', peakAge: 27 },
  thierryhenry: { preferredFoot: 'Right', heightCm: 188, weightKg: 83, birthYear: 1977, dateOfBirth: '1977-08-17', peakSeason: '2003/04', peakAge: 26 },
  zinedinezidane: { preferredFoot: 'Both', heightCm: 185, weightKg: 79, birthYear: 1972, dateOfBirth: '1972-06-23', peakSeason: '2001/02', peakAge: 29 },
  ronaldonazario: { preferredFoot: 'Right', heightCm: 183, weightKg: 82, birthYear: 1976, dateOfBirth: '1976-09-18', peakSeason: '1997/98', peakAge: 21 },
  ronaldinho: { preferredFoot: 'Right', heightCm: 181, weightKg: 80, birthYear: 1980, dateOfBirth: '1980-03-21', peakSeason: '2005/06', peakAge: 25 },
  pele: { preferredFoot: 'Right', heightCm: 173, weightKg: 70, birthYear: 1940, dateOfBirth: '1940-10-23', peakSeason: '1962/63', peakAge: 22 },
  diegomaradona: { preferredFoot: 'Left', heightCm: 165, weightKg: 70, birthYear: 1960, dateOfBirth: '1960-10-30', peakSeason: '1986/87', peakAge: 26 },
  johancruyff: { preferredFoot: 'Both', heightCm: 180, weightKg: 71, birthYear: 1947, dateOfBirth: '1947-04-25', peakSeason: '1973/74', peakAge: 26 },
  dennisbergkamp: { preferredFoot: 'Right', heightCm: 183, weightKg: 78, birthYear: 1969, dateOfBirth: '1969-05-10', peakSeason: '1997/98', peakAge: 28 },
  stevengerrard: { preferredFoot: 'Right', heightCm: 183, weightKg: 83, birthYear: 1980, dateOfBirth: '1980-05-30', peakSeason: '2005/06', peakAge: 25 },
  franklampard: { preferredFoot: 'Right', heightCm: 184, weightKg: 84, birthYear: 1978, dateOfBirth: '1978-06-20', peakSeason: '2004/05', peakAge: 26 },
  paulscholes: { preferredFoot: 'Right', heightCm: 168, weightKg: 70, birthYear: 1974, dateOfBirth: '1974-11-16', peakSeason: '2002/03', peakAge: 28 },
  waynerooney: { preferredFoot: 'Right', heightCm: 176, weightKg: 82, birthYear: 1985, dateOfBirth: '1985-10-24', peakSeason: '2009/10', peakAge: 24 },
  alanshearer: { preferredFoot: 'Right', heightCm: 183, weightKg: 82, birthYear: 1970, dateOfBirth: '1970-08-13', peakSeason: '1994/95', peakAge: 24 },
  didierdrogba: { preferredFoot: 'Right', heightCm: 188, weightKg: 88, birthYear: 1978, dateOfBirth: '1978-03-11', peakSeason: '2009/10', peakAge: 31 },
  sergioaguero: { preferredFoot: 'Right', heightCm: 173, weightKg: 70, birthYear: 1988, dateOfBirth: '1988-06-02', peakSeason: '2011/12', peakAge: 23 },
  ericcantona: { preferredFoot: 'Right', heightCm: 188, weightKg: 88, birthYear: 1966, dateOfBirth: '1966-05-24', peakSeason: '1993/94', peakAge: 27 },
  patrickvieira: { preferredFoot: 'Right', heightCm: 192, weightKg: 85, birthYear: 1976, dateOfBirth: '1976-06-23', peakSeason: '2003/04', peakAge: 27 },
  roykeane: { preferredFoot: 'Right', heightCm: 178, weightKg: 76, birthYear: 1971, dateOfBirth: '1971-08-10', peakSeason: '1998/99', peakAge: 27 },
  johnterry: { preferredFoot: 'Right', heightCm: 187, weightKg: 88, birthYear: 1980, dateOfBirth: '1980-12-07', peakSeason: '2004/05', peakAge: 24 },
  rioferdinand: { preferredFoot: 'Right', heightCm: 189, weightKg: 84, birthYear: 1978, dateOfBirth: '1978-11-07', peakSeason: '2007/08', peakAge: 29 },
  nemanjavidic: { preferredFoot: 'Right', heightCm: 190, weightKg: 88, birthYear: 1981, dateOfBirth: '1981-10-21', peakSeason: '2008/09', peakAge: 27 },
  ashleycole: { preferredFoot: 'Left', heightCm: 176, weightKg: 66, birthYear: 1980, dateOfBirth: '1980-12-20', peakSeason: '2004/05', peakAge: 24 },
  patriceevra: { preferredFoot: 'Left', heightCm: 173, weightKg: 72, birthYear: 1981, dateOfBirth: '1981-05-15', peakSeason: '2008/09', peakAge: 27 },
  robertocarlos: { preferredFoot: 'Left', heightCm: 168, weightKg: 70, birthYear: 1973, dateOfBirth: '1973-04-10', peakSeason: '2001/02', peakAge: 28 },
  paolomaldini: { preferredFoot: 'Both', heightCm: 186, weightKg: 85, birthYear: 1968, dateOfBirth: '1968-06-26', peakSeason: '1993/94', peakAge: 25 },
  peterschmeichel: { preferredFoot: 'Right', heightCm: 193, weightKg: 96, birthYear: 1963, dateOfBirth: '1963-11-18', peakSeason: '1998/99', peakAge: 35 },
  petrcech: { preferredFoot: 'Left', heightCm: 196, weightKg: 90, birthYear: 1982, dateOfBirth: '1982-05-20', peakSeason: '2004/05', peakAge: 22 },
  edwinvandersar: { preferredFoot: 'Right', heightCm: 197, weightKg: 83, birthYear: 1970, dateOfBirth: '1970-10-29', peakSeason: '2008/09', peakAge: 38 },
  davidseaman: { preferredFoot: 'Right', heightCm: 191, weightKg: 93, birthYear: 1963, dateOfBirth: '1963-09-19', peakSeason: '1998/99', peakAge: 35 },
  shaygiven: { preferredFoot: 'Right', heightCm: 185, weightKg: 84, birthYear: 1976, dateOfBirth: '1976-04-20', peakSeason: '2001/02', peakAge: 25 },
  edenhazard: { preferredFoot: 'Right', heightCm: 175, weightKg: 74, birthYear: 1991, dateOfBirth: '1991-01-07', peakSeason: '2018/19', peakAge: 27 },
  garethbale: { preferredFoot: 'Left', heightCm: 185, weightKg: 81, birthYear: 1989, dateOfBirth: '1989-07-16', peakSeason: '2012/13', peakAge: 23 },
  arjenrobben: { preferredFoot: 'Left', heightCm: 180, weightKg: 80, birthYear: 1984, dateOfBirth: '1984-01-23', peakSeason: '2012/13', peakAge: 28 },
  robinvanpersie: { preferredFoot: 'Left', heightCm: 183, weightKg: 71, birthYear: 1983, dateOfBirth: '1983-08-06', peakSeason: '2011/12', peakAge: 28 },
  davidsilva: { preferredFoot: 'Left', heightCm: 170, weightKg: 67, birthYear: 1986, dateOfBirth: '1986-01-08', peakSeason: '2017/18', peakAge: 31 },
  yayatoure: { preferredFoot: 'Right', heightCm: 189, weightKg: 90, birthYear: 1983, dateOfBirth: '1983-05-13', peakSeason: '2013/14', peakAge: 30 },
  vincentkompany: { preferredFoot: 'Right', heightCm: 193, weightKg: 85, birthYear: 1986, dateOfBirth: '1986-04-10', peakSeason: '2011/12', peakAge: 25 },
  ryangiggs: { preferredFoot: 'Left', heightCm: 179, weightKg: 71, birthYear: 1973, dateOfBirth: '1973-11-29', peakSeason: '1998/99', peakAge: 25 },
  davidbeckham: { preferredFoot: 'Right', heightCm: 183, weightKg: 78, birthYear: 1975, dateOfBirth: '1975-05-02', peakSeason: '1998/99', peakAge: 23 },
  ruudvannistelrooy: { preferredFoot: 'Right', heightCm: 188, weightKg: 80, birthYear: 1976, dateOfBirth: '1976-07-01', peakSeason: '2002/03', peakAge: 26 },
  michaelowen: { preferredFoot: 'Right', heightCm: 173, weightKg: 70, birthYear: 1979, dateOfBirth: '1979-12-14', peakSeason: '2000/01', peakAge: 21 },
  robbiefowler: { preferredFoot: 'Left', heightCm: 175, weightKg: 73, birthYear: 1975, dateOfBirth: '1975-04-09', peakSeason: '1995/96', peakAge: 20 },
  ianwright: { preferredFoot: 'Right', heightCm: 175, weightKg: 73, birthYear: 1963, dateOfBirth: '1963-11-03', peakSeason: '1996/97', peakAge: 33 },
  gianfrancozola: { preferredFoot: 'Right', heightCm: 168, weightKg: 67, birthYear: 1966, dateOfBirth: '1966-07-05', peakSeason: '2002/03', peakAge: 36 },
  solcampbell: { preferredFoot: 'Right', heightCm: 188, weightKg: 89, birthYear: 1974, dateOfBirth: '1974-09-18', peakSeason: '2003/04', peakAge: 29 },
  tonyadams: { preferredFoot: 'Right', heightCm: 191, weightKg: 83, birthYear: 1966, dateOfBirth: '1966-10-10', peakSeason: '1997/98', peakAge: 31 },
  garyneville: { preferredFoot: 'Right', heightCm: 178, weightKg: 79, birthYear: 1975, dateOfBirth: '1975-02-18', peakSeason: '1998/99', peakAge: 23 },
  denisirwin: { preferredFoot: 'Both', heightCm: 173, weightKg: 71, birthYear: 1965, dateOfBirth: '1965-10-31', peakSeason: '1993/94', peakAge: 28 },
  xavi: { preferredFoot: 'Right', heightCm: 170, weightKg: 68, birthYear: 1980, dateOfBirth: '1980-01-25', peakSeason: '2009/10', peakAge: 29 },
  andresiniesta: { preferredFoot: 'Right', heightCm: 171, weightKg: 68, birthYear: 1984, dateOfBirth: '1984-05-11', peakSeason: '2011/12', peakAge: 27 },
  andreapirlo: { preferredFoot: 'Right', heightCm: 177, weightKg: 68, birthYear: 1979, dateOfBirth: '1979-05-19', peakSeason: '2006/07', peakAge: 27 },
  kaka: { preferredFoot: 'Right', heightCm: 186, weightKg: 82, birthYear: 1982, dateOfBirth: '1982-04-22', peakSeason: '2006/07', peakAge: 24 },
  lukamodric: { preferredFoot: 'Right', heightCm: 172, weightKg: 66, birthYear: 1985, dateOfBirth: '1985-09-09', peakSeason: '2017/18', peakAge: 32 },
  tonikroos: { preferredFoot: 'Both', heightCm: 183, weightKg: 78, birthYear: 1990, dateOfBirth: '1990-01-04', peakSeason: '2016/17', peakAge: 26 },
  sergiobusquets: { preferredFoot: 'Right', heightCm: 189, weightKg: 76, birthYear: 1988, dateOfBirth: '1988-07-16', peakSeason: '2011/12', peakAge: 23 },
  rivaldo: { preferredFoot: 'Left', heightCm: 186, weightKg: 75, birthYear: 1972, dateOfBirth: '1972-04-19', peakSeason: '1998/99', peakAge: 26 },
  mesutozil: { preferredFoot: 'Left', heightCm: 180, weightKg: 76, birthYear: 1988, dateOfBirth: '1988-10-15', peakSeason: '2015/16', peakAge: 27 },
  santicazorla: { preferredFoot: 'Both', heightCm: 168, weightKg: 67, birthYear: 1984, dateOfBirth: '1984-12-13', peakSeason: '2014/15', peakAge: 30 },

  // ==========================================
  // MODERN PREMIER LEAGUE STARS (2026/27 REAL AGES)
  // ==========================================
  // Manchester City
  erlinghaaland: { preferredFoot: 'Left', heightCm: 195, weightKg: 94, birthYear: 2000, dateOfBirth: '2000-07-21', peakAge: 26 },
  kevindebruyne: { preferredFoot: 'Right', heightCm: 181, weightKg: 75, birthYear: 1991, dateOfBirth: '1991-06-28', peakAge: 35 },
  philfoden: { preferredFoot: 'Left', heightCm: 171, weightKg: 70, birthYear: 2000, dateOfBirth: '2000-05-28', peakAge: 26 },
  rodri: { preferredFoot: 'Right', heightCm: 191, weightKg: 82, birthYear: 1996, dateOfBirth: '1996-06-22', peakAge: 30 },
  bernardosilva: { preferredFoot: 'Left', heightCm: 173, weightKg: 64, birthYear: 1994, dateOfBirth: '1994-08-10', peakAge: 32 },
  rubendias: { preferredFoot: 'Right', heightCm: 187, weightKg: 83, birthYear: 1997, dateOfBirth: '1997-05-14', peakAge: 29 },
  johnstones: { preferredFoot: 'Right', heightCm: 188, weightKg: 76, birthYear: 1994, dateOfBirth: '1994-05-28', peakAge: 32 },
  joskogvardiol: { preferredFoot: 'Left', heightCm: 185, weightKg: 80, birthYear: 2002, dateOfBirth: '2002-01-23', peakAge: 24 },
  kylewalker: { preferredFoot: 'Right', heightCm: 183, weightKg: 83, birthYear: 1990, dateOfBirth: '1990-05-28', peakAge: 36 },
  ricolewis: { preferredFoot: 'Right', heightCm: 169, weightKg: 65, birthYear: 2004, dateOfBirth: '2004-11-21', peakAge: 21 },
  savinho: { preferredFoot: 'Left', heightCm: 176, weightKg: 70, birthYear: 2004, dateOfBirth: '2004-04-10', peakAge: 22 },
  jeremydoku: { preferredFoot: 'Right', heightCm: 173, weightKg: 77, birthYear: 2002, dateOfBirth: '2002-05-27', peakAge: 24 },
  oscarbobb: { preferredFoot: 'Left', heightCm: 175, weightKg: 68, birthYear: 2003, dateOfBirth: '2003-07-12', peakAge: 23 },
  jamesmcatee: { preferredFoot: 'Left', heightCm: 180, weightKg: 70, birthYear: 2002, dateOfBirth: '2002-10-18', peakAge: 23 },
  stefanortega: { preferredFoot: 'Right', heightCm: 185, weightKg: 88, birthYear: 1992, dateOfBirth: '1992-11-06', peakAge: 33 },
  ederson: { preferredFoot: 'Left', heightCm: 188, weightKg: 86, birthYear: 1993, dateOfBirth: '1993-08-17', peakAge: 33 },
  edersonmoraes: { preferredFoot: 'Left', heightCm: 188, weightKg: 86, birthYear: 1993, dateOfBirth: '1993-08-17', peakAge: 33 },
  nathanake: { preferredFoot: 'Left', heightCm: 180, weightKg: 75, birthYear: 1995, dateOfBirth: '1995-02-18', peakAge: 31 },
  manuelakanji: { preferredFoot: 'Right', heightCm: 187, weightKg: 85, birthYear: 1995, dateOfBirth: '1995-07-19', peakAge: 31 },
  mateokovacic: { preferredFoot: 'Right', heightCm: 177, weightKg: 78, birthYear: 1994, dateOfBirth: '1994-05-06', peakAge: 32 },
  ilkaygundogan: { preferredFoot: 'Right', heightCm: 180, weightKg: 80, birthYear: 1990, dateOfBirth: '1990-10-24', peakAge: 35 },
  jackgrealish: { preferredFoot: 'Right', heightCm: 175, weightKg: 76, birthYear: 1995, dateOfBirth: '1995-09-10', peakAge: 31 },

  // Arsenal
  bukayosaka: { preferredFoot: 'Left', heightCm: 178, weightKg: 72, birthYear: 2001, dateOfBirth: '2001-09-05', peakAge: 25 },
  martinodegaard: { preferredFoot: 'Left', heightCm: 178, weightKg: 68, birthYear: 1998, dateOfBirth: '1998-12-17', peakAge: 27 },
  declanrice: { preferredFoot: 'Right', heightCm: 188, weightKg: 84, birthYear: 1999, dateOfBirth: '1999-01-14', peakAge: 27 },
  williamsaliba: { preferredFoot: 'Right', heightCm: 192, weightKg: 85, birthYear: 2001, dateOfBirth: '2001-03-24', peakAge: 25 },
  gabrielmagalhaes: { preferredFoot: 'Left', heightCm: 190, weightKg: 87, birthYear: 1997, dateOfBirth: '1997-12-19', peakAge: 28 },
  kaihavertz: { preferredFoot: 'Left', heightCm: 193, weightKg: 83, birthYear: 1999, dateOfBirth: '1999-06-11', peakAge: 27 },
  davidraya: { preferredFoot: 'Right', heightCm: 183, weightKg: 80, birthYear: 1995, dateOfBirth: '1995-09-15', peakAge: 31 },
  jurrientimber: { preferredFoot: 'Right', heightCm: 179, weightKg: 79, birthYear: 2001, dateOfBirth: '2001-06-17', peakAge: 25 },
  benwhite: { preferredFoot: 'Right', heightCm: 186, weightKg: 76, birthYear: 1997, dateOfBirth: '1997-10-08', peakAge: 28 },
  riccardocalafiori: { preferredFoot: 'Left', heightCm: 188, weightKg: 86, birthYear: 2002, dateOfBirth: '2002-05-19', peakAge: 24 },
  mikelmerino: { preferredFoot: 'Left', heightCm: 189, weightKg: 83, birthYear: 1996, dateOfBirth: '1996-06-22', peakAge: 30 },
  leandrotrossard: { preferredFoot: 'Right', heightCm: 172, weightKg: 67, birthYear: 1994, dateOfBirth: '1994-12-04', peakAge: 31 },
  gabrielmartinelli: { preferredFoot: 'Right', heightCm: 178, weightKg: 75, birthYear: 2001, dateOfBirth: '2001-06-18', peakAge: 25 },
  gabrieljesus: { preferredFoot: 'Right', heightCm: 175, weightKg: 73, birthYear: 1997, dateOfBirth: '1997-04-03', peakAge: 29 },
  raheemsterling: { preferredFoot: 'Right', heightCm: 170, weightKg: 69, birthYear: 1994, dateOfBirth: '1994-12-08', peakAge: 31 },
  ethannwaneri: { preferredFoot: 'Left', heightCm: 176, weightKg: 69, birthYear: 2007, dateOfBirth: '2007-03-21', peakAge: 19 },
  myleslewisskelly: { preferredFoot: 'Left', heightCm: 178, weightKg: 72, birthYear: 2006, dateOfBirth: '2006-09-26', peakAge: 19 },
  jakubkiwior: { preferredFoot: 'Left', heightCm: 189, weightKg: 75, birthYear: 2000, dateOfBirth: '2000-02-15', peakAge: 26 },
  oleksandrzinchenko: { preferredFoot: 'Left', heightCm: 175, weightKg: 64, birthYear: 1996, dateOfBirth: '1996-12-15', peakAge: 29 },
  thomaspartey: { preferredFoot: 'Right', heightCm: 185, weightKg: 77, birthYear: 1993, dateOfBirth: '1993-06-13', peakAge: 33 },
  jorginho: { preferredFoot: 'Right', heightCm: 180, weightKg: 68, birthYear: 1991, dateOfBirth: '1991-12-20', peakAge: 34 },

  // Liverpool
  mohamedsalah: { preferredFoot: 'Left', heightCm: 175, weightKg: 71, birthYear: 1992, dateOfBirth: '1992-06-15', peakAge: 34 },
  virgilvandijk: { preferredFoot: 'Right', heightCm: 193, weightKg: 92, birthYear: 1991, dateOfBirth: '1991-07-08', peakAge: 35 },
  trentalexanderarnold: { preferredFoot: 'Right', heightCm: 175, weightKg: 69, birthYear: 1998, dateOfBirth: '1998-10-07', peakAge: 27 },
  alissonbecker: { preferredFoot: 'Right', heightCm: 191, weightKg: 91, birthYear: 1992, dateOfBirth: '1992-10-02', peakAge: 33 },
  alisson: { preferredFoot: 'Right', heightCm: 191, weightKg: 91, birthYear: 1992, dateOfBirth: '1992-10-02', peakAge: 33 },
  alexismacallister: { preferredFoot: 'Right', heightCm: 174, weightKg: 72, birthYear: 1998, dateOfBirth: '1998-12-24', peakAge: 27 },
  dominikszoboszlai: { preferredFoot: 'Right', heightCm: 186, weightKg: 74, birthYear: 2000, dateOfBirth: '2000-10-25', peakAge: 25 },
  ryangravenberch: { preferredFoot: 'Right', heightCm: 190, weightKg: 83, birthYear: 2002, dateOfBirth: '2002-05-16', peakAge: 24 },
  luisdiaz: { preferredFoot: 'Right', heightCm: 178, weightKg: 73, birthYear: 1997, dateOfBirth: '1997-01-13', peakAge: 29 },
  codygakpo: { preferredFoot: 'Right', heightCm: 193, weightKg: 83, birthYear: 1999, dateOfBirth: '1999-05-07', peakAge: 27 },
  darwinnunez: { preferredFoot: 'Right', heightCm: 187, weightKg: 81, birthYear: 1999, dateOfBirth: '1999-06-24', peakAge: 27 },
  andyrobertson: { preferredFoot: 'Left', heightCm: 178, weightKg: 64, birthYear: 1994, dateOfBirth: '1994-03-11', peakAge: 32 },
  andrewrobertson: { preferredFoot: 'Left', heightCm: 178, weightKg: 64, birthYear: 1994, dateOfBirth: '1994-03-11', peakAge: 32 },
  ibrahimakonate: { preferredFoot: 'Right', heightCm: 194, weightKg: 95, birthYear: 1999, dateOfBirth: '1999-05-25', peakAge: 27 },
  conorbradley: { preferredFoot: 'Right', heightCm: 181, weightKg: 68, birthYear: 2003, dateOfBirth: '2003-07-09', peakAge: 23 },
  jarellquansah: { preferredFoot: 'Right', heightCm: 190, weightKg: 80, birthYear: 2003, dateOfBirth: '2003-01-29', peakAge: 23 },
  harveyelliott: { preferredFoot: 'Left', heightCm: 170, weightKg: 67, birthYear: 2003, dateOfBirth: '2003-04-04', peakAge: 23 },
  curtisjones: { preferredFoot: 'Right', heightCm: 185, weightKg: 78, birthYear: 2001, dateOfBirth: '2001-01-30', peakAge: 25 },
  diogojota: { preferredFoot: 'Both', heightCm: 178, weightKg: 73, birthYear: 1996, dateOfBirth: '1996-12-04', peakAge: 29 },
  federicochiesa: { preferredFoot: 'Right', heightCm: 175, weightKg: 70, birthYear: 1997, dateOfBirth: '1997-10-25', peakAge: 28 },

  // Chelsea
  colepalmer: { preferredFoot: 'Left', heightCm: 189, weightKg: 74, birthYear: 2002, dateOfBirth: '2002-05-06', peakAge: 24 },
  nicolasjackson: { preferredFoot: 'Right', heightCm: 186, weightKg: 78, birthYear: 2001, dateOfBirth: '2001-06-20', peakAge: 25 },
  enzofernandez: { preferredFoot: 'Right', heightCm: 178, weightKg: 77, birthYear: 2001, dateOfBirth: '2001-01-17', peakAge: 25 },
  moisescaicedo: { preferredFoot: 'Right', heightCm: 178, weightKg: 73, birthYear: 2001, dateOfBirth: '2001-11-02', peakAge: 24 },
  levicolwill: { preferredFoot: 'Left', heightCm: 187, weightKg: 82, birthYear: 2003, dateOfBirth: '2003-02-26', peakAge: 23 },
  wesleyfofana: { preferredFoot: 'Right', heightCm: 190, weightKg: 84, birthYear: 2000, dateOfBirth: '2000-12-17', peakAge: 25 },
  reecejames: { preferredFoot: 'Right', heightCm: 178, weightKg: 82, birthYear: 1999, dateOfBirth: '1999-12-08', peakAge: 26 },
  malogusto: { preferredFoot: 'Right', heightCm: 179, weightKg: 74, birthYear: 2003, dateOfBirth: '2003-05-19', peakAge: 23 },
  marccucurella: { preferredFoot: 'Left', heightCm: 172, weightKg: 66, birthYear: 1998, dateOfBirth: '1998-07-22', peakAge: 28 },
  nonimadueke: { preferredFoot: 'Left', heightCm: 182, weightKg: 70, birthYear: 2002, dateOfBirth: '2002-03-10', peakAge: 24 },
  pedroneto: { preferredFoot: 'Left', heightCm: 173, weightKg: 69, birthYear: 2000, dateOfBirth: '2000-03-09', peakAge: 26 },
  jadonsancho: { preferredFoot: 'Right', heightCm: 180, weightKg: 76, birthYear: 2000, dateOfBirth: '2000-03-25', peakAge: 26 },
  joaofelix: { preferredFoot: 'Right', heightCm: 181, weightKg: 70, birthYear: 1999, dateOfBirth: '1999-11-10', peakAge: 26 },
  christophernkunku: { preferredFoot: 'Right', heightCm: 175, weightKg: 73, birthYear: 1997, dateOfBirth: '1997-11-14', peakAge: 28 },
  romeolavia: { preferredFoot: 'Right', heightCm: 181, weightKg: 75, birthYear: 2004, dateOfBirth: '2004-01-06', peakAge: 22 },
  robertsanchez: { preferredFoot: 'Right', heightCm: 197, weightKg: 85, birthYear: 1997, dateOfBirth: '1997-11-18', peakAge: 28 },

  // Tottenham Hotspur
  heungminson: { preferredFoot: 'Both', heightCm: 184, weightKg: 78, birthYear: 1992, dateOfBirth: '1992-07-08', peakAge: 34 },
  sonheungmin: { preferredFoot: 'Both', heightCm: 184, weightKg: 78, birthYear: 1992, dateOfBirth: '1992-07-08', peakAge: 34 },
  jamesmaddison: { preferredFoot: 'Right', heightCm: 175, weightKg: 73, birthYear: 1996, dateOfBirth: '1996-11-23', peakAge: 29 },
  dejankulusevski: { preferredFoot: 'Left', heightCm: 186, weightKg: 75, birthYear: 2000, dateOfBirth: '2000-04-25', peakAge: 26 },
  dominsolanke: { preferredFoot: 'Right', heightCm: 187, weightKg: 80, birthYear: 1997, dateOfBirth: '1997-09-14', peakAge: 28 },
  dominicsolanke: { preferredFoot: 'Right', heightCm: 187, weightKg: 80, birthYear: 1997, dateOfBirth: '1997-09-14', peakAge: 28 },
  brennanjohnson: { preferredFoot: 'Right', heightCm: 186, weightKg: 73, birthYear: 2001, dateOfBirth: '2001-05-23', peakAge: 25 },
  mickyvandeven: { preferredFoot: 'Left', heightCm: 193, weightKg: 81, birthYear: 2001, dateOfBirth: '2001-04-19', peakAge: 25 },
  cristianromero: { preferredFoot: 'Right', heightCm: 185, weightKg: 79, birthYear: 1998, dateOfBirth: '1998-04-27', peakAge: 28 },
  pedroporro: { preferredFoot: 'Right', heightCm: 173, weightKg: 71, birthYear: 1999, dateOfBirth: '1999-09-13', peakAge: 27 },
  destinyudogie: { preferredFoot: 'Left', heightCm: 186, weightKg: 79, birthYear: 2002, dateOfBirth: '2002-11-28', peakAge: 23 },
  guglielmovicario: { preferredFoot: 'Right', heightCm: 194, weightKg: 83, birthYear: 1996, dateOfBirth: '1996-10-05', peakAge: 29 },

  // Manchester United
  brunofernandes: { preferredFoot: 'Right', heightCm: 179, weightKg: 69, birthYear: 1994, dateOfBirth: '1994-09-08', peakAge: 32 },
  kobbiemainoo: { preferredFoot: 'Right', heightCm: 175, weightKg: 70, birthYear: 2005, dateOfBirth: '2005-04-19', peakAge: 21 },
  alejandrogarnacho: { preferredFoot: 'Right', heightCm: 180, weightKg: 72, birthYear: 2004, dateOfBirth: '2004-07-01', peakAge: 22 },
  marcusrashford: { preferredFoot: 'Right', heightCm: 180, weightKg: 70, birthYear: 1997, dateOfBirth: '1997-10-31', peakAge: 28 },
  rasmushojlund: { preferredFoot: 'Left', heightCm: 191, weightKg: 86, birthYear: 2003, dateOfBirth: '2003-02-04', peakAge: 23 },
  amaddiallo: { preferredFoot: 'Left', heightCm: 173, weightKg: 68, birthYear: 2002, dateOfBirth: '2002-07-11', peakAge: 24 },
  matthijsdeligt: { preferredFoot: 'Right', heightCm: 189, weightKg: 89, birthYear: 1999, dateOfBirth: '1999-08-12', peakAge: 27 },
  lisandromartinez: { preferredFoot: 'Left', heightCm: 175, weightKg: 77, birthYear: 1998, dateOfBirth: '1998-01-18', peakAge: 28 },
  diogodalot: { preferredFoot: 'Right', heightCm: 183, weightKg: 76, birthYear: 1999, dateOfBirth: '1999-03-18', peakAge: 27 },
  noussairmazraoui: { preferredFoot: 'Right', heightCm: 183, weightKg: 70, birthYear: 1997, dateOfBirth: '1997-11-14', peakAge: 28 },
  andreonana: { preferredFoot: 'Right', heightCm: 190, weightKg: 93, birthYear: 1996, dateOfBirth: '1996-04-02', peakAge: 30 },
  manuelugarte: { preferredFoot: 'Right', heightCm: 182, weightKg: 77, birthYear: 2001, dateOfBirth: '2001-04-11', peakAge: 25 },
  casemiro: { preferredFoot: 'Right', heightCm: 185, weightKg: 84, birthYear: 1992, dateOfBirth: '1992-02-23', peakAge: 34 },
  lukeshaw: { preferredFoot: 'Left', heightCm: 178, weightKg: 75, birthYear: 1995, dateOfBirth: '1995-07-12', peakAge: 31 },

  // Newcastle United
  alexanderisak: { preferredFoot: 'Right', heightCm: 192, weightKg: 77, birthYear: 1999, dateOfBirth: '1999-09-21', peakAge: 26 },
  anthonygordon: { preferredFoot: 'Right', heightCm: 183, weightKg: 71, birthYear: 2001, dateOfBirth: '2001-02-24', peakAge: 25 },
  brunoguimaraes: { preferredFoot: 'Right', heightCm: 182, weightKg: 78, birthYear: 1997, dateOfBirth: '1997-11-16', peakAge: 28 },
  sandrotonali: { preferredFoot: 'Right', heightCm: 181, weightKg: 79, birthYear: 2000, dateOfBirth: '2000-05-08', peakAge: 26 },
  joelinton: { preferredFoot: 'Right', heightCm: 186, weightKg: 81, birthYear: 1996, dateOfBirth: '1996-08-14', peakAge: 30 },
  kierantrippier: { preferredFoot: 'Right', heightCm: 178, weightKg: 71, birthYear: 1990, dateOfBirth: '1990-09-19', peakAge: 36 },
  tinolivramento: { preferredFoot: 'Right', heightCm: 181, weightKg: 70, birthYear: 2002, dateOfBirth: '2002-11-12', peakAge: 23 },
  svenbotman: { preferredFoot: 'Left', heightCm: 193, weightKg: 86, birthYear: 2000, dateOfBirth: '2000-01-12', peakAge: 26 },
  danburn: { preferredFoot: 'Left', heightCm: 201, weightKg: 87, birthYear: 1992, dateOfBirth: '1992-05-09', peakAge: 34 },
  nickpope: { preferredFoot: 'Right', heightCm: 199, weightKg: 90, birthYear: 1992, dateOfBirth: '1992-04-19', peakAge: 34 },
  harveybarnes: { preferredFoot: 'Right', heightCm: 174, weightKg: 66, birthYear: 1997, dateOfBirth: '1997-12-09', peakAge: 28 },
  lewishall: { preferredFoot: 'Left', heightCm: 179, weightKg: 70, birthYear: 2004, dateOfBirth: '2004-09-08', peakAge: 22 },

  // Aston Villa
  olliewatkins: { preferredFoot: 'Right', heightCm: 180, weightKg: 70, birthYear: 1995, dateOfBirth: '1995-12-30', peakAge: 30 },
  emilianomartinez: { preferredFoot: 'Right', heightCm: 195, weightKg: 88, birthYear: 1992, dateOfBirth: '1992-09-02', peakAge: 34 },
  pautorres: { preferredFoot: 'Left', heightCm: 191, weightKg: 84, birthYear: 1997, dateOfBirth: '1997-01-16', peakAge: 29 },
  ezrikonsa: { preferredFoot: 'Right', heightCm: 183, weightKg: 77, birthYear: 1997, dateOfBirth: '1997-10-23', peakAge: 28 },
  johnmcginn: { preferredFoot: 'Left', heightCm: 178, weightKg: 68, birthYear: 1994, dateOfBirth: '1994-10-18', peakAge: 31 },
  youritielemans: { preferredFoot: 'Right', heightCm: 176, weightKg: 72, birthYear: 1997, dateOfBirth: '1997-05-07', peakAge: 29 },
  leonbailey: { preferredFoot: 'Left', heightCm: 178, weightKg: 75, birthYear: 1997, dateOfBirth: '1997-08-09', peakAge: 29 },
  jhonduran: { preferredFoot: 'Left', heightCm: 185, weightKg: 80, birthYear: 2003, dateOfBirth: '2003-12-13', peakAge: 22 },
  morganrogers: { preferredFoot: 'Right', heightCm: 187, weightKg: 81, birthYear: 2002, dateOfBirth: '2002-07-26', peakAge: 24 },
  amadouonana: { preferredFoot: 'Right', heightCm: 195, weightKg: 85, birthYear: 2001, dateOfBirth: '2001-08-16', peakAge: 25 },
  boubacarkamara: { preferredFoot: 'Right', heightCm: 184, weightKg: 68, birthYear: 1999, dateOfBirth: '1999-11-23', peakAge: 26 },
  lucasdigne: { preferredFoot: 'Left', heightCm: 178, weightKg: 74, birthYear: 1993, dateOfBirth: '1993-07-20', peakAge: 33 },
  mattycash: { preferredFoot: 'Right', heightCm: 185, weightKg: 73, birthYear: 1997, dateOfBirth: '1997-08-07', peakAge: 29 },

  // Continental Superstars
  kylianmbappe: { preferredFoot: 'Right', heightCm: 178, weightKg: 75, birthYear: 1998, dateOfBirth: '1998-12-20', peakAge: 27 },
  judebellingham: { preferredFoot: 'Right', heightCm: 186, weightKg: 75, birthYear: 2003, dateOfBirth: '2003-06-29', peakAge: 23 },
  viniciusjunior: { preferredFoot: 'Right', heightCm: 176, weightKg: 73, birthYear: 2000, dateOfBirth: '2000-07-12', peakAge: 26 },
  harrykane: { preferredFoot: 'Right', heightCm: 188, weightKg: 86, birthYear: 1993, dateOfBirth: '1993-07-28', peakAge: 33 },
  robertlewandowski: { preferredFoot: 'Right', heightCm: 185, weightKg: 81, birthYear: 1988, dateOfBirth: '1988-08-21', peakAge: 38 },
  jamalmusiala: { preferredFoot: 'Right', heightCm: 184, weightKg: 72, birthYear: 2003, dateOfBirth: '2003-02-26', peakAge: 23 },
  florianwirtz: { preferredFoot: 'Right', heightCm: 177, weightKg: 71, birthYear: 2003, dateOfBirth: '2003-05-03', peakAge: 23 },
  lamineyamal: { preferredFoot: 'Left', heightCm: 180, weightKg: 68, birthYear: 2007, dateOfBirth: '2007-07-13', peakAge: 19 },
  pedri: { preferredFoot: 'Right', heightCm: 174, weightKg: 61, birthYear: 2002, dateOfBirth: '2002-11-25', peakAge: 23 },
  gavi: { preferredFoot: 'Right', heightCm: 173, weightKg: 70, birthYear: 2004, dateOfBirth: '2004-08-05', peakAge: 22 },
  federicovalverde: { preferredFoot: 'Right', heightCm: 182, weightKg: 78, birthYear: 1998, dateOfBirth: '1998-07-22', peakAge: 28 },
  eduardocamavinga: { preferredFoot: 'Left', heightCm: 182, weightKg: 68, birthYear: 2002, dateOfBirth: '2002-11-10', peakAge: 23 },
  aurelientchouameni: { preferredFoot: 'Right', heightCm: 187, weightKg: 81, birthYear: 2000, dateOfBirth: '2000-01-27', peakAge: 26 },
  thibautcourtois: { preferredFoot: 'Left', heightCm: 200, weightKg: 96, birthYear: 1992, dateOfBirth: '1992-05-11', peakAge: 34 },
  manuelneuer: { preferredFoot: 'Right', heightCm: 193, weightKg: 93, birthYear: 1986, dateOfBirth: '1986-03-27', peakAge: 40 },
  gianluigidonnarumma: { preferredFoot: 'Right', heightCm: 196, weightKg: 90, birthYear: 1999, dateOfBirth: '1999-02-25', peakAge: 27 },
  lautaromartinez: { preferredFoot: 'Right', heightCm: 174, weightKg: 72, birthYear: 1997, dateOfBirth: '1997-08-22', peakAge: 29 },
  nicologb形势: { preferredFoot: 'Right', heightCm: 172, weightKg: 68, birthYear: 1997, dateOfBirth: '1997-02-07', peakAge: 29 },
  nicolobarella: { preferredFoot: 'Right', heightCm: 172, weightKg: 68, birthYear: 1997, dateOfBirth: '1997-02-07', peakAge: 29 },
  alessandrobastoni: { preferredFoot: 'Left', heightCm: 190, weightKg: 75, birthYear: 1999, dateOfBirth: '1999-04-13', peakAge: 27 },
  federicodimarco: { preferredFoot: 'Left', heightCm: 175, weightKg: 75, birthYear: 1997, dateOfBirth: '1997-11-10', peakAge: 28 },
  theohernandez: { preferredFoot: 'Left', heightCm: 184, weightKg: 81, birthYear: 1997, dateOfBirth: '1997-10-06', peakAge: 28 },
  alphonsodavies: { preferredFoot: 'Left', heightCm: 183, weightKg: 75, birthYear: 2000, dateOfBirth: '2000-11-02', peakAge: 25 },
  ousmanedembele: { preferredFoot: 'Both', heightCm: 178, weightKg: 67, birthYear: 1997, dateOfBirth: '1997-05-15', peakAge: 29 },
  antoniogriezmann: { preferredFoot: 'Left', heightCm: 176, weightKg: 73, birthYear: 1991, dateOfBirth: '1991-03-21', peakAge: 35 },
  antoinegriezmann: { preferredFoot: 'Left', heightCm: 176, weightKg: 73, birthYear: 1991, dateOfBirth: '1991-03-21', peakAge: 35 },
};

/**
 * Retrieves authentic player biometrics with intelligent positional defaults for unlisted players.
 */
export function getPlayerBio(
  nameOrId: string,
  fallbackPosition: string = 'CM'
): PlayerBioInfo {
  const normKey = normalizePlayerNameKey(nameOrId);
  const found = PLAYER_BIO_RECORDS[normKey];
  if (found) {
    return { ...found };
  }

  // Check partial name match (e.g. "Messi", "Haaland", "De Bruyne")
  for (const [key, bio] of Object.entries(PLAYER_BIO_RECORDS)) {
    if (key.includes(normKey) || normKey.includes(key)) {
      return { ...bio };
    }
  }

  // Intelligent fallback for non-mapped players based on position
  const pos = fallbackPosition.toUpperCase();
  let defaultFoot: 'Right' | 'Left' | 'Both' = 'Right';
  if (pos === 'LB' || pos === 'LWB' || pos === 'LM' || pos === 'LW') {
    defaultFoot = 'Left';
  }

  let heightCm = 182;
  let weightKg = 76;
  if (pos === 'GK') {
    heightCm = 191;
    weightKg = 86;
  } else if (pos === 'CB') {
    heightCm = 188;
    weightKg = 83;
  } else if (['LB', 'RB', 'LWB', 'RWB'].includes(pos)) {
    heightCm = 178;
    weightKg = 73;
  } else if (pos === 'ST' || pos === 'CF') {
    heightCm = 185;
    weightKg = 80;
  } else if (['LM', 'RM', 'LW', 'RW'].includes(pos)) {
    heightCm = 176;
    weightKg = 71;
  }

  return {
    preferredFoot: defaultFoot,
    heightCm,
    weightKg,
    birthYear: 2000,
  };
}
