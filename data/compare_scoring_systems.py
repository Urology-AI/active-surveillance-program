"""
Compares three scoring approaches against the real upgrade outcome, using only
aggregate statistics (AUC, counts) -- no row-level data is printed or retained.

1. CURRENT  -- this repo's existing calcBasic point system, reimplemented here
2. CAPRA-approx -- published Cooperberg CAPRA points, using only the fields
   available in this CSV (no clinical T-stage column -> assumed T1c/T2 for all,
   0 pts, reasonable for an AS-eligible cohort; no total-core denominator ->
   using the NCCN absolute count gate >=3 as a substitute for the %positive
   cores >=34% CAPRA item, since %positive cores can't be computed without a
   denominator this file doesn't have)
3. EXISTING fullModel -- already-fitted logistic regression already in asEngine.js
"""
import pandas as pd
import numpy as np
from sklearn.metrics import roc_auc_score
import argparse, json

parser = argparse.ArgumentParser()
parser.add_argument('csv')
args = parser.parse_args()

df = pd.read_csv(args.csv)
TARGET = 'upgrade_y_n'
df = df.dropna(subset=[TARGET])
y = df[TARGET].astype(int) if df[TARGET].dtype != object else \
    (df[TARGET].str.strip().str.lower().isin(['yes', 'y', '1', 'true'])).astype(int)

df['psad'] = df['psa_result_ng'] / df['as_mri_prostate_vol']
ggg_map = {'Grade Group 1': 1, 'Grade Group 2': 2, 'Grade Group 3': 3}
df['ggg'] = df['first_positive_bx_ggg_named'].map(ggg_map)

def pirads_num(v):
    if pd.isna(v) or 'No PIRADS' in str(v) or 'Unknown' in str(v): return np.nan
    return int(str(v).replace('PIRADS ', ''))
df['pirads'] = df['highest_pirads_category'].apply(pirads_num)

# ── 1. CURRENT calcBasic (reimplemented) ──────────────────────────────────────
def current_score(row):
    s = 0
    ggg_pts = {1: 0, 2: 8, 3: 22}
    if pd.notna(row['ggg']): s += ggg_pts.get(int(row['ggg']), 0)
    pc = row['total_positive_cores']
    if pd.notna(pc):
        # ratio unavailable (no total_cores column) -- use count-gate points only
        s += 6 if pc >= 3 else 0
    if pd.notna(row['perc_highest_core_involvement_for_highest_gleason']):
        s += 4 if row['perc_highest_core_involvement_for_highest_gleason'] > 50 else 0
    if pd.notna(row['psad']):
        p = row['psad']
        s += 12 if p > 0.177 else 5 if p > 0.15 else 0 if p > 0.065 else -5
    if pd.notna(row['pirads']):
        s += {1: -5, 2: -3, 3: 0, 4: 8, 5: 15}.get(int(row['pirads']), 0)
    return s

# ── 2. CAPRA-approx (published points, fields available here only) ────────────
def capra_score(row):
    s = 0
    psa = row['psa_result_ng']
    if pd.notna(psa):
        s += 0 if psa <= 6 else 1 if psa <= 10 else 2 if psa <= 20 else 3 if psa <= 30 else 4
    if pd.notna(row['ggg']):
        s += {1: 0, 2: 1, 3: 3}.get(int(row['ggg']), 0)
    # clinical T-stage not in this CSV -- AS-eligible cohort assumed T1c/T2 (0 pts)
    pc = row['total_positive_cores']
    if pd.notna(pc):
        s += 1 if pc >= 3 else 0  # substitute for %positive-cores>=34% (no denominator here)
    age = row['age_first_diagnosis']
    if pd.notna(age):
        s += 1 if age >= 50 else 0
    return s

df['current_pts'] = df.apply(current_score, axis=1)
df['capra_pts'] = df.apply(capra_score, axis=1)

def auc_for(col):
    sub = df.dropna(subset=[col])
    if sub[col].nunique() < 2: return None
    return round(roc_auc_score(sub[TARGET].astype(int) if sub[TARGET].dtype != object else
                 (sub[TARGET].str.strip().str.lower().isin(['yes','y','1','true'])).astype(int),
                 sub[col]), 3)

result = {
    'n_total': int(len(df)),
    'current_calcBasic_score_AUC': auc_for('current_pts'),
    'current_calcBasic_score_n':   int(df['current_pts'].notna().sum()),
    'capra_approx_AUC':            auc_for('capra_pts'),
    'capra_approx_n':              int(df['capra_pts'].notna().sum()),
    'note': 'Both scored on full available cohort (in-sample), not held out -- '
            'for relative comparison only. existing fullModel AUC (0.65, N=1213, '
            'cross-validated) is documented separately in asEngine.js / prior fit run.',
}
print(json.dumps(result, indent=2))

# ── 3. Proposed gates-only design: worst single-factor tier wins ──────────────
def gate_tier(row):
    tiers = []
    if pd.notna(row['ggg']):
        tiers.append({1: 0, 2: 0, 3: 1}.get(int(row['ggg']), 0))  # low/low/intermediate
    pc = row['total_positive_cores']
    if pd.notna(pc):
        tiers.append(0 if pc < 3 else 1)  # NCCN count gate (ratio unavailable here)
    if pd.notna(row['perc_highest_core_involvement_for_highest_gleason']):
        tiers.append(1 if row['perc_highest_core_involvement_for_highest_gleason'] > 50 else 0)
    if pd.notna(row['psad']):
        p = row['psad']
        tiers.append(2 if p > 0.177 else 1 if p > 0.15 else 0)
    if pd.notna(row['pirads']):
        tiers.append({1: 0, 2: 0, 3: 1, 4: 2, 5: 2}.get(int(row['pirads']), 0))
    return max(tiers) if tiers else np.nan

df['gate_tier'] = df.apply(gate_tier, axis=1)
print(json.dumps({'gates_only_worst_tier_AUC': auc_for('gate_tier'), 'n': int(df['gate_tier'].notna().sum())}, indent=2))
