#!/usr/bin/env bash
# Sweep stray Tailwind defaults inside src/components/today to Portal tokens.
# Same mapping table as the global sweep — just scoped to this folder.
set -e
ROOT="src/components/today"

find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-white\b/bg-white/g' \
  -e 's/\bbg-gray-50\b/bg-portal-bg/g' \
  -e 's/\bbg-gray-100\b/bg-portal-row-hover/g' \
  -e 's/\bbg-gray-200\b/bg-portal-border-2/g' \
  -e 's/\bbg-gray-300\b/bg-portal-border-2/g' \
  -e 's/\bbg-gray-700\b/bg-portal-navy/g' \
  -e 's/\bbg-gray-900\b/bg-portal-navy/g' \
  -e 's/\bhover:bg-gray-50\b/hover:bg-portal-row-hover/g' \
  -e 's/\bhover:bg-gray-100\b/hover:bg-portal-row-hover/g' \
  -e 's/\bhover:bg-gray-700\b/hover:opacity-90/g' \
  -e 's/\btext-gray-300\b/text-portal-border-2/g' \
  -e 's/\btext-gray-400\b/text-portal-muted/g' \
  -e 's/\btext-gray-500\b/text-portal-sub/g' \
  -e 's/\btext-gray-600\b/text-portal-sub/g' \
  -e 's/\btext-gray-700\b/text-portal-text/g' \
  -e 's/\btext-gray-800\b/text-portal-text/g' \
  -e 's/\btext-gray-900\b/text-portal-text/g' \
  -e 's/\bhover:text-gray-700\b/hover:text-portal-text/g' \
  -e 's/\bhover:text-gray-900\b/hover:text-portal-text/g' \
  -e 's/\bborder-gray-100\b/border-portal-border/g' \
  -e 's/\bborder-gray-200\b/border-portal-border/g' \
  -e 's/\bborder-gray-300\b/border-portal-border-2/g' \
  -e 's/\brounded-2xl\b/rounded-lg/g' \
  -e 's/\brounded-xl\b/rounded-lg/g' \
  -e 's/\bshadow-xl\b/shadow-md/g' \
  -e 's/\bshadow-lg\b/shadow-md/g' \
  -e 's/\bbg-amber-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-amber-100\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-amber-500\b/bg-portal-amber/g' \
  -e 's/\bbg-amber-600\b/bg-portal-amber/g' \
  -e 's/\btext-amber-500\b/text-portal-amber/g' \
  -e 's/\btext-amber-600\b/text-portal-amber/g' \
  -e 's/\btext-amber-700\b/text-portal-amber/g' \
  -e 's/\btext-amber-800\b/text-portal-amber/g' \
  -e 's/\bborder-amber-200\b/border-portal-amber\/30/g' \
  -e 's/\bring-amber-200\b/ring-portal-amber\/30/g'

echo "Today sweep complete."
