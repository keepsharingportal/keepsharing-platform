#!/usr/bin/env bash
# Second pass on Today components — catch the color palette I missed
# (greens, reds, amber-400/500, plus the sed-typo bg-portal-green-lt0).
set -e
ROOT="src/components/today"

find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  `: # sed-typo cleanup from earlier sweeps` \
  -e 's/bg-portal-green-lt0/bg-portal-green/g' \
  -e 's/bg-portal-amber-lt0/bg-portal-amber/g' \
  -e 's/bg-portal-red-lt0/bg-portal-red/g' \
  -e 's/bg-portal-blue-lt0/bg-portal-blue/g' \
  `: # greens` \
  -e 's/\bbg-green-50\b/bg-portal-green-lt/g' \
  -e 's/\bbg-green-100\b/bg-portal-green-lt/g' \
  -e 's/\bhover:bg-green-50\b/hover:bg-portal-green-lt/g' \
  -e 's/\bhover:bg-green-100\b/hover:bg-portal-green-lt/g' \
  -e 's/\bring-green-200\b/ring-portal-green\/30/g' \
  -e 's/\btext-green-400\b/text-portal-green/g' \
  -e 's/\btext-green-500\b/text-portal-green/g' \
  -e 's/\btext-green-600\b/text-portal-green/g' \
  -e 's/\btext-green-700\b/text-portal-green/g' \
  -e 's/\bbg-green-400\b/bg-portal-green/g' \
  -e 's/\bbg-green-500\b/bg-portal-green/g' \
  -e 's/\bbg-emerald-50\b/bg-portal-green-lt/g' \
  -e 's/\bbg-emerald-100\b/bg-portal-green-lt/g' \
  -e 's/\btext-emerald-500\b/text-portal-green/g' \
  -e 's/\btext-emerald-600\b/text-portal-green/g' \
  -e 's/\btext-emerald-700\b/text-portal-green/g' \
  -e 's/\bborder-l-green-400\b/border-l-portal-green/g' \
  `: # reds + rose` \
  -e 's/\bbg-red-50\b/bg-portal-red-lt/g' \
  -e 's/\bbg-red-100\b/bg-portal-red-lt/g' \
  -e 's/\bhover:bg-red-50\b/hover:bg-portal-red-lt/g' \
  -e 's/\bhover:bg-red-100\b/hover:bg-portal-red-lt/g' \
  -e 's/\bring-red-200\b/ring-portal-red\/30/g' \
  -e 's/\btext-red-400\b/text-portal-red/g' \
  -e 's/\btext-red-500\b/text-portal-red/g' \
  -e 's/\btext-red-600\b/text-portal-red/g' \
  -e 's/\btext-red-700\b/text-portal-red/g' \
  -e 's/\bbg-red-400\b/bg-portal-red/g' \
  -e 's/\bbg-red-500\b/bg-portal-red/g' \
  -e 's/\bbg-rose-50\b/bg-portal-red-lt/g' \
  -e 's/\btext-rose-500\b/text-portal-red/g' \
  -e 's/\btext-rose-600\b/text-portal-red/g' \
  -e 's/\bborder-l-red-400\b/border-l-portal-red/g' \
  `: # amber` \
  -e 's/\bbg-amber-400\b/bg-portal-amber/g' \
  -e 's/\bbg-amber-500\b/bg-portal-amber/g' \
  -e 's/\btext-amber-400\b/text-portal-amber/g' \
  -e 's/\bborder-l-amber-400\b/border-l-portal-amber/g' \
  `: # yellows + orange that may show up` \
  -e 's/\bbg-yellow-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-orange-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-orange-100\b/bg-portal-amber-lt/g' \
  `: # blues that slipped through` \
  -e 's/\bbg-blue-50\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-blue-100\b/bg-portal-blue-lt/g' \
  -e 's/\btext-blue-500\b/text-portal-blue/g' \
  -e 's/\btext-blue-600\b/text-portal-blue/g' \
  -e 's/\btext-blue-700\b/text-portal-blue/g' \
  `: # slate variants used as muted text` \
  -e 's/\btext-slate-400\b/text-portal-muted/g' \
  -e 's/\btext-slate-500\b/text-portal-sub/g' \
  -e 's/\btext-slate-600\b/text-portal-sub/g' \
  -e 's/\btext-slate-700\b/text-portal-text/g' \
  `: # gradient backgrounds get flattened` \
  -e 's/bg-gradient-to-r from-amber-50 via-white to-white/bg-portal-amber-lt/g' \
  -e 's/bg-gradient-to-r from-portal-amber-lt via-white to-white/bg-portal-amber-lt/g'

echo "Today sweep pass 2 complete."
