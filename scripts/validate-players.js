// Validates the generated player database. Hard errors fail the build; warnings are advisory.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const file = path.join(__dirname, '..', 'src', 'data', 'players.ts');
const source = fs.readFileSync(file, 'utf8');
const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const mod = { exports: {} };
new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, require);
const players = mod.exports.players;

const errors = [];
const warnings = [];

// 1. Unique IDs
const seen = new Set();
for (const p of players) {
  if (seen.has(p.id)) errors.push(`Duplicate id: ${p.id}`);
  seen.add(p.id);
}

// 2. Required fields and stat ranges
const statKeys = ['rating', 'attack', 'midfield', 'defence', 'pace', 'technique', 'physical',
  'finishing', 'creativity', 'passing', 'dribbling', 'defending', 'aerial'];
for (const p of players) {
  if (!p.club) errors.push(`${p.id}: missing club`);
  if (!p.league) errors.push(`${p.id}: missing league`);
  for (const k of statKeys) {
    if (typeof p[k] !== 'number' || p[k] < 1 || p[k] > 99) errors.push(`${p.id}: ${k}=${p[k]} out of range`);
  }
}

// 3. Override names must match a real base player
const baseNames = new Set(players.map((p) => p.playerName));
const block = source.match(/const statOverrides[\s\S]*?\n};/);
if (block) {
  for (const m of block[0].matchAll(/^\s*'([^']+)':\s*\{/gm)) {
    if (!baseNames.has(m[1])) errors.push(`statOverrides: no player named "${m[1]}"`);
  }
}

// 4. Group by player (used for the summary count)
const byPlayer = {};
for (const p of players) (byPlayer[p.playerName] = byPlayer[p.playerName] || []).push(p);

// 5. Suspicious stat profiles
for (const p of players) {
  const fullback = p.primaryPosition === 'LB' || p.primaryPosition === 'RB';
  if (fullback && p.defence > 92) warnings.push(`${p.id}: full-back defence ${p.defence}`);
  if (p.pace > 97 && p.playerName !== 'Kylian Mbappe') warnings.push(`${p.id}: pace ${p.pace}`);
  if (p.primaryPosition === 'CB' && p.pace > 90) warnings.push(`${p.id}: centre-back pace ${p.pace}`);
}

console.log(`Checked ${players.length} cards for ${Object.keys(byPlayer).length} players.`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.slice(0, 40).forEach((w) => console.log('  - ' + w));
  if (warnings.length > 40) console.log(`  ...and ${warnings.length - 40} more`);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.slice(0, 40).forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\nPlayer data valid.');
