#!/usr/bin/env bash
# check-spec.sh — coherence checks for a hedera-harness recipe (schemaVersion 3).
#
# Two layers:
#   1. `hedera-harness doctor --recipe-only` owns schema, defaults, baseline,
#      and network validity. It is authoritative; this script does not
#      re-implement it.
#   2. Local checks for cross-file coherence doctor does not perform — most
#      importantly the EVALUATE eval/validator pairing, which doctor passes.
#
# Line-oriented only (grep/awk). No YAML/JSON parser. Treat findings as leads.
#
# Usage: bash check-spec.sh <project-root>
#   <project-root> is the directory containing .harness/
# Exit 0 = clean. Exit 1 = findings. Exit 2 = usage error.

set -uo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: check-spec.sh <project-root>" >&2
  exit 2
fi

ROOT="${1%/}"
FINDINGS=0
DEGRADED=0

fail() {
  echo "FAIL: $*"
  FINDINGS=$((FINDINGS + 1))
}

note() { echo "NOTE: $*"; }

SPEC_FILE="$ROOT/.harness/spec.yaml"
if [[ ! -f "$SPEC_FILE" ]]; then
  fail "recipe file missing: $SPEC_FILE"
  echo "check-spec: 1 finding(s)"
  exit 1
fi

# --- helpers -----------------------------------------------------------------

yaml_scalar() {
  local file="$1" key="$2"
  grep -E "^[[:space:]]*${key}:[[:space:]]*[^[:space:]]" "$file" 2>/dev/null \
    | grep -v '^[[:space:]]*#' \
    | head -1 \
    | sed -E "s/^[[:space:]]*${key}:[[:space:]]*//; s/[\"']//g; s/[[:space:]]+#.*//; s/[[:space:]]*$//"
}

has_active() {
  grep -E "$2" "$1" 2>/dev/null | grep -v '^[[:space:]]*#' | grep -q .
}

block_enabled() {
  awk -v key="$2" '
    /^[[:space:]]*#/ { next }
    $0 ~ "^[[:space:]]*" key ":[[:space:]]*$" { in_b=1; next }
    in_b && /^[^[:space:]#]/ { exit }
    in_b && /^[[:space:]]*enabled:[[:space:]]*true/ { found=1; exit }
    END { exit found ? 0 : 1 }
  ' "$1"
}

resolve_path() {
  local key="$1" default="$2" value
  value="$(yaml_scalar "$SPEC_FILE" "$key")"
  [[ -z "$value" ]] && value="$default"
  echo "$ROOT/$value"
}

# Collect YAML list items under a top-level key, or a scalar if present.
# Prints paths relative to the project (not rooted).
collect_paths() {
  local key="$1" default="$2"
  local scalar
  scalar="$(yaml_scalar "$SPEC_FILE" "$key")"
  if [[ -n "$scalar" ]]; then
    echo "$scalar"
    return
  fi
  awk -v k="$key" '
    /^[[:space:]]*#/ { next }
    $0 ~ "^[[:space:]]*" k ":[[:space:]]*$" { in_p=1; next }
    in_p && /^[[:space:]]*-[[:space:]]*/ {
      sub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/["'\'']/, ""); print; next
    }
    in_p { exit }
  ' "$SPEC_FILE"
}

# --- layer 1: delegate schema validity to the harness -------------------------

echo "== recipe (hedera-harness doctor --recipe-only) =="

DOCTOR_OUT=""
DOCTOR_RC=0
if command -v hedera-harness >/dev/null 2>&1; then
  DOCTOR_OUT="$(hedera-harness doctor "$SPEC_FILE" --recipe-only 2>&1)"; DOCTOR_RC=$?
elif [[ -x "$ROOT/node_modules/.bin/hedera-harness" ]]; then
  DOCTOR_OUT="$("$ROOT/node_modules/.bin/hedera-harness" doctor "$SPEC_FILE" --recipe-only 2>&1)"; DOCTOR_RC=$?
else
  DOCTOR_RC=127
fi

if [[ "$DOCTOR_RC" -eq 127 ]]; then
  DEGRADED=1
  note "hedera-harness not on PATH and not installed in $ROOT — schema not validated."
  note "Install it, or run: npx hedera-harness@latest doctor .harness/spec.yaml --recipe-only"
elif grep -q 'Expected command' <<<"$DOCTOR_OUT"; then
  DEGRADED=1
  note "the installed hedera-harness is older than 1.2.0 (no 'doctor' command) — schema not validated."
  note "Upgrade it, or run: npx hedera-harness@latest doctor .harness/spec.yaml --recipe-only"
else
  echo "$DOCTOR_OUT"
  [[ "$DOCTOR_RC" -ne 0 ]] && FINDINGS=$((FINDINGS + 1))
fi

if [[ "$DEGRADED" -eq 1 ]]; then
  SCHEMA="$(yaml_scalar "$SPEC_FILE" "schemaVersion")"
  if [[ "$SCHEMA" != "3" ]]; then
    fail "schemaVersion is '${SCHEMA:-absent}', expected 3 — rewrite the recipe (hedera-harness migrate is gone)"
  fi
  if ! has_active "$SPEC_FILE" '^[[:space:]]*baseline:'; then
    fail "recipe requires a baseline: block"
  elif ! awk '
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*baseline:/ { in_b=1; next }
    in_b && /^[^[:space:]#]/ { exit }
    in_b && /name:[[:space:]]*install[[:space:]]*$/ { found=1; exit }
    END { exit found ? 0 : 1 }
  ' "$SPEC_FILE"; then
    fail "baseline must include a command literally named \"install\""
  fi
fi

echo
echo "== coherence =="

# --- removed keys -------------------------------------------------------------

for dead in seed generator logging extend contract skills; do
  if has_active "$SPEC_FILE" "^[[:space:]]*${dead}:"; then
    case "$dead" in
      contract) fail "'contract:' was renamed — use eval: (schema v3)" ;;
      skills) fail "'skills:' was removed — product skills from hedera-skills are loaded automatically" ;;
      *) fail "'${dead}:' was removed — rewrite to schemaVersion 3 (hedera-harness migrate is gone)" ;;
    esac
  fi
done

# --- resolve files ------------------------------------------------------------

STATIC="$(resolve_path static .harness/validators/static.json)"
COMMANDS="$(resolve_path commands .harness/validators/yarn.json)"
PLAY_REL="$(yaml_scalar "$SPEC_FILE" "playwright")"

PRDS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && PRDS+=("$ROOT/$line")
done < <(collect_paths prd .harness/prd.md)
[[ ${#PRDS[@]} -eq 0 ]] && PRDS+=("$ROOT/.harness/prd.md")

EVALS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && EVALS+=("$ROOT/$line")
done < <(collect_paths eval "")

for prd in "${PRDS[@]}"; do
  [[ -f "$prd" ]] || fail "prd missing on disk: $prd"
done
[[ -f "$STATIC" ]]   || fail "static validator missing: $STATIC"
[[ -f "$COMMANDS" ]] || fail "command validator missing: $COMMANDS"

# --- post-feature command validator needs an install --------------------------

if [[ -f "$COMMANDS" ]]; then
  grep -E '"name"[[:space:]]*:[[:space:]]*"install"' "$COMMANDS" >/dev/null \
    || fail "command validator missing a command literally named \"install\""
fi

# --- REPLACE_ME ---------------------------------------------------------------

SCAN=("$SPEC_FILE")
for f in "${PRDS[@]}" "$STATIC" "$COMMANDS"; do
  [[ -f "$f" ]] && SCAN+=("$f")
done
while IFS= read -r line; do
  [[ -n "$line" ]] && fail "REPLACE_ME leftover: $line"
done < <(grep -Rn "REPLACE_ME" "${SCAN[@]}" 2>/dev/null || true)

# --- EVALUATE pairing (doctor does NOT catch this) ----------------------------

HAS_EVAL=false
[[ ${#EVALS[@]} -gt 0 ]] && HAS_EVAL=true

HAS_VALIDATOR=false
block_enabled "$SPEC_FILE" "validator" && HAS_VALIDATOR=true

if $HAS_EVAL && ! $HAS_VALIDATOR; then
  fail "EVALUATE incomplete: eval present but validator.enabled is not true"
fi
if $HAS_VALIDATOR && ! $HAS_EVAL; then
  fail "EVALUATE incomplete: validator.enabled true but eval missing"
fi

if $HAS_EVAL && [[ ${#EVALS[@]} -gt 1 ]] && [[ ${#PRDS[@]} -gt 1 ]] && [[ ${#EVALS[@]} -ne ${#PRDS[@]} ]]; then
  fail "eval: list must be 1:1 with prd: (${#EVALS[@]} evals, ${#PRDS[@]} prds)"
fi

for eval_file in "${EVALS[@]}"; do
  [[ -f "$eval_file" ]] || fail "evaluate checklist missing: $eval_file"
done

if [[ -n "$PLAY_REL" ]] && [[ ! -f "$ROOT/$PLAY_REL" ]]; then
  fail "playwright smoke missing: $ROOT/$PLAY_REL"
fi

# --- leftover validator agent block -------------------------------------------

if awk '
  /^[[:space:]]*#/ { next }
  /^[[:space:]]*validator:[[:space:]]*$/ { in_v=1; next }
  in_v && /^[^[:space:]#]/ { exit }
  in_v && /^[[:space:]]*(provider|command|args|model):/ { found=1; exit }
  END { exit found ? 0 : 1 }
' "$SPEC_FILE"; then
  fail "validator carries leftover agent flags — use the 'agent:' preset instead"
fi

# --- executableWithTestSigner requires chainValidation ------------------------

for eval_file in "${EVALS[@]}"; do
  [[ -f "$eval_file" ]] || continue
  if grep -E '"executableWithTestSigner"[[:space:]]*:[[:space:]]*true' "$eval_file" >/dev/null; then
    block_enabled "$SPEC_FILE" "chainValidation" \
      || fail "executableWithTestSigner=true in $eval_file but chainValidation.enabled is not true"
  fi
done

# --- checklist ↔ PRD traceability ---------------------------------------------

grade_one() {
  local eval_file="$1"
  shift
  local prd_files=("$@")

  local ASSERTIONS CRITICAL JOURNEYS n prd
  ASSERTIONS=$(grep -oE '"id"[[:space:]]*:[[:space:]]*"E[0-9]+"' "$eval_file" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${ASSERTIONS:-0}" -eq 0 ]]; then
    fail "evaluate checklist has no numbered assertions (E1, E2, …): $eval_file"
    return
  fi

  CRITICAL=$(grep -oE '"severity"[[:space:]]*:[[:space:]]*"critical"' "$eval_file" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${CRITICAL:-0}" -gt 2 ]]; then
    fail "$eval_file has ${CRITICAL} critical assertions (prefer <= 2; the run will rarely pass)"
  fi

  grep -E '"failOnUncertainty"' "$eval_file" >/dev/null \
    || fail "$eval_file missing evaluationRules.failOnUncertainty (fail-closed posture)"

  JOURNEYS=0
  for prd in "${prd_files[@]}"; do
    [[ -f "$prd" ]] || continue
    n=$(awk '/^##[[:space:]]*Journeys/ { in_j=1; next }
             in_j && /^##/ { exit }
             in_j && /^[[:space:]]*[0-9]+\./ { c++ }
             END { print c+0 }' "$prd")
    JOURNEYS=$((JOURNEYS + n))
  done
  if [[ "$JOURNEYS" -gt 0 ]] && [[ "${ASSERTIONS:-0}" -lt "$JOURNEYS" ]]; then
    fail "$eval_file has ${ASSERTIONS} assertion(s) for ${JOURNEYS} PRD journey(s) — some journey is ungraded"
  fi
}

if $HAS_EVAL && [[ ${#EVALS[@]} -eq ${#PRDS[@]} ]] && [[ ${#EVALS[@]} -gt 0 ]]; then
  i=0
  while [[ "$i" -lt ${#EVALS[@]} ]]; do
    [[ -f "${EVALS[$i]}" ]] && grade_one "${EVALS[$i]}" "${PRDS[$i]}"
    i=$((i + 1))
  done
elif $HAS_EVAL && [[ ${#EVALS[@]} -eq 1 ]] && [[ -f "${EVALS[0]}" ]]; then
  grade_one "${EVALS[0]}" "${PRDS[@]}"
fi

# --- blind check on every PRD -------------------------------------------------

for prd in "${PRDS[@]}"; do
  [[ -f "$prd" ]] || continue
  label="$(basename "$prd")"
  grep -E '\b[CE][0-9]+\b' "$prd" >/dev/null \
    && fail "blind: $label contains an assertion id (E1 / leftover C1, …)"
  grep -E 'howToVerify' "$prd" >/dev/null \
    && fail "blind: $label contains howToVerify"
  grep -Ei 'severity[[:space:]]*:[[:space:]]*(critical|major|minor)' "$prd" >/dev/null \
    && fail "blind: $label contains a severity label"
done

# --- summary ------------------------------------------------------------------

echo
if [[ "$FINDINGS" -gt 0 ]]; then
  echo "check-spec: $FINDINGS finding(s)"
  [[ "$DEGRADED" -eq 1 ]] && echo "check-spec: schema NOT validated (see NOTE above)"
  exit 1
fi

if [[ "$DEGRADED" -eq 1 ]]; then
  echo "check-spec: coherence OK, but schema NOT validated (see NOTE above)"
  exit 1
fi

echo "check-spec: OK"
exit 0
