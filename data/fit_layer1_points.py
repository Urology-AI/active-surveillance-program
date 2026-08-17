"""
Clinical-only refit for the Layer 1 (asScore) points system.

Excludes race, smoking, and comorbidity fields — consistent with the
documented exclusion policy in src/asEngine.js (race is display-only,
riskAdjustmentUse: false). Fits GGG, PSAD, positive core count, max core
involvement, PI-RADS, ECE, and NVB abutment only: the same variables the
existing points system already scores.

Points conversion: standard Sullivan/Framingham-style scaling. Each
categorical level's coefficient (log-odds relative to its reference level)
is multiplied by a constant B and rounded to the nearest integer, so that
"points" stay interpretable as roughly log-odds x B. B = 10 is used, which
puts the reference GGG2-vs-GGG1 step in the same order of magnitude as the
current hand-picked value (8 pts) for direct comparison. This is a display
convention for interpretability, not a claim of precision beyond the fit.
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import argparse, json, warnings, os
warnings.filterwarnings('ignore')

parser = argparse.ArgumentParser()
parser.add_argument('csv')
args = parser.parse_args()

df = pd.read_csv(args.csv)
print(f"Loaded {len(df)} rows")

TARGET = 'upgrade_y_n'
df = df.dropna(subset=[TARGET])
if df[TARGET].dtype == object:
    y = (df[TARGET].str.strip().str.lower().isin(['yes', 'y', '1', 'true'])).astype(int)
else:
    y = df[TARGET].astype(int)

# ── Derived clinical features (mirrors what asEngine.js actually scores) ──────
df['psad'] = df['psa_result_ng'] / df['as_mri_prostate_vol']

ggg_map = {'Grade Group 1': 'GG1', 'Grade Group 2': 'GG2', 'Grade Group 3': 'GG3'}
df['ggg'] = df['first_positive_bx_ggg_named'].map(ggg_map)

def psad_band(v):
    if pd.isna(v): return np.nan
    if v > 0.177: return 'psad_gt_0177'
    if v > 0.15:  return 'psad_015_0177'
    if v > 0.065: return 'psad_0065_015'
    return 'psad_le_0065'
df['psad_band'] = df['psad'].apply(psad_band)

def pirads_band(v):
    if pd.isna(v) or 'No PIRADS' in str(v) or 'Unknown' in str(v): return np.nan
    return str(v).replace('PIRADS ', 'pirads_')
df['pirads_band'] = df['highest_pirads_category'].apply(pirads_band)

df['max_core_gt50'] = (df['perc_highest_core_involvement_for_highest_gleason'] > 50).astype(float)
df['cores_ge3'] = (df['total_positive_cores'] >= 3).astype(float)
df['ece_yes'] = (df['ece_category'] == 'Yes').astype(float)
df['abut_yes'] = (df['abut_category'] == 'Yes').astype(float)

CATEGORICAL = ['ggg', 'psad_band', 'pirads_band']
NUMERIC = ['max_core_gt50', 'cores_ge3', 'ece_yes', 'abut_yes']

keep = CATEGORICAL + NUMERIC
X = df[keep]
mask = X[CATEGORICAL].notna().all(axis=1)  # require known GGG/PSAD/PI-RADS to be in the fit
X, y = X[mask], y[mask]
print(f"Usable rows (known GGG, PSAD, PI-RADS): {len(y)}  Upgrades: {y.sum()} ({y.mean()*100:.1f}%)")

pre = ColumnTransformer([
    ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), CATEGORICAL),
    ('num', SimpleImputer(strategy='median'), NUMERIC),
])
pipe = Pipeline([('pre', pre), ('model', LogisticRegression(max_iter=2000, class_weight='balanced'))])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
auc = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc').mean()
pipe.fit(X, y)

feat_names = pipe.named_steps['pre'].get_feature_names_out()
coefs = pipe.named_steps['model'].coef_[0]
intercept = float(pipe.named_steps['model'].intercept_[0])

B = 10
result = {
    'n_fit': int(len(y)),
    'n_upgrades_fit': int(y.sum()),
    'upgrade_rate_fit_pct': round(float(y.mean()) * 100, 1),
    'cv_auc': round(float(auc), 3),
    'intercept': round(intercept, 4),
    'coefficients_and_points': {
        name: {'log_odds': round(float(c), 4), 'points_B10': round(float(c) * B)}
        for name, c in zip(feat_names, coefs)
    },
}
print(json.dumps(result, indent=2))
out_path = os.path.join(os.path.dirname(args.csv), 'layer1_points_fit.json')
with open(out_path, 'w') as f:
    json.dump(result, f, indent=2)
print(f"\nSaved to {out_path}")
