# Workers

## DWSIM Worker Runtime

The DWSIM integration now uses one worker path:

- `workers/DWSIMWorkerMono/`: a Mono-compatible worker for the official DWSIM runtime.

The working local path is the Mono worker:

```text
Go thermo API
  -> workers/DWSIMWorkerMono/DWSIMWorkerMono
    -> mono DWSIMWorkerMono.exe
      -> DWSIM.Thermodynamics.dll
        -> DWSIM Calculator.Initialize()
          -> AvailableCompounds
```

## Latest Changes

- Added `workers/DWSIMWorkerMono/Program.cs`.
- Added `workers/DWSIMWorkerMono/DwsimRuntime.cs`.
- Added `workers/DWSIMWorkerMono/DWSIMWorkerMono`, a shell wrapper that compiles the Mono worker with `mcs` when needed and runs it with `mono`.
- Copied the official DWSIM macOS `Contents/MonoBundle` runtime into local `dwsim-runtime/` for development.
- Added `.gitignore` entries for `dwsim-runtime/` and generated `DWSIMWorkerMono.exe`.
- Updated `src/main.ts` so Electron dev automatically uses `workers/DWSIMWorkerMono/DWSIMWorkerMono` if `FUGACITY_DWSIM_WORKER` is not explicitly configured.
- Updated `thermo/dwsim/client.go` to increase the scanner buffer, because `ListCompounds` returns a large one-line JSON response.

## Why Mono Worker Exists

The official DWSIM macOS release contains:

```text
DWSIM.app/Contents/MonoBundle/DWSIM.Thermodynamics.dll
```

That assembly is a Mono/.NET Framework assembly. The Mono worker solves this by loading the same DWSIM DLL under Mono, which is the runtime it was built for.

## What Works

The full Go-to-DWSIM path was verified with:

```bash
FUGACITY_DWSIM_WORKER="/Users/chikanma/Documents/process_simulator/zoo/workers/DWSIMWorkerMono/DWSIMWorkerMono" \
  go run ./thermo/cmd/thermo-api ListPropertyPackages
```

It returns real DWSIM property packages including:

```text
Peng-Robinson (PR)
Soave-Redlich-Kwong (SRK)
NRTL
UNIFAC
Raoult's Law
```

PT flash was verified with:

```bash
printf '{"propertyPackageId":"Peng-Robinson (PR)","compoundIds":["Methane","Ethane"],"moleFractions":[0.5,0.5],"temperatureK":250,"pressurePa":101325}' | \
  FUGACITY_DWSIM_WORKER="/Users/chikanma/Documents/process_simulator/zoo/workers/DWSIMWorkerMono/DWSIMWorkerMono" \
  go run ./thermo/cmd/thermo-api CalculatePTFlash
```

This returned a real DWSIM flash result with vapor and liquid phase data.

## Runtime Discovery

The Mono worker finds DWSIM at:

- `FUGACITY_APP_ROOT/dwsim-runtime/DWSIM.Thermodynamics.dll`

In local development, `zoo/dwsim-runtime/` is enough when running from the repo root.

## Production Note

For production, do not rely on a mounted DMG. Package a DWSIM runtime folder next to the app or server deployment:

```text
dwsim-runtime/
  DWSIM.Thermodynamics.dll
  DWSIM.Interfaces.dll
  DWSIM.SharedClasses.dll
  DWSIM.GlobalSettings.dll
  other DWSIM DLLs and native dependencies
```

Because DWSIM is GPL, bundling this runtime has licensing implications. Treat the packaged DWSIM runtime intentionally and include the correct licenses/source obligations.

See `load worker.md` for the longer step-by-step explanation of what was tried and why this path works.
