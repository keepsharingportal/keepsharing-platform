#!/usr/bin/env bash
# Third pass — hover darker shades + remaining stragglers
set -e
ROOT="src/app/admin"

find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bhover:bg-purple-700\b/hover:bg-portal-navy/g' \
  -e 's/\bhover:bg-purple-600\b/hover:bg-portal-blue/g' \
  -e 's/\bhover:bg-teal-700\b/hover:bg-portal-green/g' \
  -e 's/\bhover:bg-emerald-800\b/hover:bg-portal-green/g' \
  -e 's/\bhover:bg-amber-800\b/hover:bg-portal-amber/g' \
  -e 's/\bhover:bg-sky-700\b/hover:bg-portal-blue/g' \
  -e 's/\bhover:bg-sky-800\b/hover:bg-portal-blue/g' \
  -e 's/\bbg-sky-700\b/bg-portal-blue/g' \
  -e 's/\bhover:text-rose-900\b/hover:text-portal-red/g' \
  -e 's/\bhover:text-amber-950\b/hover:text-portal-amber/g' \
  -e 's/\btext-rose-900\b/text-portal-red/g' \
  -e 's/\btext-sky-900\b/text-portal-blue/g' \
  -e 's/\btext-red-400\b/text-portal-red/g' \
  -e 's/\bbg-red-400\b/bg-portal-red/g' \
  -e 's/\bbg-red-200\b/bg-portal-red-lt/g' \
  -e 's/\btext-yellow-400\b/text-portal-amber/g' \
  -e 's/\btext-yellow-900\b/text-portal-amber/g' \
  -e 's/\btext-amber-950\b/text-portal-amber/g' \
  -e 's/\bbg-yellow-400\b/bg-portal-amber/g' \
  -e 's/\bbg-blue-200\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-blue-400\b/bg-portal-blue/g' \
  -e 's/\bbg-indigo-400\b/bg-portal-blue/g' \
  -e 's/\bbg-gray-400\b/bg-portal-border-2/g' \
  -e 's/\bbg-gray-500\b/bg-portal-muted/g' \
  -e 's/\btext-blue-200\b/text-portal-blue\/70/g' \
  -e 's/\bborder-orange-100\b/border-portal-amber\/20/g' \
  -e 's/\bborder-orange-200\b/border-portal-amber\/30/g'

echo "Pass 3 complete."
