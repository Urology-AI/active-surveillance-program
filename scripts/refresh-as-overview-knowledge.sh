#!/usr/bin/env bash
# Regenerate src/data/active_surveillance_overview_knowledge.txt from a PDF
# (image-based PDFs: render pages to PNG, then OCR with tesseract).
#
# Usage:
#   ./scripts/refresh-as-overview-knowledge.sh [/path/to/active_surveillance_overview.pdf]
#
# Requires: pdftoppm, tesseract (with eng traineddata)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="${1:-$HOME/Downloads/active_survillance_overview.pdf}"
OUT="$ROOT/src/data/active_surveillance_overview_knowledge.txt"
TMP="$ROOT/src/data/.ocr-tmp"

if [[ ! -f "$PDF" ]]; then
  echo "PDF not found: $PDF" >&2
  exit 1
fi

command -v pdftoppm >/dev/null || { echo "pdftoppm missing (poppler)" >&2; exit 1; }
command -v tesseract >/dev/null || { echo "tesseract missing" >&2; exit 1; }

mkdir -p "$(dirname "$OUT")"
rm -rf "$TMP"
mkdir -p "$TMP"

pdftoppm -png -r 150 "$PDF" "$TMP/page"
rm -f "$OUT"
for img in "$TMP"/page-*.png; do
  [[ -f "$img" ]] || continue
  echo "===== PAGE $(basename "$img") =====" >> "$OUT"
  tesseract "$img" stdout -l eng 2>/dev/null >> "$OUT" || true
  echo "" >> "$OUT"
done

rm -rf "$TMP"
echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
