# Docs

| Doc | What it's for |
|---|---|
| [MODEL_OVERVIEW.md](MODEL_OVERVIEW.md) | Plain-language summary of the predictive model for a data analyst/statistician: what's validated, all 18 input variables with coefficients, what alternatives were tested and rejected, known limitations. |
| [EVIDENCE_AUDIT.md](EVIDENCE_AUDIT.md) | Full line-by-line audit of every numeric constant in the clinical engine — classified as sourced to a guideline/publication, derivable from cohort data, or unsourced. Historical record of the review that drove the Layer 1 remediation in [PR #45](https://github.com/Urology-AI/active-surveillance-program/pull/45); still tracks open items (U5–U28). |

Start with **MODEL_OVERVIEW.md** if you want to understand what the tool predicts and how.
Go to **EVIDENCE_AUDIT.md** if you're checking provenance of a specific threshold or constant.
