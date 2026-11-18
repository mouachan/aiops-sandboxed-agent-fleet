#!/usr/bin/env bash
# lab-bench.sh — run the Incident Lab on several attendees at the same time and report.
#
# Usage:
#   lab-bench.sh [users...] [--stagger SECONDS] [--keep]
#     users       attendees to drive (default: every attendee in .lab/attendees.csv)
#     --stagger   delay between attendees (default 0: all at once, the worst case)
#     --keep      keep the lab-bench namespace afterwards (debugging)
#
# Each attendee's own workshop API does the work, exactly like the Incident Lab page:
# deploy (if needed) → inject fault (payments scaled to 0) → investigate (the 5-agent fleet)
# → apply the fix (payments back to 1). The driver runs as a Job in a throwaway namespace
# (lab-bench) and reaches the workshops through their Routes with each attendee's access token.
# It changes the attendees' demo apps for a few minutes and leaves them healthy; it never
# touches their sandboxes. Run `scripts/lab.sh fleet` first if the fleet telemetry tokens
# (24 h) may have expired.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF="$HERE/$(basename "${BASH_SOURCE[0]}")"
case "${1:-}" in -h|--help|help) sed -n '2,/^set -euo/p' "$SELF" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;; esac

# shellcheck source=lib/common.sh
source "$HERE/lib/common.sh"
load_env
for c in oc jq; do require_cmd "$c"; done

NS="lab-bench"
CSV="$REPO_ROOT/.lab/attendees.csv"
IMAGE="registry.access.redhat.com/ubi9/nodejs-24-minimal:1-1794493509@sha256:ea0ea1db6a8cce73129156de5153bd34e2d176162e7511343b3136d6f7e2a318"
stagger=0; keep=false
users=()
while (($#)); do
  case "$1" in
    --stagger) stagger="$2"; shift 2 ;;
    --keep) keep=true; shift ;;
    *) users+=("$1"); shift ;;
  esac
done
[[ -s "$CSV" ]] || die "$CSV is missing — run: scripts/lab.sh urls --csv"
[[ "$stagger" =~ ^[0-9]+$ ]] || die "--stagger takes seconds"

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
# targets.tsv: user, workshop base URL, access token (from the attendee sheet)
awk -F, -v sel=" ${users[*]:-} " 'NR > 1 && (sel == "  " || index(sel, " " $1 " ")) {
  url = $2; tok = url; sub(/\?token=.*/, "", url); sub(/.*\?token=/, "", tok); print $1 "\t" url "\t" tok }' "$CSV" > "$work/targets.tsv"
n="$(wc -l < "$work/targets.tsv" | tr -d ' ')"
((n > 0)) || die "no attendee matched"
chmod 600 "$work/targets.tsv"

log "Incident Lab bench: ${n} attendee(s), stagger ${stagger}s (namespace ${NS})"
oc create namespace "$NS" --dry-run=client -o yaml | oc apply -f - >/dev/null
oc -n "$NS" create secret generic bench-targets --from-file=targets.tsv="$work/targets.tsv" --dry-run=client -o yaml | oc apply -f - >/dev/null
oc -n "$NS" create configmap bench-script --from-file=bench.mjs="$HERE/lib/lab-bench.mjs" --dry-run=client -o yaml | oc apply -f - >/dev/null
oc -n "$NS" delete job incident-bench --ignore-not-found >/dev/null
jq -n --arg image "$IMAGE" --arg stagger "$((stagger * 1000))" '{
  apiVersion: "batch/v1", kind: "Job", metadata: { name: "incident-bench" },
  spec: { backoffLimit: 0, activeDeadlineSeconds: 3600, template: { spec: {
    restartPolicy: "Never",
    securityContext: { runAsNonRoot: true, seccompProfile: { type: "RuntimeDefault" } },
    containers: [ {
      name: "bench", image: $image, command: ["node", "/app/bench.mjs"],
      env: [ { name: "TARGETS_FILE", value: "/bench/targets.tsv" }, { name: "STAGGER_MS", value: $stagger } ],
      securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } },
      resources: { requests: { cpu: "100m", memory: "256Mi" }, limits: { memory: "1Gi" } },
      volumeMounts: [ { name: "app", mountPath: "/app" }, { name: "targets", mountPath: "/bench", readOnly: true } ] } ],
    volumes: [ { name: "app", configMap: { name: "bench-script" } }, { name: "targets", secret: { secretName: "bench-targets" } } ] } } } }' \
  | oc -n "$NS" apply -f - >/dev/null

oc -n "$NS" wait --for=condition=Ready pod -l job-name=incident-bench --timeout=300s >/dev/null 2>&1 || true
start=$(date +%s)
oc -n "$NS" logs -f job/incident-bench 2>/dev/null | while IFS= read -r line; do
  case "$line" in
    RESULT\ *) jq -r --argjson t "$(( $(date +%s) - start ))" '"  \(if .ok then (if .correct then "✓" else "~" end) else "✗" end) \(.user)  investigate \(.times.investigate // "-")s  retries \(.retries // 0)  \(.error // (.answer[0:110]))"' <<<"${line#RESULT }" ;;
    SUMMARY\ *) echo "${line#SUMMARY }" | jq . ;;
    *) echo "$line" ;;
  esac
done

if [[ "$keep" != true ]]; then oc delete namespace "$NS" --wait=false >/dev/null; fi
log "Done (✓ right root cause, ~ completed with another diagnosis, ✗ failed)."
