#!/usr/bin/env bash
# FASC+ — compressão AVIF otimizada para web
# Uso:
#   ./scripts/encode-avif.sh input.jpg
#   ./scripts/encode-avif.sh input.jpg --preset feed --webp
#   ./scripts/encode-avif.sh ./pasta --batch --preset market --out ./dist
#
# Presets: avatar | feed | market | hero | max

set -euo pipefail

PRESET="feed"
BATCH=0
MAKE_WEBP=0
OUT_DIR=""
INPUT=""

usage() {
  cat <<'U'
FASC+ encode-avif
  ./scripts/encode-avif.sh <arquivo|pasta> [--preset feed] [--webp] [--batch] [--out dir]
  presets: avatar | feed | market | hero | max
U
  exit 1
}

preset_params() {
  case "$1" in
    avatar) Q=52; SPEED=4; MAX_W=512;  WEBP_Q=78 ;;
    feed)   Q=48; SPEED=5; MAX_W=1280; WEBP_Q=74 ;;
    market) Q=46; SPEED=5; MAX_W=960;  WEBP_Q=72 ;;
    hero)   Q=50; SPEED=4; MAX_W=1920; WEBP_Q=76 ;;
    max)    Q=38; SPEED=6; MAX_W=1280; WEBP_Q=68 ;;
    *) echo "preset inválido: $1" >&2; exit 1 ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --preset) PRESET="${2:-}"; shift 2 ;;
    --batch)  BATCH=1; shift ;;
    --webp)   MAKE_WEBP=1; shift ;;
    --out)    OUT_DIR="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) INPUT="$1"; shift ;;
  esac
done

[[ -z "${INPUT}" ]] && usage
preset_params "$PRESET"

encode_one() {
  local src="$1"
  local base dest dest_webp
  base="$(basename "$src")"
  base="${base%.*}"

  if [[ -n "$OUT_DIR" ]]; then
    mkdir -p "$OUT_DIR"
    dest="$OUT_DIR/${base}.avif"
    dest_webp="$OUT_DIR/${base}.webp"
  else
    dest="$(dirname "$src")/${base}.avif"
    dest_webp="$(dirname "$src")/${base}.webp"
  fi

  convert "$src" \
    -auto-orient \
    -strip \
    -resize "${MAX_W}x${MAX_W}>" \
    -colorspace sRGB \
    -quality "$Q" \
    -define "heic:speed=${SPEED}" \
    "$dest"

  local src_b avif_b ratio
  src_b=$(wc -c < "$src" | tr -d ' ')
  avif_b=$(wc -c < "$dest" | tr -d ' ')
  ratio=$(awk -v a="$avif_b" -v b="$src_b" 'BEGIN { if (b==0) print 0; else printf "%.0f", (1-a/b)*100 }')
  echo "AVIF  $dest  (${avif_b} bytes, -${ratio}%)  [preset=$PRESET q=$Q speed=$SPEED max=${MAX_W}px]"

  if [[ "$MAKE_WEBP" -eq 1 ]]; then
    convert "$src" \
      -auto-orient \
      -strip \
      -resize "${MAX_W}x${MAX_W}>" \
      -colorspace sRGB \
      -quality "$WEBP_Q" \
      "$dest_webp"
    local webp_b
    webp_b=$(wc -c < "$dest_webp" | tr -d ' ')
    echo "WebP  $dest_webp  (${webp_b} bytes)"
  fi
}

if [[ "$BATCH" -eq 1 ]]; then
  [[ -d "$INPUT" ]] || { echo "--batch exige diretório"; exit 1; }
  shopt -s nullglob nocaseglob
  for f in "$INPUT"/*.{jpg,jpeg,png,tif,tiff}; do
    [[ -f "$f" ]] || continue
    encode_one "$f"
  done
else
  [[ -f "$INPUT" ]] || { echo "arquivo não encontrado: $INPUT"; exit 1; }
  encode_one "$INPUT"
fi
