#!/usr/bin/env bash
# Third pass — remaining 600/700/800 shades + a stray focus:border-gray.
set -e
ROOT="src/components/today"

find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-red-600\b/bg-portal-red/g' \
  -e 's/\bbg-red-700\b/bg-portal-red/g' \
  -e 's/\bring-red-700\b/ring-portal-red\/40/g' \
  -e 's/\btext-red-800\b/text-portal-red/g' \
  -e 's/\bborder-red-100\b/border-portal-red\/20/g' \
  -e 's/\bbg-blue-200\b/bg-portal-blue-lt/g' \
  -e 's/\bborder-blue-200\b/border-portal-blue\/30/g' \
  -e 's/\bring-blue-200\b/ring-portal-blue\/30/g' \
  -e 's/\btext-blue-800\b/text-portal-blue/g' \
  -e 's/\bbg-blue-600\b/bg-portal-blue/g' \
  -e 's/\bbg-blue-700\b/bg-portal-navy/g' \
  -e 's/\bhover:bg-blue-700\b/hover:bg-portal-navy/g' \
  -e 's/\bborder-green-200\b/border-portal-green\/30/g' \
  -e 's/\btext-green-800\b/text-portal-green/g' \
  -e 's/\bfocus:border-gray-500\b/focus:border-portal-blue/g'

echo "Today sweep pass 3 complete."
