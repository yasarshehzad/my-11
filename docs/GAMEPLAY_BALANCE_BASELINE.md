# MY DRAFTED XI: Gameplay Balance Baseline

> **Status**: Provisionally Locked  
> **Reference Commit**: `21d6fb4`  
> **Last Calibrated**: 2026-10-03  

This document serves as the permanent baseline and reference for gameplay balance, draft pool distributions, match engine probabilities, and automated bot performance benchmarks.

It exists to detect accidental balance regressions and major drift during architecture changes, feature additions, or UI updates.

---

## 1. Automated Bot Benchmark (30,000 Drafts per Strategy)

Simulated across 90,000 total automated drafts (30,000 drafts per archetype) in commit `21d6fb4`:

| Metric | Strategy A: Random Bot | Strategy B: Highest-OVR Bot | Strategy C: Strategic Bot | Delta (Strategic vs Highest-OVR) |
| :--- | :---: | :---: | :---: | :---: |
| **Average Wins** | **14.07** | **19.33** | **20.26** | **+0.93 wins** |
| **Median Wins** | 14 | 19 | 20 | +1 win |
| **P10 Wins** | 8 | 14 | 15 | +1 win |
| **P25 Wins** | 11 | 16 | 17 | +1 win |
| **P75 Wins** | 17 | 22 | 23 | +1 win |
| **P90 Wins** | 20 | 25 | 26 | +1 win |
| **Average Points** | 53.1 | 68.1 | 70.8 | **+2.7 points** |
| **Median Points** | 53 | 68 | 71 | +3 points |
| **Win / Draw / Loss** | 14.1 / 10.9 / 13.1 | 19.3 / 10.1 / 8.5 | 20.3 / 10.0 / 7.7 | — |
| **Goals (GF / GA)** | 41.0 / 39.0 (GD +1.9) | 51.7 / 29.5 (GD +22.2) | 53.1 / 27.3 (GD +25.8) | — |
| **Average OVR** | 79.6 | 84.2 | 84.7 | +0.5 |
| **Average Chemistry** | 73.3 | 78.4 | 88.2 | **+9.8 chem** |
| **25+ Wins Rate** | 0.96% (288 / 30k) | 11.96% (3,588 / 30k) | 16.03% (4,809 / 30k) | **+4.07% (+34% relative)** |
| **30+ Wins Rate** | 0.02% (5 / 30k) | 0.79% (237 / 30k) | 0.98% (293 / 30k) | +0.19% |
| **35+ Wins Rate** | 0.00% | 0.00% | 0.010% (3 / 30k) | +0.01% |
| **Unbeaten Rate (0 L)** | 0.0067% (2 / 30k) | 0.12% (36 / 30k) | 0.21% (62 / 30k) | **+0.09% (+72% relative)** |
| **38-0 Perfect Season** | 0.00% (0 / 30k) | 0.00% (0 / 30k) | 0.00% (0 / 30k) | 0.00% |

### Strategic Drafting Behaviour
- **Strategic Non-OVR Pick Rate**: In **12.57%** of picks (41,466 / 330,000 choices), the Strategic Bot selected a lower-rated card over a higher-rated option to solidify club, nation, or era chemistry.
- **Dressing Room Fragmentation Penalty**: Mercenary squads with $\ge 8$ disconnected clubs incur `-6` chemistry; squads with $\ge 8$ disparate nationalities incur `-4` chemistry.

---

## 2. Formation Parity Benchmark

Measured across 30,000 Strategic Bot drafts:

| Formation | Average Wins | 25+ Win Rate | Squad OVR | Squad Chemistry |
| :--- | :---: | :---: | :---: | :---: |
| **4-3-3** | 19.62 | 12.11% | 84.5 | 88.3 |
| **4-4-2** | 19.70 | 12.16% | 83.8 | 87.0 |
| **4-2-3-1** | 19.85 | 14.69% | 84.3 | 89.4 |
| **3-5-2** | 21.84 | 25.16% | 86.4 | 88.0 |

### Observation on 3-5-2
- The three four-defender formations (4-3-3, 4-4-2, 4-2-3-1) sit within **±0.23 wins** of each other.
- 3-5-2 naturally achieves higher win totals in automated bot simulations because fielding 5 midfielders maximizes ratings in a midfield-weighted match engine.
- **Intentional Design Decision**: We are intentionally **NOT** tuning 3-5-2 down further at this stage. Real human players select formations based on tactical preference, wingers, and personal favorite players. We will wait for real-world user data before applying additional adjustments.

---

## 3. Elite Controlled Squad Benchmark (20,000 Runs Each)

Evaluating high-tier squads under the calibrated match engine:

| Profile | Target OVR / Chem | Record (W-D-L) | 25+ Wins | 30+ Wins | 35+ Wins | Unbeaten | 38-0-0 Perfect |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier A (Excellent)** | ~88 OVR / 88 Chem | 22.07 – 9.08 – 6.85 | 20.82% | 0.56% | 0.00% | 0.04% (8 / 20k) | 0.00% (0 / 20k) |
| **Tier B (Elite)** | ~91 OVR / 93 Chem | 27.63 – 6.27 – 4.10 | 87.48% | 25.08% | 0.29% | 1.11% (222 / 20k) | 0.00% (0 / 20k) |
| **Tier C (Exceptional)** | ~93 OVR / 97 Chem | 29.97 – 5.42 – 2.61 | 98.31% | 58.38% | 2.50% | 6.03% (1,206 / 20k) | 0.010% (2 / 20k) |
| **Tier D (Historic XI)** | 95+ OVR / 100 Chem | 31.70 – 4.70 – 1.60 | 99.80% | 83.90% | 10.35% | 19.00% (3,801 / 20k) | **0.105% (21 / 20k)** |

### 38-0 Perfect Season Holy Grail Odds
- **Ordinary automated drafts**: Effectively **0.00%**.
- **Tier C (Exceptional 93 OVR / 97 Chem)**: **~1 in 10,000 runs (0.010%)**.
- **Tier D (Near-Perfect Historic XI 95+ OVR / 100 Chem)**: **~1 in 950 runs (0.105%)**.

---

## 4. Chemistry Sensitivity Scale

Evaluated with a fixed 84-rated squad across the 40–100 chemistry spectrum (20,000 runs per tier):

- **40 Chem**: 10.62W – 10.18D – 17.20L | 42.0 Pts | 36.9 GF / 50.8 GA
- **55 Chem**: 12.24W – 10.36D – 15.41L | 47.1 Pts | 40.5 GF / 47.2 GA
- **70 Chem**: 14.03W – 10.38D – 13.60L | 52.5 Pts | 44.2 GF / 43.5 GA
- **85 Chem**: 15.81W – 10.30D – 11.89L | 57.7 Pts | 47.8 GF / 39.8 GA
- **100 Chem**: 17.64W – 10.10D – 10.26L | 63.0 Pts | 51.5 GF / 36.2 GA

**Takeaway**: Moving from 40 to 100 chemistry provides a **+7.02 win swing** and **+21.0 point swing** (+3.5 points per 10 chemistry). Chemistry is tactically decisive without overruling fundamental squad quality.

---

## 5. Usage in Regression Testing

The test file [`tests/balanceGuardrails.test.ts`](file:///Users/yasarshehzad/Documents/antigravity/wonderful-darwin/tests/balanceGuardrails.test.ts) runs a deterministic seed sample over hundreds of drafts in under 3 seconds to guarantee:
1. `Random < Highest-OVR <= Strategic`
2. No formation produces out-of-bound averages (<14 or >25)
3. Strategic non-OVR pick rate remains between 5% and 35%
4. 38-0 is not routinely produced by automated bots.
