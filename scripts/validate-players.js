// Validates the generated player database. Hard errors fail the build; warnings are advisory.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Custom module resolver to transpile TypeScript imports inside src/data/
const customRequire = (id) => {
  if (id.startsWith('.')) {
    const fullPath = path.resolve(__dirname, '..', 'src', 'data', id);
    const tsPath = fullPath.endsWith('.ts') ? fullPath : fullPath + '.ts';
    if (fs.existsSync(tsPath)) {
      const modSource = fs.readFileSync(tsPath, 'utf8');
      const modOut = ts.transpileModule(modSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
      const subMod = { exports: {} };
      new Function('module', 'exports', 'require', modOut.outputText)(subMod, subMod.exports, customRequire);
      return subMod.exports;
    }
  }
  return require(id);
};

const playersFile = path.resolve(__dirname, '..', 'src', 'data', 'players.ts');
const source = fs.readFileSync(playersFile, 'utf8');
const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const mod = { exports: {} };
new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, customRequire);

const players = mod.exports.players;
const careerMod = customRequire('./careerData');
const careerRegistry = careerMod.careerRegistry;
const overrideMod = customRequire('./seasonOverrides');
const seasonOverrides = overrideMod.seasonOverrides;

const errors = [];
const warnings = [];

// 1. Unique IDs
const seen = new Set();
for (const p of players) {
  if (seen.has(p.id)) errors.push(`Duplicate id: ${p.id}`);
  seen.add(p.id);
}

// 2. Required fields and stat ranges (1-99)
const validPositions = new Set([
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'
]);

const statKeys = [
  'rating', 'attack', 'midfield', 'defence', 'pace', 'technique', 'physical',
  'mentality', 'finishing', 'creativity', 'passing', 'dribbling', 'defending',
  'aerial', 'pressing', 'leadership', 'bigGame', 'consistency'
];

for (const p of players) {
  if (!p.club) errors.push(`${p.id}: missing club`);
  if (!p.league) errors.push(`${p.id}: missing league`);
  if (!p.season) errors.push(`${p.id}: missing season`);
  if (!p.displayName) errors.push(`${p.id}: missing displayName`);

  // Valid position check
  if (!validPositions.has(p.primaryPosition)) {
    errors.push(`${p.id}: invalid primary position "${p.primaryPosition}"`);
  }
  if (Array.isArray(p.secondaryPositions)) {
    for (const sec of p.secondaryPositions) {
      if (!validPositions.has(sec)) {
        errors.push(`${p.id}: invalid secondary position "${sec}"`);
      }
    }
  }

  // Season label format: YYYY/YY
  if (!/^\d{4}\/\d{2}$/.test(p.season)) {
    errors.push(`${p.id}: invalid season format "${p.season}", expected YYYY/YY`);
  }

  for (const k of statKeys) {
    if (typeof p[k] !== 'number' || p[k] < 1 || p[k] > 99) {
      errors.push(`${p.id}: ${k}=${p[k]} out of range [1-99]`);
    }
  }
}

// 3. Career bounds check (no cards before debut or after retirement)
let careerBoundsViolations = 0;
for (const p of players) {
  const meta = careerRegistry[p.playerName];
  if (!meta) {
    errors.push(`Missing career registry entry for base player "${p.playerName}"`);
    continue;
  }
  const year = parseInt(p.season.split('/')[0], 10);
  if (year < meta.careerStartYear) {
    errors.push(`${p.id}: generated year ${year} before careerStartYear ${meta.careerStartYear}`);
    careerBoundsViolations++;
  }
  if (meta.isRetired && meta.careerEndYear !== undefined && year > meta.careerEndYear) {
    errors.push(`${p.id}: generated year ${year} after careerEndYear ${meta.careerEndYear} (retired)`);
    careerBoundsViolations++;
  }
}

// 4. Season overrides integrity (all overrides in seasonOverrides.ts must be applied)
const overrideEntries = Object.entries(seasonOverrides);
for (const [ovKey, ov] of overrideEntries) {
  const parts = ovKey.split('_');
  const year = parseInt(parts[parts.length - 1], 10);
  const cleanKey = ovKey.replace(/[^a-z0-9]/g, '');

  const matchingCard = players.find(p => {
    const cardYear = parseInt(p.season.split('/')[0], 10);
    const cleanName = p.playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cardYear === year && cleanKey.startsWith(cleanName);
  });

  if (!matchingCard) {
    errors.push(`Override ${ovKey}: no matching season card generated for year ${year}`);
  } else {
    if (ov.rating !== undefined && matchingCard.rating !== ov.rating) {
      errors.push(`Override ${ovKey}: rating mismatch (expected ${ov.rating}, got ${matchingCard.rating})`);
    }
    if (ov.specialTrait !== undefined && matchingCard.specialTrait !== ov.specialTrait) {
      errors.push(`Override ${ovKey}: trait mismatch (expected "${ov.specialTrait}", got "${matchingCard.specialTrait}")`);
    }
    if (ov.primaryPosition !== undefined && matchingCard.primaryPosition !== ov.primaryPosition) {
      errors.push(`Override ${ovKey}: position mismatch (expected "${ov.primaryPosition}", got "${matchingCard.primaryPosition}")`);
    }
  }
}

// 5. Group by player
const byPlayer = {};
for (const p of players) (byPlayer[p.playerName] = byPlayer[p.playerName] || []).push(p);

// 6. Suspicious stat profiles & warnings
for (const p of players) {
  const fullback = p.primaryPosition === 'LB' || p.primaryPosition === 'RB';
  if (fullback && p.defence > 92) warnings.push(`${p.id}: full-back defence ${p.defence}`);
  if (p.pace > 97 && p.playerName !== 'Kylian Mbappe') warnings.push(`${p.id}: pace ${p.pace}`);
  if (p.primaryPosition === 'CB' && p.pace > 90) warnings.push(`${p.id}: centre-back pace ${p.pace}`);
}

// 7. Distributions summary
const eraCounts = { '90s': 0, '00s': 0, '10s': 0, 'Modern': 0 };
const posCounts = {};
const rarityCounts = { common: 0, solid: 0, rare: 0, elite: 0, cult: 0, legend: 0 };
const ratingTiers = {
  '70-77 (Modest)': 0,
  '78-83 (Solid)': 0,
  '84-88 (Strong)': 0,
  '89-92 (Elite)': 0,
  '93-95 (Exceptional)': 0,
  '96-99 (Historically Outstanding)': 0,
};

for (const p of players) {
  if (eraCounts[p.era] !== undefined) eraCounts[p.era]++;
  posCounts[p.primaryPosition] = (posCounts[p.primaryPosition] || 0) + 1;
  if (rarityCounts[p.rarity] !== undefined) rarityCounts[p.rarity]++;
  
  if (p.rating <= 77) ratingTiers['70-77 (Modest)']++;
  else if (p.rating <= 83) ratingTiers['78-83 (Solid)']++;
  else if (p.rating <= 88) ratingTiers['84-88 (Strong)']++;
  else if (p.rating <= 92) ratingTiers['89-92 (Elite)']++;
  else if (p.rating <= 95) ratingTiers['93-95 (Exceptional)']++;
  else ratingTiers['96-99 (Historically Outstanding)']++;
}

console.log('====================================================');
console.log(`PLAYER DATABASE VALIDATION REPORT`);
console.log('====================================================');
console.log(`Total Player Base Records : ${Object.keys(byPlayer).length}`);
console.log(`Total Season Cards        : ${players.length}`);
console.log(`Explicit Season Overrides : ${overrideEntries.length} verified`);
console.log(`Career Bounds Violations  : ${careerBoundsViolations}`);
console.log('----------------------------------------------------');
console.log('ERA DISTRIBUTION:');
for (const [era, count] of Object.entries(eraCounts)) {
  console.log(`  ${era.padEnd(8)}: ${count.toString().padStart(5)} (${((count / players.length) * 100).toFixed(1)}%)`);
}
console.log('----------------------------------------------------');
console.log('RARITY DISTRIBUTION:');
for (const [rarity, count] of Object.entries(rarityCounts)) {
  console.log(`  ${rarity.padEnd(8)}: ${count.toString().padStart(5)} (${((count / players.length) * 100).toFixed(1)}%)`);
}
console.log('----------------------------------------------------');
console.log('RATING TIERS (Anti-inflation):');
for (const [tier, count] of Object.entries(ratingTiers)) {
  console.log(`  ${tier.padEnd(35)}: ${count.toString().padStart(5)} (${((count / players.length) * 100).toFixed(1)}%)`);
}
console.log('====================================================');

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.slice(0, 20).forEach((w) => console.log('  - ' + w));
  if (warnings.length > 20) console.log(`  ...and ${warnings.length - 20} more`);
}

if (errors.length) {
  console.error(`\n${errors.length} ERROR(S) DETECTED:`);
  errors.slice(0, 40).forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('\n✔ All player data valid: zero errors detected.');
