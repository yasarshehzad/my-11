/**
 * Exports static player bio records & supplemental/continental career squad datasets
 * from src/career/raw/*.ts into public/data/*.json so Next.js static bundles stay slim
 * and load heavy datasets lazily on-demand (while Node/Vitest reads them synchronously).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'src', 'career', 'raw');
const OUT_DIR = path.join(ROOT, 'public', 'data');

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  const fakeRequire = () => ({});
  new Function('module', 'exports', 'require', transpiled.outputText)(mod, mod.exports, fakeRequire);
  return mod.exports;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const continental = loadTsModule(path.join(RAW_DIR, 'continentalPlayersData.ts'));
const supplemental = loadTsModule(path.join(RAW_DIR, 'supplementalPlayersData.ts'));
const bioRecords = loadTsModule(path.join(RAW_DIR, 'playerBioRecordsData.ts'));

const payload2026 = {
  pl: supplemental.SUPPLEMENTAL_PLAYERS_2026_27 || [],
  continental: continental.CONTINENTAL_PLAYERS_2026_27 || [],
};

const payloadArchive = {
  pl2024_25: supplemental.SUPPLEMENTAL_PLAYERS_2024_25 || [],
  pl2025_26: supplemental.SUPPLEMENTAL_PLAYERS_2025_26 || [],
  continental2024_25: continental.CONTINENTAL_PLAYERS_2024_25 || [],
  continental2025_26: continental.CONTINENTAL_PLAYERS_2025_26 || [],
};

const payloadBios = bioRecords.PLAYER_BIO_RECORDS || {};

if (payload2026.pl.length === 0 || payload2026.continental.length === 0) {
  throw new Error('export-static-data: Empty 2026/27 supplemental/continental dataset!');
}
if (Object.keys(payloadBios).length === 0) {
  throw new Error('export-static-data: Empty PLAYER_BIO_RECORDS!');
}

fs.writeFileSync(path.join(OUT_DIR, 'supplemental-2026-27.json'), JSON.stringify(payload2026));
fs.writeFileSync(path.join(OUT_DIR, 'supplemental-archive.json'), JSON.stringify(payloadArchive));
fs.writeFileSync(path.join(OUT_DIR, 'player-bio-records.json'), JSON.stringify(payloadBios));

console.log(
  `[export-static-data] Exported 26/27 (${payload2026.pl.length} PL + ${payload2026.continental.length} Cont), Archive (${payloadArchive.pl2024_25.length + payloadArchive.pl2025_26.length} PL + ${payloadArchive.continental2024_25.length + payloadArchive.continental2025_26.length} Cont), Bios (${Object.keys(payloadBios).length} records).`
);
