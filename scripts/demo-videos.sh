#!/usr/bin/env bash
# Record the README demo videos against a LOCAL production build and convert them
# to docs/demo/<name>.mp4 (H.264) and docs/demo/<name>.gif (README preview).
#   pnpm demo                 # all clips
#   pnpm demo -g supplier     # one clip (extra args go to Playwright)
# Needs ffmpeg on PATH or FFMPEG=/path/to/ffmpeg. Never targets production.
set -euo pipefail
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"
unset PLAYWRIGHT_BASE_URL
if [ "${SKIP_RECORD:-}" != "1" ]; then
  rm -rf e2e/.demo-results
  pnpm exec playwright test -c playwright.demo.config.ts "$@"
fi
mkdir -p docs/demo
for v in e2e/.demo-results/*/video.webm; do
  [ -f "$v" ] || continue
  name=$(basename "$(dirname "$v")" | sed -E 's/^[a-z]+-//; s/-chromium$//' | grep -oE '[0-9]-[a-z-]+' | head -1)
  [ -n "$name" ] || name=$(basename "$(dirname "$v")")
  "$FFMPEG" -loglevel error -y -i "$v" -vf "fps=24,scale=1280:-2" -c:v libx264 -preset slow -crf 30 \
    -pix_fmt yuv420p -movflags +faststart -an "docs/demo/$name.mp4"
  "$FFMPEG" -loglevel error -y -i "$v" -vf "fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    "docs/demo/$name.gif"
  echo "docs/demo/$name.mp4 $(du -h "docs/demo/$name.mp4" | cut -f1) · docs/demo/$name.gif $(du -h "docs/demo/$name.gif" | cut -f1)"
done
