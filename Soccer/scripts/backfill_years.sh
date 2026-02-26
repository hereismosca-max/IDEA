#!/usr/bin/env zsh
set -euo pipefail

START_YEAR=${1:-2011}
END_YEAR=${2:-2026}

cd /Users/ziyuhuang/Desktop/IDEA/Soccer

echo "[$(date '+%Y-%m-%d %H:%M:%S')] backfill start: ${START_YEAR}-${END_YEAR}"
for y in $(seq ${START_YEAR} ${END_YEAR}); do
  s="${y}-01-01"
  e="${y}-12-31"
  if [ "${y}" -eq 2026 ]; then
    e="2026-02-14"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SYNC ${s} ${e}"
  .venv/bin/python -m soccer_predictor.cli sync-range --start "${s}" --end "${e}"
done
echo "[$(date '+%Y-%m-%d %H:%M:%S')] backfill done"
