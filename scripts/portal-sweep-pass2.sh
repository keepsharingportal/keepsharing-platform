#!/usr/bin/env bash
# Second pass — catch orange/pink/sky/indigo + dark-shade leftovers
set -e
ROOT="src/app/admin"

find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-orange-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-orange-100\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-orange-500\b/bg-portal-amber/g' \
  -e 's/\bbg-orange-600\b/bg-portal-amber/g' \
  -e 's/\btext-orange-500\b/text-portal-amber/g' \
  -e 's/\btext-orange-600\b/text-portal-amber/g' \
  -e 's/\btext-orange-700\b/text-portal-amber/g' \
  -e 's/\btext-orange-800\b/text-portal-amber/g' \
  -e 's/\btext-orange-900\b/text-portal-amber/g' \
  -e 's/\bborder-orange-100\b/border-portal-amber\/20/g' \
  -e 's/\bborder-orange-200\b/border-portal-amber\/30/g' \
  -e 's/\bring-orange-200\b/ring-portal-amber\/30/g' \
  -e 's/\bbg-pink-50\b/bg-portal-red-lt/g' \
  -e 's/\bbg-pink-50\/40\b/bg-portal-red-lt/g' \
  -e 's/\bbg-pink-100\b/bg-portal-red-lt/g' \
  -e 's/\bbg-pink-500\b/bg-portal-red/g' \
  -e 's/\bbg-pink-600\b/bg-portal-red/g' \
  -e 's/\bbg-pink-700\b/bg-portal-red/g' \
  -e 's/\bhover:bg-pink-50\b/hover:bg-portal-red-lt/g' \
  -e 's/\bhover:bg-pink-700\b/hover:opacity-90/g' \
  -e 's/\btext-pink-500\b/text-portal-red/g' \
  -e 's/\btext-pink-600\b/text-portal-red/g' \
  -e 's/\btext-pink-700\b/text-portal-red/g' \
  -e 's/\btext-pink-800\b/text-portal-red/g' \
  -e 's/\bborder-pink-100\b/border-portal-red\/20/g' \
  -e 's/\bborder-pink-200\b/border-portal-red\/30/g' \
  -e 's/\bborder-pink-300\b/border-portal-red\/40/g' \
  -e 's/\bbg-sky-200\b/bg-portal-blue-lt/g' \
  -e 's/\btext-sky-700\b/text-portal-blue/g' \
  -e 's/\btext-sky-800\b/text-portal-blue/g' \
  -e 's/\bring-sky-200\b/ring-portal-blue\/30/g' \
  -e 's/\btext-indigo-700\b/text-portal-blue/g' \
  -e 's/\btext-indigo-800\b/text-portal-blue/g' \
  -e 's/\bhover:bg-indigo-700\b/hover:bg-portal-navy/g' \
  -e 's/\bring-indigo-200\b/ring-portal-blue\/30/g' \
  -e 's/\bbg-teal-200\b/bg-portal-green-lt/g' \
  -e 's/\btext-teal-700\b/text-portal-green/g' \
  -e 's/\btext-teal-800\b/text-portal-green/g' \
  -e 's/\bring-teal-200\b/ring-portal-green\/30/g' \
  -e 's/\btext-purple-300\b/text-portal-blue/g' \
  -e 's/\btext-purple-800\b/text-portal-blue/g' \
  -e 's/\btext-purple-900\b/text-portal-navy/g' \
  -e 's/\bring-purple-200\b/ring-portal-blue\/30/g' \
  -e 's/\bborder-purple-100\b/border-portal-blue\/20/g' \
  -e 's/\btext-blue-300\b/text-portal-blue/g' \
  -e 's/\btext-blue-950\b/text-portal-navy/g' \
  -e 's/\btext-green-400\b/text-portal-green/g' \
  -e 's/\bbg-green-400\b/bg-portal-green/g' \
  -e 's/\btext-emerald-900\b/text-portal-green/g' \
  -e 's/\btext-red-300\b/text-portal-red/g' \
  -e 's/\btext-red-900\b/text-portal-red/g' \
  -e 's/\bbg-red-300\b/bg-portal-red/g' \
  -e 's/\btext-amber-900\b/text-portal-amber/g' \
  -e 's/\bfill-amber-400\b/fill-portal-amber/g' \
  -e 's/\btext-amber-400\b/text-portal-amber/g' \
  -e 's/\bbg-amber-400\b/bg-portal-amber/g' \
  -e 's/\btext-gray-200\b/text-portal-border-2/g' \
  -e 's/\bbg-slate-600\b/bg-portal-navy/g' \
  -e 's/\btext-green-900\b/text-portal-green/g'

echo "Pass 2 complete."
