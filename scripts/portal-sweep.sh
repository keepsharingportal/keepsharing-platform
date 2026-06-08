#!/usr/bin/env bash
# Bulk swap stray Tailwind palette tokens to Portal tokens across admin tree.
set -e
ROOT="src/app/admin"

# blue → portal-blue / portal-navy
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-blue-50\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-blue-100\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-blue-500\b/bg-portal-blue/g' \
  -e 's/\bbg-blue-600\b/bg-portal-blue/g' \
  -e 's/\bbg-blue-700\b/bg-portal-navy/g' \
  -e 's/\bbg-blue-800\b/bg-portal-navy/g' \
  -e 's/\bbg-blue-900\b/bg-portal-navy/g' \
  -e 's/\bhover:bg-blue-50\b/hover:bg-portal-blue-lt/g' \
  -e 's/\bhover:bg-blue-100\b/hover:bg-portal-blue-lt/g' \
  -e 's/\bhover:bg-blue-500\b/hover:bg-portal-blue/g' \
  -e 's/\bhover:bg-blue-600\b/hover:bg-portal-blue/g' \
  -e 's/\bhover:bg-blue-700\b/hover:bg-portal-navy/g' \
  -e 's/\btext-blue-400\b/text-portal-blue/g' \
  -e 's/\btext-blue-500\b/text-portal-blue/g' \
  -e 's/\btext-blue-600\b/text-portal-blue/g' \
  -e 's/\btext-blue-700\b/text-portal-blue/g' \
  -e 's/\btext-blue-800\b/text-portal-navy/g' \
  -e 's/\btext-blue-900\b/text-portal-navy/g' \
  -e 's/\bhover:text-blue-500\b/hover:text-portal-blue/g' \
  -e 's/\bhover:text-blue-600\b/hover:text-portal-blue/g' \
  -e 's/\bhover:text-blue-700\b/hover:text-portal-navy/g' \
  -e 's/\bborder-blue-100\b/border-portal-blue\/20/g' \
  -e 's/\bborder-blue-200\b/border-portal-blue\/30/g' \
  -e 's/\bborder-blue-300\b/border-portal-blue\/40/g' \
  -e 's/\bborder-blue-400\b/border-portal-blue\/50/g' \
  -e 's/\bborder-blue-500\b/border-portal-blue/g' \
  -e 's/\bborder-blue-600\b/border-portal-blue/g' \
  -e 's/\bring-blue-200\b/ring-portal-blue\/30/g' \
  -e 's/\bring-blue-300\b/ring-portal-blue\/40/g' \
  -e 's/\bring-blue-500\b/ring-portal-blue/g'

# emerald → portal-green
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-emerald-50\b/bg-portal-green-lt/g' \
  -e 's/\bbg-emerald-100\b/bg-portal-green-lt/g' \
  -e 's/\bbg-emerald-500\b/bg-portal-green/g' \
  -e 's/\bbg-emerald-600\b/bg-portal-green/g' \
  -e 's/\bbg-emerald-700\b/bg-portal-green/g' \
  -e 's/\bhover:bg-emerald-50\b/hover:bg-portal-green-lt/g' \
  -e 's/\bhover:bg-emerald-100\b/hover:bg-portal-green-lt/g' \
  -e 's/\bhover:bg-emerald-600\b/hover:bg-portal-green/g' \
  -e 's/\bhover:bg-emerald-700\b/hover:bg-portal-green/g' \
  -e 's/\btext-emerald-500\b/text-portal-green/g' \
  -e 's/\btext-emerald-600\b/text-portal-green/g' \
  -e 's/\btext-emerald-700\b/text-portal-green/g' \
  -e 's/\btext-emerald-800\b/text-portal-green/g' \
  -e 's/\bhover:text-emerald-600\b/hover:text-portal-green/g' \
  -e 's/\bborder-emerald-100\b/border-portal-green\/20/g' \
  -e 's/\bborder-emerald-200\b/border-portal-green\/30/g' \
  -e 's/\bborder-emerald-300\b/border-portal-green\/40/g' \
  -e 's/\bborder-emerald-500\b/border-portal-green/g' \
  -e 's/\bring-emerald-200\b/ring-portal-green\/30/g'

# green → portal-green
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-green-50\b/bg-portal-green-lt/g' \
  -e 's/\bbg-green-100\b/bg-portal-green-lt/g' \
  -e 's/\bbg-green-500\b/bg-portal-green/g' \
  -e 's/\bbg-green-600\b/bg-portal-green/g' \
  -e 's/\bbg-green-700\b/bg-portal-green/g' \
  -e 's/\bhover:bg-green-50\b/hover:bg-portal-green-lt/g' \
  -e 's/\bhover:bg-green-100\b/hover:bg-portal-green-lt/g' \
  -e 's/\bhover:bg-green-600\b/hover:bg-portal-green/g' \
  -e 's/\btext-green-500\b/text-portal-green/g' \
  -e 's/\btext-green-600\b/text-portal-green/g' \
  -e 's/\btext-green-700\b/text-portal-green/g' \
  -e 's/\btext-green-800\b/text-portal-green/g' \
  -e 's/\bborder-green-100\b/border-portal-green\/20/g' \
  -e 's/\bborder-green-200\b/border-portal-green\/30/g' \
  -e 's/\bborder-green-300\b/border-portal-green\/40/g' \
  -e 's/\bring-green-200\b/ring-portal-green\/30/g'

# red & rose → portal-red
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-red-50\b/bg-portal-red-lt/g' \
  -e 's/\bbg-red-100\b/bg-portal-red-lt/g' \
  -e 's/\bbg-red-500\b/bg-portal-red/g' \
  -e 's/\bbg-red-600\b/bg-portal-red/g' \
  -e 's/\bbg-red-700\b/bg-portal-red/g' \
  -e 's/\bhover:bg-red-50\b/hover:bg-portal-red-lt/g' \
  -e 's/\bhover:bg-red-100\b/hover:bg-portal-red-lt/g' \
  -e 's/\bhover:bg-red-600\b/hover:bg-portal-red/g' \
  -e 's/\bhover:bg-red-700\b/hover:bg-portal-red/g' \
  -e 's/\btext-red-500\b/text-portal-red/g' \
  -e 's/\btext-red-600\b/text-portal-red/g' \
  -e 's/\btext-red-700\b/text-portal-red/g' \
  -e 's/\btext-red-800\b/text-portal-red/g' \
  -e 's/\bhover:text-red-700\b/hover:opacity-80/g' \
  -e 's/\bborder-red-100\b/border-portal-red\/20/g' \
  -e 's/\bborder-red-200\b/border-portal-red\/30/g' \
  -e 's/\bborder-red-300\b/border-portal-red\/40/g' \
  -e 's/\bborder-red-500\b/border-portal-red/g' \
  -e 's/\bring-red-200\b/ring-portal-red\/30/g' \
  -e 's/\bbg-rose-50\b/bg-portal-red-lt/g' \
  -e 's/\bbg-rose-100\b/bg-portal-red-lt/g' \
  -e 's/\bbg-rose-500\b/bg-portal-red/g' \
  -e 's/\bbg-rose-600\b/bg-portal-red/g' \
  -e 's/\bbg-rose-700\b/bg-portal-red/g' \
  -e 's/\btext-rose-500\b/text-portal-red/g' \
  -e 's/\btext-rose-600\b/text-portal-red/g' \
  -e 's/\btext-rose-700\b/text-portal-red/g' \
  -e 's/\bborder-rose-200\b/border-portal-red\/30/g'

# amber & yellow → portal-amber
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-amber-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-amber-100\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-amber-500\b/bg-portal-amber/g' \
  -e 's/\bbg-amber-600\b/bg-portal-amber/g' \
  -e 's/\bbg-amber-700\b/bg-portal-amber/g' \
  -e 's/\bhover:bg-amber-50\b/hover:bg-portal-amber-lt/g' \
  -e 's/\bhover:bg-amber-100\b/hover:bg-portal-amber-lt/g' \
  -e 's/\btext-amber-500\b/text-portal-amber/g' \
  -e 's/\btext-amber-600\b/text-portal-amber/g' \
  -e 's/\btext-amber-700\b/text-portal-amber/g' \
  -e 's/\btext-amber-800\b/text-portal-amber/g' \
  -e 's/\bborder-amber-100\b/border-portal-amber\/20/g' \
  -e 's/\bborder-amber-200\b/border-portal-amber\/30/g' \
  -e 's/\bborder-amber-300\b/border-portal-amber\/40/g' \
  -e 's/\bring-amber-200\b/ring-portal-amber\/30/g' \
  -e 's/\bbg-yellow-50\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-yellow-100\b/bg-portal-amber-lt/g' \
  -e 's/\bbg-yellow-500\b/bg-portal-amber/g' \
  -e 's/\bbg-yellow-600\b/bg-portal-amber/g' \
  -e 's/\btext-yellow-500\b/text-portal-amber/g' \
  -e 's/\btext-yellow-600\b/text-portal-amber/g' \
  -e 's/\btext-yellow-700\b/text-portal-amber/g' \
  -e 's/\btext-yellow-800\b/text-portal-amber/g' \
  -e 's/\bborder-yellow-200\b/border-portal-amber\/30/g'

# gray / slate / zinc → portal-bg / portal-border / portal-text / portal-sub / portal-muted / portal-navy
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-gray-50\b/bg-portal-bg/g' \
  -e 's/\bbg-gray-100\b/bg-portal-row-hover/g' \
  -e 's/\bbg-gray-200\b/bg-portal-border-2/g' \
  -e 's/\bbg-gray-300\b/bg-portal-border-2/g' \
  -e 's/\bbg-gray-700\b/bg-portal-navy/g' \
  -e 's/\bbg-gray-800\b/bg-portal-navy/g' \
  -e 's/\bbg-gray-900\b/bg-portal-navy/g' \
  -e 's/\bhover:bg-gray-50\b/hover:bg-portal-row-hover/g' \
  -e 's/\bhover:bg-gray-100\b/hover:bg-portal-row-hover/g' \
  -e 's/\bhover:bg-gray-200\b/hover:bg-portal-border-2/g' \
  -e 's/\bhover:bg-gray-700\b/hover:opacity-90/g' \
  -e 's/\bhover:bg-gray-800\b/hover:opacity-90/g' \
  -e 's/\btext-gray-300\b/text-portal-border-2/g' \
  -e 's/\btext-gray-400\b/text-portal-muted/g' \
  -e 's/\btext-gray-500\b/text-portal-sub/g' \
  -e 's/\btext-gray-600\b/text-portal-sub/g' \
  -e 's/\btext-gray-700\b/text-portal-text/g' \
  -e 's/\btext-gray-800\b/text-portal-text/g' \
  -e 's/\btext-gray-900\b/text-portal-text/g' \
  -e 's/\bhover:text-gray-700\b/hover:text-portal-text/g' \
  -e 's/\bhover:text-gray-800\b/hover:text-portal-text/g' \
  -e 's/\bhover:text-gray-900\b/hover:text-portal-text/g' \
  -e 's/\bborder-gray-100\b/border-portal-border/g' \
  -e 's/\bborder-gray-200\b/border-portal-border/g' \
  -e 's/\bborder-gray-300\b/border-portal-border-2/g' \
  -e 's/\bborder-gray-400\b/border-portal-border-2/g' \
  -e 's/\bbg-slate-50\b/bg-portal-bg/g' \
  -e 's/\bbg-slate-100\b/bg-portal-row-hover/g' \
  -e 's/\bbg-slate-200\b/bg-portal-border-2/g' \
  -e 's/\bbg-slate-700\b/bg-portal-navy/g' \
  -e 's/\bbg-slate-800\b/bg-portal-navy/g' \
  -e 's/\bbg-slate-900\b/bg-portal-navy/g' \
  -e 's/\btext-slate-400\b/text-portal-muted/g' \
  -e 's/\btext-slate-500\b/text-portal-sub/g' \
  -e 's/\btext-slate-600\b/text-portal-sub/g' \
  -e 's/\btext-slate-700\b/text-portal-text/g' \
  -e 's/\btext-slate-800\b/text-portal-text/g' \
  -e 's/\btext-slate-900\b/text-portal-text/g' \
  -e 's/\bborder-slate-200\b/border-portal-border/g' \
  -e 's/\bborder-slate-300\b/border-portal-border-2/g' \
  -e 's/\bbg-zinc-50\b/bg-portal-bg/g' \
  -e 's/\bbg-zinc-100\b/bg-portal-row-hover/g' \
  -e 's/\btext-zinc-500\b/text-portal-sub/g' \
  -e 's/\btext-zinc-600\b/text-portal-sub/g' \
  -e 's/\btext-zinc-700\b/text-portal-text/g' \
  -e 's/\bborder-zinc-200\b/border-portal-border/g'

# purple / pink / indigo / sky / teal → portal-blue accent
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\bbg-purple-50\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-purple-100\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-purple-500\b/bg-portal-blue/g' \
  -e 's/\bbg-purple-600\b/bg-portal-blue/g' \
  -e 's/\btext-purple-500\b/text-portal-blue/g' \
  -e 's/\btext-purple-600\b/text-portal-blue/g' \
  -e 's/\btext-purple-700\b/text-portal-blue/g' \
  -e 's/\bborder-purple-200\b/border-portal-blue\/30/g' \
  -e 's/\bbg-indigo-50\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-indigo-100\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-indigo-500\b/bg-portal-blue/g' \
  -e 's/\bbg-indigo-600\b/bg-portal-blue/g' \
  -e 's/\btext-indigo-500\b/text-portal-blue/g' \
  -e 's/\btext-indigo-600\b/text-portal-blue/g' \
  -e 's/\btext-indigo-700\b/text-portal-blue/g' \
  -e 's/\bbg-sky-50\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-sky-100\b/bg-portal-blue-lt/g' \
  -e 's/\bbg-sky-500\b/bg-portal-blue/g' \
  -e 's/\bbg-sky-600\b/bg-portal-blue/g' \
  -e 's/\btext-sky-500\b/text-portal-blue/g' \
  -e 's/\btext-sky-600\b/text-portal-blue/g' \
  -e 's/\btext-sky-700\b/text-portal-blue/g' \
  -e 's/\bbg-teal-50\b/bg-portal-green-lt/g' \
  -e 's/\bbg-teal-100\b/bg-portal-green-lt/g' \
  -e 's/\bbg-teal-500\b/bg-portal-green/g' \
  -e 's/\bbg-teal-600\b/bg-portal-green/g' \
  -e 's/\btext-teal-500\b/text-portal-green/g' \
  -e 's/\btext-teal-600\b/text-portal-green/g'

# fix any earlier sed-leftover artifacts
find "$ROOT" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/bg-portal-amber-lt0/bg-portal-amber-lt/g' \
  -e 's/bg-portal-blue-lt0/bg-portal-blue-lt/g' \
  -e 's/bg-portal-green-lt0/bg-portal-green-lt/g' \
  -e 's/bg-portal-red-lt0/bg-portal-red-lt/g'

echo "Portal sweep complete."
