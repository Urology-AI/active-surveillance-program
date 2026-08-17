# Evidence Audit — Clinical Engine Numeric Constants

Scope: `src/asEngine.js`, `src/progressionEngine.js`, `src/derivedMetrics.js`, `src/modelVersion.js`.
Method: every numeric literal that reaches a score, tier, flag, or displayed clinical statement was located and classified against what the repository itself can justify — in-repo data (`COHORT_CALIBRATION`, `MODEL_VALIDATION`, `UPGRADE_RISK_MODEL`) or a citation naming a guideline edition / publication. **No external literature search was performed and no citation was inferred.** A confident comment is not evidence: where a comment asserts provenance that cannot be corroborated from in-repo data or a named citation, the value is classified `UNSOURCED` and the comment is noted.

**Summary.** 141 clinically-consequential values audited (excluding `CONVENTION` constants, summarised separately). By class: **UNSOURCED 47**, **COHORT 58**, **GUIDELINE 14**, **LITERATURE 11**, **UNCLEAR 11**, plus ~20 `CONVENTION` constants with no clinical claim. The dominant finding is that **the entire Layer 1 points system — every sub-model point value and every score-to-tier cut-point — is unsourced.** The four sub-model scores are the mechanism that assigns a surveillance tier, and not one of their magnitudes is derivable from the N=1,213 cohort or attached to a named guideline value. Citations in the file support *which variables matter* and *where their clinical boundaries lie* (PSAD 0.15, Decipher 0.60, PI-RADS ≥4); they do not support *how many points each is worth* or *how many points make a tier*. The recently-fixed PSAD `0.10` was one instance of a pattern that runs through the whole scoring layer.

---

## 1. UNSOURCED values — act on these first

Ordered by clinical consequence.

| # | file:line | Value | What it gates | Consequence if wrong | What would justify or remove it |
|---|---|---|---|---|---|
| U1 | asEngine.js:737–740 | Score cut-points `≤3`, `≤20`, `≤45` | The entire Basic sub-model tier (`standard_as` / `enhanced_as` / `intensive_as` / `treatment`), which is one of the two inputs to the final combined tier | Directly mis-assigns surveillance intensity and biopsy frequency. This is the single highest-consequence unsourced value in the engine. | Fit tier boundaries against the cohort's upgrade outcomes, or state explicitly that the tiers are a consensus construct with no outcome calibration. No comment anywhere claims a source for these three numbers. |
| U2 | asEngine.js:574 | GGG points `{1:0, 2:8, 3:22, 4:28, 5:35}` | Largest single contributor to `asScore` → Basic tier | GG2 at 8 pts already lands mid-`enhanced_as`; GG3 at 22 pts alone forces `intensive_as`. The magnitudes decide the tier for most patients. | The `basis` string cites "NCCN 2024" for GG *eligibility* (correct), and the code comment itself concedes "Scoring weight follows guideline tier, not observed cohort rate" — i.e. it admits the weights are not data-derived. Cohort GG2 upgrade rate (8.0%) is *lower* than GG1 (26.7%), the opposite ordering to the points. |
| U3 | asEngine.js:704 | PI-RADS points `{1:-5, 2:-3, 3:0, 4:8, 5:15}` | `asScore` → Basic tier | PI-RADS 5 adds 15 pts (over half the way to `intensive_as` on its own) for a variable the same file documents as **not an independent predictor (p=0.397, N=781)**, with cohort PI-RADS 5 upgrade rate (22.2%) *below* PI-RADS 4 (26.4%). PI-RADS 1 subtracts 5 pts and can pull a patient down a tier. | Either drop from scoring (as PSMA and ePSA already are) and retain as a monitoring trigger only — which the `basis` text already says it is — or derive weights from the cohort. Nothing supports the specific ±5/±3/8/15 magnitudes. |
| U4 | asEngine.js:667–670 | PSAD points `12 / 5 / 0 / −5` | `asScore` → Basic tier | The **boundaries** (0.177, 0.15, 0.065) are now sourced; the **point magnitudes** are not. A −5 for PSAD < 0.065 can single-handedly drop a patient a tier. Same failure mode as the fixed `0.10`, one level up. | Cohort tier upgrade rates (11.2 / 23.9 / 27.3 / 34.7%) exist and could anchor relative weights; the current 12/5/0/−5 is not proportional to them. |
| U5 | asEngine.js:996, 1005, 1015 | Monitoring feature-count thresholds `0`, `≤2`, `≤4` | `monitoringTier`, the other input to the combined tier | Counts 12+ heterogeneous features as equal units — a germline BRCA2 variant weighs exactly as much as "no mpMRI performed". Three features vs. two flips the tier. | No citation anywhere for the counts. Requires either weighting the features or an explicit statement that this is an unweighted checklist by design. |
| U6 | asEngine.js:1066 | Genomic-high escalation `level + 1` | Escalates the combined tier by exactly one level | An unvalidated single-step escalation on top of a genomic score whose own cut-points are literature-based but whose internal validation is impossible (`<10% of N=1,213` had genomic testing, `auc_internal: null`). | State the escalation rule as a consensus design choice, or derive it. The header comment cites "NCCN/EAU multi-modal approach" generally, with no edition-level rule for a one-tier bump. |
| U7 | asEngine.js:1065 | PSMA regional → `level = max(level, 2)` | Forces at least `intensive_as` | Sourced *directionally* to EAU 2024 ("nodal disease changes management"); the specific floor of level 2 rather than 3 is not. Cohort has no PSMA stratum at all. | Named EAU 2024 recommendation text for nodal-positive surveillance, or reclassify as consensus. |
| U8 | asEngine.js:785–787 | Decipher points `15 / 8 / −10` | `genomicScore` → `genomicRiskTier` → tier escalation | −10 pts for low Decipher is the largest single de-escalating value in the engine. | Cut-points 0.45/0.60 are LITERATURE (Spratt 2014, Nguyen 2021). The **points** are not. |
| U9 | asEngine.js:805–807 | GPS points `12 / 5 / −8` | as U8 | as U8 | Cut-points 20/40 cite Klein 2021; points do not. |
| U10 | asEngine.js:825–827 | Prolaris points `12 / 5 / −8` | as U8 | as U8 | Cut-points 1.5/2.1 cite Cooperberg 2013; points do not. |
| U11 | asEngine.js:850 | ConfirmMDx points `10 / −8` | as U8 | A negative ConfirmMDx subtracts 8 pts — enough to move a genomic tier down. | Stewart 2013 is cited for the *direction* of a positive result only. |
| U12 | asEngine.js:866–867 | Genomic tier cut-points `≤−5` low, `≤10` intermediate | `genomicRiskTier`, which feeds U6 escalation | Determines whether the one-tier escalation fires. | Nothing. No comment claims a source. |
| U13 | asEngine.js:1698–1702, 1763–1767 | Layer 3 risk bands `0.15 / 0.20 / 0.28 / 0.40` → Very Low / Low / Average / Elevated / High | The colour-coded risk band shown to the patient for the personalised logistic model | A patient at 27.9% reads "Average" (yellow); at 28.1% reads "Elevated" (orange). Nothing in the cohort marks 0.28. Duplicated in two code paths — they currently agree, but nothing enforces that. | The cohort base rate (0.251) and `RISK_PERCENTILES` exist and could define bands; these four numbers use neither. |
| U14 | asEngine.js:1609–1614 | Imputation fallbacks `bmi 27`, `age 63`, `maxCore 30`, `psa 6.5`, `vol 40` | Every Layer 3 `fullModel` probability when the corresponding field is blank — i.e. most assessments | Silently invents patient data. Comments say "cohort median approx" / "cohort mean 63.2" but **none of these medians appear in `COHORT_CALIBRATION` or `MODEL_VALIDATION`**, so the claim cannot be checked from the repo. `psa 6.5` and `vol 40` imply an imputed PSAD of 0.1625 — above the NCCN 0.15 boundary — for any patient who leaves volume blank. | Publish the actual cohort medians into the calibration data so the constants are derivable, or refuse to score on missing inputs (the pattern already used for GG≥4). |
| U15 | asEngine.js:687–689 | PSA-only fallback: threshold `4`, points `10 / 0 / −3` | `asScore` when prostate volume is absent | `PSA ≥ 10` is guideline-cited (NCCN/PRIAS); the `4` boundary and all three point values are not. −3 pts for PSA < 4 in an already-diagnosed AS population. | The `basis` string cites NCCN/PRIAS only for the 10 boundary. |
| U16 | asEngine.js:616–618 | Core-ratio points `6 / 3 / 1` and ratio splits `1/2`, `1/3` | `asScore` (only for patients already failing the NCCN <3-core gate) | The <3-core gate is GUIDELINE; the severity grading above it is invented. Same file records pos-core-count AUC 0.465 — worse than chance. | Comments justify the *exactness* of 1/3 and 1/2 (a real fix) but not their *choice* as boundaries. |
| U17 | asEngine.js:637 | Max-core points `4` (if >50%) | `asScore` | Same file records max-core AUC 0.504 and sensitivity 0.043 — essentially non-discriminatory — yet it still adds points. | The >50% boundary is GUIDELINE (NCCN); the 4 points are not. |
| U18 | asEngine.js:905–908 | PSMA points `−15 / 0 / 25 / 999` | Displayed to the clinician as sub-model points | Not wired into any tier (deliberately, with an excellent comment), so consequence is display-only — but a displayed `−15` still reads as evidence of reassurance. | Comment correctly states the cohort "has no PSMA stratum at all — the points are guideline-narrative weights, not fitted coefficients." That is a self-declared UNSOURCED. |
| U19 | asEngine.js:1437–1438 | `yr5_expected: 2`, `yr10_expected: 4` biopsies | Displayed biopsy-burden estimate | Patient-facing burden number. | `basis` cites "PRIAS protocol; NCCN 2024" for a biopsy *cadence*, and the adjacent `note` concedes the actual count is "pending". Cadence is cited; the derived counts 2 and 4 are not stated anywhere. |
| U20 | progressionEngine.js:470, 478, 484, 495 | `psaSpanMonths >= 6` gate | Whether a PSADT or velocity flag is actionable vs. informational | Suppresses a genuine kinetics flag for patients with <6 months of data. Safe direction, but arbitrary. | Comment says "We require ≥ 6 months" — a first-person design decision, explicitly not a citation. Same constant repeated as `MIN_SPAN_MONTHS` in derivedMetrics.js:24. |
| U21 | derivedMetrics.js:23 | `MIN_PSA_POINTS = 3` | Whether velocity/PSADT are computed at all | Blocks kinetics for 2-point series. | Comment: "fewer than 3 → not a trend, a pair". Design rationale, no source. |
| U22 | derivedMetrics.js:25 | `DEFAULT_WINDOW_MONTHS = 24` | Which PSA draws enter the kinetics fit | Changes the reported velocity/PSADT for any patient with >2 years of data. | No source. |
| U23 | progressionEngine.js:354 | `years < 0.08` (~1 month) velocity floor | Suppresses velocity | Low consequence; arbitrary. | No source. |
| U24 | derivedMetrics.js:272–276 | Protocol cadences `91 / 365 / 365 / 365 / 1095` days | Overdue/due surveillance flags | Drives the "surveillance gap" attention observation. | Comment cites "Tewari AS protocol as implemented elsewhere in this app" — an internal cross-reference, not a document. Verify against the actual written program protocol. |
| U25 | derivedMetrics.js:272–276 | Grace periods `30 / 60 / 60 / 90 / 180` days | overdue vs. due classification | Determines when a patient is flagged as non-adherent. | Comment gives rationale ("clinic scheduling is not exact") but no source. |
| U26 | derivedMetrics.js:321 | `daysPastDue > -45` → `due_soon` | Display status | Low consequence. | No source. |
| U27 | derivedMetrics.js:219, 250; progressionEngine.js:368–369 | `120` months → "> 10 years" horizon | PSADT display | Display-only rounding of an unbounded quantity. | No source; effectively a display convention with a clinical-sounding boundary. |
| U28 | asEngine.js:1519 | `maxSupportedGGG: 3` | Refuses a Layer 3 estimate above GG3 | Correct and safe; derived from the training population (GG1/GG2 + N=2 GG3), so arguably COHORT. Listed here because the N=2 GG3 stratum is not a meaningful basis for *supporting* GG3 either. | Consider lowering to 2 — the model has 2 GG3 patients. |

Also unsourced but structural rather than numeric: the combined-tier `LEVEL` map (asEngine.js:1056–1061) treats the Basic and Monitoring tiers as commensurable and takes the maximum. That equivalence is an unsourced modelling assumption, not a value.

---

## 2. COHORT — derivable from in-repo data

All from `COHORT_CALIBRATION` / `MODEL_VALIDATION` / `UPGRADE_RISK_MODEL`. Supporting N and discrimination noted; see §4 for the fragile subset.

| file:line | Value | Gates | Source key | N / AUC |
|---|---|---|---|---|
| asEngine.js:669, 1097, 1367, 1449 | PSAD `0.065` | "very low" PSAD band; tier lookup; outcomes label | `COHORT_CALIBRATION.psad.youden_optimal` | N=704 GG1, AUC 0.609 — **in-sample Youden, see §4** |
| asEngine.js:77–80, 1140 | Tier upgrade rates `0.112 / 0.239 / 0.273 / 0.347` | Displayed PSAD-tier upgrade rate, chips, outcomes panel | `psad.tiers.*.upgrade_rate` | N=170 / 381 / 55 / 98 |
| asEngine.js:1097–1100 | Tier boundaries `0.065 / 0.15 / 0.177` | `psadTierFor` — single source for all PSAD displays | `psad.tiers` labels | boundaries themselves are GUIDELINE/LITERATURE (see §3) |
| asEngine.js:54–56, 1122 | GGG upgrade rates `0.267 / 0.080 / 0.000` | Displayed cohort context, outcomes `display_rate` | `by_ggg` | N=1111 / 100 / **2** |
| asEngine.js:33–35 | `n 1213`, `upgrade_events 305`, `rate 0.251` | Every "N=1,213 … 25.1%" statement; `standard_as` tier risk | `overview` | N=1213 |
| asEngine.js:41–49 | Intervention split `0.597 / 0.403 / 0.212 / 0.191` | Outcomes `interventionRisk` panel | `intervention` | N=1213 |
| asEngine.js:88–93, 1163 | PI-RADS upgrade rates `0.267 / 0.168 / 0.201 / 0.264 / 0.222 / 0.254` | Layer 2 PI-RADS context, chip | `pirads` | N=15 / 167 / 169 / 284 / 45 / 67 — **PI-RADS 1 (N=15) and 5 (N=45) unusable** |
| asEngine.js:108–111, 1211 | Age-tier rates `0.300 / 0.276 / 0.253 / 0.281` and progression `0.460 / 0.424 / 0.376 / 0.355` | Age cohort context, `ageFlag` | `age.tiers` | N=50 / 304 / 526 / 231 (GG1 subset, denominator corrected to 1111) |
| asEngine.js:117–119, 1250 | Race rates `0.292 / 0.144 / 0.341` | Layer 2 race context, `raceFlag`, equity snapshot | `race` | N=708 / 376 / 129 — **display-only, `riskAdjustmentUse: false`, correctly never scored** |
| asEngine.js:148–149 | Abutment `n_yes 196`, `rate 0.140` | Abutment cohort context | `abutment` | N=196 |
| asEngine.js:130 | `standard_as` risk `0.251`, CI 23–28% | Tier risk statement | `overview.overall_upgrade_rate` | N=1213 |
| asEngine.js:200–229 | Sens/spec/PPV/NPV at 0.065 / 0.15 / 0.177 | "Model Validation" card | `basic_psad` | N=704; **cell counts (TP 25/FN 3) imply a far smaller evaluated subset — see §4** |
| asEngine.js:238–267 | Supporting-variable metrics (PI-RADS ≥4, abutment, max core) | Validation card | `supporting_variables` | N=166 / 174 / 217 |
| asEngine.js:277–301 | Composite tier distribution and thresholds | Validation card | `composite` | N=218 |
| asEngine.js:1483 | Intercept correction `− 1.0909` = `ln(908/305)` | Every Layer 3 `fullModel` probability | `n 1213`, `n_upgraded 305` | Arithmetic from cohort counts — correctly derived and documented |
| asEngine.js:1485–1502 | 18 `fullModel` coefficients | Layer 3 probability | fitted, `data/analyze_upgrade.py` | N=1213, AUC 0.65 |
| asEngine.js:1524–1548 | `withPsad` / `noPsad` coefficients + covariance matrix | Legacy Layer 3 paths (**unreachable — see §5**) | fitted | N=781 AUC 0.668 / N=1197 AUC 0.609 |
| asEngine.js:1554–1558 | 21 `RISK_PERCENTILES` breakpoints | Displayed "percentile vs. cohort" | N=781 predicted risks | **applied to `fullModel` (N=1,213) output — acknowledged mismatch, "using legacy table as approximation" (line 1684)** |
| asEngine.js:1564–1569 | `CLINICAL_IMPACT_TABLE` — 48 values across 6 thresholds | Clinical-impact display | derived from PSAD-model cohort, base rate 0.209 | N=781; derivation script not in the audited files |
| asEngine.js:751, 1547 | `pos_cores` 0.114 / 0.107, `is_gg2`, intercepts in `calcBasic` | `upgradeProbability` returned from `calcBasic` | duplicates `UPGRADE_RISK_MODEL.withPsad` / `noPsad` | **literal duplication of fitted coefficients — drift risk** |
| progressionEngine.js:606–622 | `25.1% / 0.267 / 0.080 / 0.341 / 0.292 / 59.7% / 47.4%` | `getCohortContext` display lines | duplicates `COHORT_CALIBRATION` | **hardcoded copies, not imported — will silently diverge on next data cut** |
| asEngine.js:1520, 1541, 1548 | `auc 0.65 / 0.668 / 0.609`, base rates `0.251 / 0.209 / 0.252` | Displayed model quality | fitted | as noted |

---

## 3. GUIDELINE and LITERATURE

### GUIDELINE — traceable to a named edition cited in the file

| file:line | Value | Gates | Citation string in code |
|---|---|---|---|
| asEngine.js:384 | `ggg >= 4` | Hard stop, AS contraindicated | "NCCN Prostate Cancer 2024; AUA/ASTRO Clinically Localized PCa Guidelines 2022" |
| asEngine.js:394 | `psmaFinding === 'metastatic'` | Hard stop | "EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024" |
| asEngine.js:608 | `posCores < 3` | NCCN very-low-risk core gate | "Meets NCCN 2024 very low risk core criterion (< 3 positive cores)" |
| asEngine.js:636, 954 | `maxCorePercent > 50` | NCCN gate; monitoring feature | "Within NCCN 2024 very low risk (≤ 50% per core)"; "Bastian 2004; NCCN 2024" |
| asEngine.js:668, 218 | PSAD `0.15` | Intermediate PSAD band; validation cut-point | "Above NCCN 2024 very low risk threshold (0.15)" |
| asEngine.js:687, 951 | `psa >= 10` | PSA fallback high band; monitoring feature | "Above NCCN 2024 / PRIAS threshold (PSA ≤ 10 ng/mL for AS eligibility)" |
| asEngine.js:963 | `pirads >= 4` | Monitoring feature | "Turkbey 2019; PI-RADS v2.1" |
| asEngine.js:966 | `pirads === 0` | "No mpMRI" monitoring feature | "NCCN 2024; EAU 2024: mpMRI required before AS initiation" |
| asEngine.js:969, 972 | ECE / broad contact >10 mm | Monitoring features | "NCCN 2024 staging; EAU 2024"; "EAU Guidelines 2024" |
| asEngine.js:975 | `age < 50` | Monitoring feature | "PRIAS; AUA/ASTRO 2022" |
| asEngine.js:987–991 | BRCA2 / HOXB13 | Monitoring features | "NCCN 2024" |
| progressionEngine.js:514, 538 | `pirads >= 4` | MRI progression / high-PI-RADS flags | "AUA/ASTRO 2026 (Amended) §19" — **quoted verbatim; see §5 on the 2026 vs. 2022 edition conflict** |
| asEngine.js:999–1033 | Monitoring schedule intervals (6 mo PSA, 12–18 mo confirmatory biopsy, 2–5 yr, 3–4 mo, etc.) | Displayed schedule text | "NCCN/PRIAS protocol" — cited at protocol level, individual intervals not attributed |

### LITERATURE — traceable to a named publication cited in the file

| file:line | Value | Gates | Citation string in code |
|---|---|---|---|
| asEngine.js:667, 957 | PSAD `0.177` | High PSAD band; monitoring feature | "Kadeer A et al., Front Oncol 2025;15:1602134, doi:10.3389/fonc.2025.1602134" — **the file itself flags a population/outcome mismatch: derived on N=60 biopsy-naive men to *diagnose* cancer, used here to *prognosticate* upgrade. Exemplary self-documentation; the caveat should reach the clinician, not only the code reader.** |
| asEngine.js:785 | Decipher `0.45 / 0.60` | Genomic tier | "Spratt DE et al., Lancet Oncol 2014; Nguyen PL et al. 2021" |
| asEngine.js:805 | GPS `20 / 40` | Genomic tier | "Klein EA et al., Eur Urol 2021" |
| asEngine.js:825 | Prolaris `1.5 / 2.1` | Genomic tier | "Cooperberg MR et al., Cancer 2013" |
| asEngine.js:847 | ConfirmMDx positive | Genomic tier | "Stewart GD et al., J Urol 2013" |
| asEngine.js:574 | GGG scale itself (1–5) | Grade encoding | "Epstein JI et al., Eur Urol 2016;69(3):428–435 (ISUP 2016)" |
| asEngine.js:702 | PI-RADS scale (1–5) | MRI encoding | "Turkbey B et al., Eur Urol 2019;76(3):340–351 (v2.1)" |
| asEngine.js:981 | PSA velocity `>= 2` ng/mL/yr | Monitoring feature | "D'Amico AV et al., JAMA 2004" |
| asEngine.js:984 | PSADT `< 3` years | Monitoring feature | "Bul M et al., PRIAS, Eur Urol 2013" |
| progressionEngine.js:481, 776 | PSADT `< 36` months | Progression warning flag | "AUA/ASTRO 2026 §18; Drost 2018 (Eur Urol 74:1002)" — **the flag text itself states PRIAS removed PSADT as an exit criterion in 2014; the threshold is retained anyway** |
| progressionEngine.js:495, 753 | PSA velocity `> 0.75` ng/mL/yr | Progression warning flag | "Carter 2006 (J Urol 176:2416)"; text states "UCSF institutional marker — not cited in AUA/ASTRO 2026" |

### CONVENTION — no clinical claim

Input-plausibility bounds (`psa > 100`, `volume > 500`, `age 18–120`, `decipher 0–1`, `gps 0–100`, `prolaris 0–10`, `pirads`/`ggg` domains — asEngine.js:465–529); display rounding (`toFixed(3)`, `Math.round(x*1000)/1000`, `Math.round(prob*100)`); time constants (`30.44` days/month, `365.25` days/year); numerical guards (`1e-10` denominator floor); Wilson interval `z = 1.96`; `1.96` in the delta-method CI. None of these encode a clinical threshold.

---

## 4. Sourced but fragile

| Value | Why fragile |
|---|---|
| PSAD Youden cut-point `0.065` | Chosen to maximise Sens+Spec on the same N=704 GG1 data used to evaluate it. In-sample Youden cut-points are optimistically biased and unstable; no external validation. Underlying AUC 0.609 is weak discrimination. It is nonetheless the **best-supported** PSAD threshold in the file — the matching population and outcome — and the recent fix correctly moved to it. |
| PSAD AUC `0.609` (N=704) | Weak discrimination. Every PSAD-driven statement inherits it. Published Kadeer AUC 0.624 is on a different population/outcome. |
| Youden operating characteristics (asEngine.js:208–216) | `sensitivity_at_youden 0.893` rests on `TP=25, FN=3` and `spec 0.357` on `TN=51, FP=92` — 171 patients, not 704. The card is labelled N=704. **The denominator shown to the clinician does not match the cell counts.** Specificity 0.357 also means the cut-point flags roughly two-thirds of non-upgraders. |
| GG3 stratum (N=2, upgrade rate 0.000) | Zero information. Reaches `by_ggg` display and `maxSupportedGGG: 3`. |
| PI-RADS 1 (N=15) and PI-RADS 5 (N=45) | Displayed as upgrade rates with one decimal place on samples too small to support them. |
| Age <50 (N=50) | Drives a monitoring feature and a prominent "highest progression rate of any age group" statement; 46.0% on N=50 has a wide interval. |
| `epsa_to_as_eligible` (asEngine.js:154–160) | "N≈14" and "N≈5" — approximate denominators, displayed as clean percentages (89%, 80%). |
| Composite tier metrics (N=218) | Tier sensitivity 0.543 / specificity 0.297 for ≥Enhanced; observed upgrade rates *fall* as tier rises. The file explains this as selection effect, plausibly — but it means the tier system is not currently demonstrated to rank risk. |
| `multivar_composite` AUC "0.64–0.68" | Explicitly labelled an estimate from marginal data, `auc_internal: null`. Honestly flagged; ensure the UI carries the "estimated" label. |
| `RISK_PERCENTILES` (N=781) applied to `fullModel` (N=1,213) | Acknowledged in-code as an approximation. The displayed percentile is computed against a different model's risk distribution. |
| Race strata | Correctly excluded from scoring, with the reasoning documented at length (asEngine.js:1633–1660) and Wilson intervals attached. This is the strongest evidence-handling in the file. |

---

## 5. Consistency defects found during the audit

Not threshold-provenance issues, but they affect what the evidence trail says.

1. **Kadeer citation conflict.** `asEngine.js:551` corrects the reference to *Front Oncol 2025;15:1602134* and explicitly notes the prior "Eur Urol 2025" attribution "does not exist". `modelVersion.js:39` and `:64` still say **"Kadeer N et al., Eur Urol 2025"** — and `modelVersion.js` is the file that feeds `MODEL_PROVENANCE` into exports and audit records. The wrong citation is the one being exported.
2. **AUA/ASTRO edition conflict.** `progressionEngine.js` cites "AUA/ASTRO 2026 (Amended) §18/§19" ~15 times with verbatim quotes; `modelVersion.js:54` registers only "AUA/ASTRO Clinically Localized Prostate Cancer Guideline 2022". One of the two is wrong about which edition the tool implements.
3. **Duplicated cohort literals.** `progressionEngine.js:606–622` hardcodes 25.1% / 0.267 / 0.080 / 0.341 / 0.292 / 59.7% / 47.4% instead of importing `COHORT_CALIBRATION`; `calcBasic` (asEngine.js:749–760) hardcodes the `withPsad`/`noPsad` coefficients instead of reading `UPGRADE_RISK_MODEL`. Both will diverge at the next data cut.
4. **Dead code holding fitted coefficients.** `calcUpgradeRisk` returns unconditionally inside the `fullModel` block (asEngine.js:1704); everything from line 1720 down — the `withPsad` delta-method CI, the `noPsad` fallback — is unreachable. `hasCi` is therefore always `false`. Comment says "kept for reference", but the same coefficients are live in `calcBasic`.
5. **Two upgrade probabilities.** `calcBasic` returns `upgradeProbability` from the N=781 PSAD model while `calcUpgradeRisk` returns a different probability from the N=1,213 `fullModel`. Both are in the result object. Verify the UI does not show both.

---

## 6. Questions for the clinician, in priority order

1. **What is the evidence basis for the tier cut-points at scores 3, 20, and 45?** (U1) If none, is the tier system a documented consensus construct? This must be answerable before any SaMD submission.
2. **What justifies the sub-model point magnitudes** — GGG 8/22, PI-RADS 8/15, PSAD 12/5/0/−5, genomic 15/8/−10? (U2–U4, U8–U11) Should any of them instead be derived from the cohort's own tier upgrade rates?
3. **Should PI-RADS score points at all,** given this file records p=0.397 in multivariable analysis and a cohort PI-RADS 5 rate *below* PI-RADS 4? (U3) PSMA and ePSA are already display-only for exactly this reason.
4. **Should negative findings ever subtract points?** Decipher −10, ConfirmMDx −8, PI-RADS 1 −5, PSAD −5, PSA −3 can each pull a patient down a tier. The file already made this argument for PSMA and declined to score it.
5. **Is the unweighted 12-feature count with breaks at 0/2/4 clinically acceptable** as the monitoring tier mechanism? (U5)
6. **Should Layer 3 impute missing BMI, age, max-core, PSA, and volume at all** — and if so, are 27 / 63 / 30 / 6.5 / 40 the actual cohort medians? (U14) The imputed PSA and volume produce a PSAD of 0.1625, above the NCCN threshold.
7. **Which AUA/ASTRO edition does this tool implement — 2022 or 2026 (Amended)?** (§5.2) The two engines disagree.
8. **Should the Kadeer 0.177 population/outcome mismatch caveat be shown to the clinician**, not only to code readers? And should the exported citation be corrected to *Front Oncol 2025*? (§3, §5.1)
9. **Are the Youden operating characteristics reportable as stated,** when the cell counts imply ~171 patients under an "N=704" heading? (§4)
10. **Do the risk bands Very Low / Low / Average / Elevated / High at 0.15/0.20/0.28/0.40 correspond to any clinical action difference?** (U13)
11. **Are the protocol cadences (quarterly PSA, annual MRI/DRE/uroflow, 3-yearly biopsy) and grace periods the written Tewari protocol?** (U24, U25)
12. **Is the ≥6-month / ≥3-point kinetics gate the right suppression rule** for PSA velocity and doubling-time flags? (U20–U22)
13. **Should PSADT < 36 months still raise a flag** when the flag text itself states PRIAS removed it as an exit criterion in 2014? (§3)
14. **Should GG3 be scored by Layer 3 at all,** with N=2 in the training data? (U28)

---

*Audit performed against `src/asEngine.js` (2,013 lines), `src/progressionEngine.js` (860), `src/derivedMetrics.js` (370), `src/modelVersion.js` (136). Read-only — no engine file was modified. No external literature was consulted; every classification rests on in-repo data or a citation string present in the source.*

---

**Status note (added when this doc was brought into `docs/`):** the highest-priority finding here (U1–U4 — the Layer 1 points system) and the citation conflicts in §5.1–5.2 have been remediated in [PR #45](https://github.com/Urology-AI/active-surveillance-program/pull/45) (merged) — see [MODEL_OVERVIEW.md](MODEL_OVERVIEW.md) for the current state of the validated model. Items U5–U28 and §5.3–5.5 remain open.
