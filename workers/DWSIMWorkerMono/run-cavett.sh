#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
RUNTIME="${DWSIM_AUTOMATION_RUNTIME:-$DIR/cavett-runtime}"
DEFAULT_FLOWSHEET="$RUNTIME/samples/Cavett's Problem.dwxmz"
FLOWSHEET="${1:-$DEFAULT_FLOWSHEET}"

for dependency in DWSIM.Automation.dll DWSIM.FlowsheetSolver.dll DWSIM.Interfaces.dll CapeOpen.dll; do
  if [[ ! -f "$RUNTIME/$dependency" ]]; then
    echo "Missing $RUNTIME/$dependency. Set DWSIM_AUTOMATION_RUNTIME to a full DWSIM 9 MonoBundle directory." >&2
    exit 1
  fi
done

mcs -r:"$RUNTIME/DWSIM.Automation.dll" \
  -r:"$RUNTIME/DWSIM.Interfaces.dll" \
  -r:"$RUNTIME/CapeOpen.dll" \
  -out:"$DIR/CavettExample.exe" "$DIR/CavettExample.cs"

export MONO_PATH="$RUNTIME${MONO_PATH:+:$MONO_PATH}"
exec mono "$DIR/CavettExample.exe" "$RUNTIME" "$FLOWSHEET"
