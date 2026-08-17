"""
Validates the AUC=0.65 already documented for UPGRADE_RISK_MODEL.fullModel in
asEngine.js, two ways:

  A) Apply the EXACT coefficients already hardcoded and shipped in asEngine.js
     to this data and compute AUC directly -- does the deployed model still
     discriminate on this data? (AUC is intercept-invariant, so the class-
     balance recalibration in the code doesn't affect this check.)
  B) Refit fresh with 5-fold stratified cross-validation -- does an
     out-of-sample refit reproduce ~0.65, or was the documented number
     optimistic / in-sample?

Only aggregate AUC/N values are printed -- no row-level data.
"""
import pandas as pd
import numpy as np
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import argparse, json

parser = argparse.ArgumentParser()
parser.add_argument('csv')
args = parser.parse_args()

df = pd.read_csv(args.csv)
TARGET = 'upgrade_y_n'
df = df.dropna(subset=[TARGET])
y = df[TARGET].astype(int) if df[TARGET].dtype != object else \
    (df[TARGET].str.strip().str.lower().isin(['yes', 'y', '1', 'true'])).astype(int)

NUMERIC_COLS = ['bmi', 'age_first_diagnosis', 'total_positive_cores',
                 'perc_highest_core_involvement_for_highest_gleason',
                 'psa_result_ng', 'as_mri_prostate_vol']
# Encodings exactly as produced by sklearn LabelEncoder (alphabetical order),
# taken from the model_output.json this data produced earlier.
CAT_ENCODINGS = {
    'race_category_2': ['African American', 'Caucasian', 'Other', 'Unknown'],
    'current_smoking_category': ['No', 'Unknown', 'Yes'],
    'htn_category': ['No', 'Unknown', 'Yes'],
    'hld_category': ['No', 'Unknown', 'Yes'],
    'diabetes_category': ['No', 'Unknown', 'Yes'],
    'fhx_breast_category': ['No', 'Unknown', 'Yes'],
    'fhx_ovarian_category': ['No', 'Unknown', 'Yes'],
    'fhx_prostate_category': ['No', 'Unknown', 'Yes'],
    'first_positive_bx_ggg_named': ['Grade Group 1', 'Grade Group 2', 'Grade Group 3', 'Unknown'],
    'ece_category': ['No', 'Unknown', 'Yes'],
    'abut_category': ['No', 'Unknown', 'Yes'],
    'highest_pirads_category': ['No PIRADS Assigned', 'PIRADS 1', 'PIRADS 2', 'PIRADS 3', 'PIRADS 4', 'PIRADS 5', 'Unknown'],
}
CATEGORICAL_COLS = list(CAT_ENCODINGS.keys())
FEATURE_COLS = NUMERIC_COLS + CATEGORICAL_COLS

# Exact coefficients currently hardcoded in src/asEngine.js UPGRADE_RISK_MODEL.fullModel
SHIPPED_COEF = {
    'bmi': -0.0011, 'age_first_diagnosis': 0.0128, 'total_positive_cores': 0.0565,
    'perc_highest_core_involvement_for_highest_gleason': 0.0036, 'psa_result_ng': 0.0213,
    'as_mri_prostate_vol': -0.0159, 'race_category_2': -0.6089, 'current_smoking_category': -0.7248,
    'htn_category': -0.0261, 'hld_category': -0.2339, 'diabetes_category': 0.2072,
    'fhx_breast_category': 0.2385, 'fhx_ovarian_category': -0.4996, 'fhx_prostate_category': -0.0858,
    'first_positive_bx_ggg_named': -1.5655, 'ece_category': 0.2367, 'abut_category': 0.0314,
    'highest_pirads_category': 0.0391,
}

df_enc = df.copy()
for col, classes in CAT_ENCODINGS.items():
    idx = {c: i for i, c in enumerate(classes)}
    df_enc[col] = df_enc[col].astype(str).fillna('Unknown').map(lambda v: idx.get(v, idx.get('Unknown', 0)))

X = df_enc[FEATURE_COLS]
imputer = SimpleImputer(strategy='median')
X_imp = pd.DataFrame(imputer.fit_transform(X), columns=FEATURE_COLS, index=X.index)

# ── A) shipped coefficients applied directly ───────────────────────────────────
logit_shipped = sum(X_imp[c] * SHIPPED_COEF[c] for c in FEATURE_COLS)
auc_shipped = round(roc_auc_score(y, logit_shipped), 3)

# ── B) fresh 5-fold cross-validated refit on identical feature set ─────────────
pipe = Pipeline([('impute', SimpleImputer(strategy='median')),
                  ('model', LogisticRegression(max_iter=1000, class_weight='balanced'))])
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
auc_cv = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc').mean()

print(json.dumps({
    'n': int(len(y)),
    'n_upgrades': int(y.sum()),
    'A_shipped_coefficients_AUC_on_this_data': auc_shipped,
    'B_fresh_5fold_cv_refit_AUC': round(float(auc_cv), 3),
    'documented_in_asEngine_js': 0.65,
}, indent=2))
