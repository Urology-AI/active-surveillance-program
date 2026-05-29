import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import argparse, json, warnings, sys, os
warnings.filterwarnings('ignore')

parser = argparse.ArgumentParser(description='Upgrade prediction model')
parser.add_argument('csv', help='Path to input CSV file')
args = parser.parse_args()

# ── Load your data ────────────────────────────────────────────────────────────
df = pd.read_csv(args.csv)
print(f"Loaded {len(df)} rows from {args.csv}")

TARGET = 'upgrade_y_n'

NUMERIC_COLS = [
    'bmi', 'age_first_diagnosis',
    'total_positive_cores', 'perc_highest_core_involvement_for_highest_gleason',
    'psa_result_ng', 'as_mri_prostate_vol'
]

CATEGORICAL_COLS = [
    'race_category_2', 'current_smoking_category', 'htn_category',
    'hld_category', 'diabetes_category', 'fhx_breast_category',
    'fhx_ovarian_category', 'fhx_prostate_category',
    'first_positive_bx_ggg_named', 'ece_category', 'abut_category',
    'highest_pirads_category'
    # upgrade_category excluded — likely derived from outcome
]

# ── Encode categoricals ───────────────────────────────────────────────────────
df_enc = df.copy()
encoders = {}
for col in CATEGORICAL_COLS:
    if col in df_enc.columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str).fillna('Unknown'))
        encoders[col] = list(le.classes_)

# Encode target — drop rows where outcome is missing
df_enc = df_enc.dropna(subset=[TARGET])
if df_enc[TARGET].dtype == object:
    df_enc[TARGET] = (df_enc[TARGET].str.strip().str.lower().isin(['yes', 'y', '1', 'true'])).astype(int)
else:
    df_enc[TARGET] = df_enc[TARGET].astype(int)

feature_cols = [c for c in NUMERIC_COLS + CATEGORICAL_COLS if c in df_enc.columns]
X = df_enc[feature_cols]
y = df_enc[TARGET]

print(f"Samples: {len(y)}  |  Upgrades: {y.sum()} ({y.mean()*100:.1f}%)\n")

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# ── Logistic regression ───────────────────────────────────────────────────────
pipe_lr = Pipeline([
    ('impute', SimpleImputer(strategy='median')),
    ('model',  LogisticRegression(max_iter=1000, class_weight='balanced'))
])
auc_lr = cross_val_score(pipe_lr, X, y, cv=cv, scoring='roc_auc').mean()
pipe_lr.fit(X, y)
coefs = dict(zip(feature_cols, pipe_lr.named_steps['model'].coef_[0].round(4)))
intercept = round(float(pipe_lr.named_steps['model'].intercept_[0]), 4)

# ── Random forest ─────────────────────────────────────────────────────────────
pipe_rf = Pipeline([
    ('impute', SimpleImputer(strategy='median')),
    ('model',  RandomForestClassifier(n_estimators=300, class_weight='balanced', random_state=42))
])
auc_rf = cross_val_score(pipe_rf, X, y, cv=cv, scoring='roc_auc').mean()
pipe_rf.fit(X, y)
importances = dict(zip(feature_cols, pipe_rf.named_steps['model'].feature_importances_.round(4)))
importances_sorted = dict(sorted(importances.items(), key=lambda x: -x[1]))

# ── Percentile breakpoints (for UI calibration) ──────────────────────────────
probs_all = pipe_lr.predict_proba(SimpleImputer(strategy='median').fit_transform(X))[:, 1]
pct_breaks = {}
for p in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]:
    pct_breaks[p] = round(float(np.percentile(probs_all, p)), 4)

# ── Output ────────────────────────────────────────────────────────────────────
output = {
    "n_patients": int(len(y)),
    "n_upgrades": int(y.sum()),
    "upgrade_rate_pct": round(y.mean() * 100, 1),
    "logistic_regression": {
        "cv_auc": round(auc_lr, 3),
        "intercept": intercept,
        "coefficients": coefs
    },
    "random_forest": {
        "cv_auc": round(auc_rf, 3),
        "feature_importances": importances_sorted
    },
    "category_encodings": encoders,
    "risk_percentiles": pct_breaks
}

print(json.dumps(output, indent=2))

out_path = os.path.join(os.path.dirname(args.csv), 'model_output.json')
with open(out_path, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\n✓ Saved to {out_path}")
