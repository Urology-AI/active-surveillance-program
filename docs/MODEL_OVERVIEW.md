# AS Engine — Model Overview for Data Analyst Review

*Plain-language summary. For full technical detail see [`src/asEngine.js`](../src/asEngine.js) and [EVIDENCE_AUDIT.md](EVIDENCE_AUDIT.md).*

## What the tool does

Given a patient's biopsy, imaging, and lab data, the tool estimates the probability that a
man on active surveillance (AS) for prostate cancer will be "upgraded" — i.e. his next
biopsy finds a higher-grade cancer than his original diagnosis. It also displays guideline
eligibility checks and a recommended monitoring schedule.

There are three components. Only one of them is a statistically validated predictive model.

| Component | What it is | Validated? |
|---|---|---|
| **Guideline checklist** ("Basic" panel) — [`calcBasic`](../src/asEngine.js:567) | Each input checked against a cited NCCN/EAU/literature threshold (e.g. PSAD > 0.15) | No — informational display only, does not feed the prediction or the tier |
| **Monitoring checklist** — [`calcMonitoring`](../src/asEngine.js:945) | Counts how many risk features are present (PSAD high, PI-RADS ≥4, no MRI, etc.) | Partially — drives the surveillance-intensity tier shown to the clinician, unweighted |
| **`fullModel`** — [`calcUpgradeRisk`](../src/asEngine.js:1586) | A logistic regression fit directly on the cohort's own outcomes | **Yes — this is the model** |

## The model (`fullModel`)

- **Type:** logistic regression (`sklearn.linear_model.LogisticRegression`, `class_weight='balanced'`)
- **Training data:** N = 1,213 patients, Mount Sinai Tewari Active Surveillance Program
- **Outcome (label):** `upgrade_y_n` — did the patient's Grade Group increase on a later biopsy? 305/1,213 (25.1%) upgraded.
- **Performance:** AUC 0.65, confirmed by 5-fold cross-validation (0.647) — this is not an in-sample number, it holds on held-out folds. See [`data/validate_fullmodel_auc.py`](../data/validate_fullmodel_auc.py).
- **Fitting script:** [`data/analyze_upgrade.py`](../data/analyze_upgrade.py) (takes the raw patient-level CSV, not committed to this repo for privacy)
- **Coefficients defined at:** [`src/asEngine.js:1488–1517`](../src/asEngine.js:1488) (`UPGRADE_RISK_MODEL.fullModel`)
- **Prediction logic at:** [`src/asEngine.js:1586`](../src/asEngine.js:1586) (`calcUpgradeRisk`)

## Input variables (18 total)

| Variable | Type | Coefficient | Direction | Line |
|---|---|---|---|---|
| `first_positive_bx_ggg_named` (Grade Group) | ordinal (GG1/2/3) | −1.57 | **Largest effect.** Counterintuitive sign — see note below | [asEngine.js:1513](../src/asEngine.js:1513) |
| `current_smoking_category` | categorical | −0.72 | | [asEngine.js:1506](../src/asEngine.js:1506) |
| `race_category_2` | categorical | −0.61 | **Fixed to a constant reference value for every patient — see note below** | [asEngine.js:1505](../src/asEngine.js:1505) |
| `fhx_ovarian_category` | categorical | −0.50 | | [asEngine.js:1511](../src/asEngine.js:1511) |
| `fhx_breast_category` | categorical | +0.24 | | [asEngine.js:1510](../src/asEngine.js:1510) |
| `ece_category` (extracapsular extension) | binary | +0.24 | | [asEngine.js:1514](../src/asEngine.js:1514) |
| `hld_category` (hyperlipidemia) | categorical | −0.23 | | [asEngine.js:1508](../src/asEngine.js:1508) |
| `diabetes_category` | categorical | +0.21 | | [asEngine.js:1509](../src/asEngine.js:1509) |
| `psa_result_ng` | continuous | +0.021 | Higher PSA → higher risk | [asEngine.js:1503](../src/asEngine.js:1503) |
| `total_positive_cores` | continuous | +0.057 | More positive cores → higher risk | [asEngine.js:1501](../src/asEngine.js:1501) |
| `fhx_prostate_category` | categorical | −0.086 | | [asEngine.js:1512](../src/asEngine.js:1512) |
| `as_mri_prostate_vol` | continuous | −0.016 | Larger prostate → lower risk (dilutes PSAD) | [asEngine.js:1504](../src/asEngine.js:1504) |
| `highest_pirads_category` | categorical | +0.039 | | [asEngine.js:1516](../src/asEngine.js:1516) |
| `abut_category` (NVB abutment) | binary | +0.031 | | [asEngine.js:1515](../src/asEngine.js:1515) |
| `htn_category` (hypertension) | categorical | −0.026 | | [asEngine.js:1507](../src/asEngine.js:1507) |
| `perc_highest_core_involvement...` | continuous | +0.0036 | | [asEngine.js:1502](../src/asEngine.js:1502) |
| `bmi` | continuous | −0.0011 | | [asEngine.js:1499](../src/asEngine.js:1499) |
| `age_first_diagnosis` | continuous | +0.013 | | [asEngine.js:1500](../src/asEngine.js:1500) |

**Two things worth flagging to a statistician reviewing this list:**

1. **Grade Group has the largest coefficient and it's negative** — meaning the model, taken
   at face value, says higher grade predicts *lower* upgrade risk. This is very likely
   selection bias, not biology: patients enrolled in AS with GG2/GG3 are a highly selected,
   lower-risk subset of everyone diagnosed at that grade (the rest go straight to treatment).
   It's a known, documented limitation of fitting on a surveillance-only cohort, not a bug.
2. **Race is in the coefficient list but never actually varies per patient.** The code fixes
   `race_category_2` to one constant value for every patient — see
   [`src/asEngine.js:1674`](../src/asEngine.js:1674) (`RACE_REFERENCE_OFFSET`) — kept only
   because dropping the term outright would silently shift the model's calibration.
   Confirmed by test: race input never changes the output probability (see
   [`src/__tests__/asEngine.test.js`](../src/__tests__/asEngine.test.js), test *"race NEVER
   affects the Layer 3 probability, by design"*). This was a deliberate design decision,
   documented at length in the code, to avoid re-emitting a known historical disparity
   (under-offering of AS to Black patients in comparable cohorts) as an individualized risk
   number.

Two inputs commonly assumed to matter (**PSAD** itself, and **PI-RADS**) are *not* separate
terms in this model — PSA and prostate volume enter individually and PSAD is implicit in
their ratio; PI-RADS enters with a small coefficient (+0.039) and is not a strong driver
here, consistent with the mixed evidence on its independent predictive value in this cohort.

## What was empirically tested and rejected as alternatives

Before settling on `fullModel` as the primary output, three alternative ways of combining
the same clinical variables were tested against the real cohort outcomes
([`data/compare_scoring_systems.py`](../data/compare_scoring_systems.py),
[`data/validate_fullmodel_auc.py`](../data/validate_fullmodel_auc.py)):

| Approach | AUC | Verdict |
|---|---|---|
| Hand-picked point-scoring system (previously used for the "tier") | 0.538 | Barely above chance |
| Published CAPRA score (Cooperberg et al.) applied to this population | 0.500 | Exactly chance — CAPRA is validated on general-population risk stratification, not on an already-selected AS cohort |
| "Worst single risk factor wins" tier | 0.489 | Worse than chance |
| **`fullModel`** | **0.65 (0.647 cross-validated)** | Only one that discriminates |

Conclusion: only the fitted logistic regression should be presented as a quantitative risk
estimate. The guideline checklist ([`calcBasic`](../src/asEngine.js:567)) and monitoring
checklist ([`calcMonitoring`](../src/asEngine.js:945)) remain useful for eligibility and
scheduling, but are not statistically predictive on their own — this is why
[`calcCombined`](../src/asEngine.js:1061) no longer lets `calcBasic`'s output move the
surveillance-intensity tier.

## Known limitations for a reviewer to weigh

- N=1,213 is single-site (Mount Sinai). No external validation cohort.
- AUC 0.65 is moderate, not strong, discrimination.
- The training population is inherently selected (only patients who chose/were offered AS),
  which is the likely source of the GG2/GG3 sign reversal noted above.
- `fhx_*` (family history), smoking, and comorbidity fields carry meaningful coefficients but
  their clinical plausibility as *causal* upgrade predictors (vs. confounded/proxy effects)
  hasn't been separately assessed.
- Missing-value imputation for the model's continuous fields (BMI, age, max-core%, PSA,
  volume) currently uses fixed constants — see
  [`src/asEngine.js:1623–1628`](../src/asEngine.js:1623) — that are documented as
  "approximate cohort medians" but are not verified against `data/analyze_upgrade.py`'s
  actual training output. Flagged as open item U14 in [EVIDENCE_AUDIT.md](EVIDENCE_AUDIT.md), not yet resolved.

## Where to look in the code

| What | File / line |
|---|---|
| The model's prediction path | [`src/asEngine.js:1586`](../src/asEngine.js:1586) — `calcUpgradeRisk` |
| Coefficients and intercept | [`src/asEngine.js:1488–1517`](../src/asEngine.js:1488) — `UPGRADE_RISK_MODEL.fullModel` |
| Guideline checklist (informational, not predictive) | [`src/asEngine.js:567`](../src/asEngine.js:567) — `calcBasic` |
| Monitoring checklist / tier | [`src/asEngine.js:945`](../src/asEngine.js:945) — `calcMonitoring` |
| How tiers combine | [`src/asEngine.js:1061`](../src/asEngine.js:1061) — `calcCombined` |
| Fitting script (needs the raw patient CSV, not in this repo) | [`data/analyze_upgrade.py`](../data/analyze_upgrade.py) |
| AUC validation script (reproduces the numbers above) | [`data/validate_fullmodel_auc.py`](../data/validate_fullmodel_auc.py) |
| Alternative scoring comparison | [`data/compare_scoring_systems.py`](../data/compare_scoring_systems.py) |
| Full audit of every other threshold/constant in the engine | [EVIDENCE_AUDIT.md](EVIDENCE_AUDIT.md) |
