# DWSIM Worker Loading Notes

## What We Needed

The thermodynamics UI was calling `thermo.listCompounds`, but the worker returned:

```json
{
  "code": "dwsim_not_configured",
  "message": "DWSIM.Thermodynamics.dll was not found..."
}
```

That meant the Go thermo API and worker process were running, but the worker could not find a built DWSIM runtime assembly. The local `../dwsim` folder is source code only. DWSIM compound data cannot be loaded from source files alone by the worker; it needs DWSIM's compiled runtime DLLs.

## How DWSIM Loads Compounds

The important DWSIM class is:

```vb
DWSIM.Thermodynamics.CalculatorInterface.Calculator
```

DWSIM loads compounds by doing:

```vb
Dim dtlc As New DWSIM.Thermodynamics.CalculatorInterface.Calculator
dtlc.Initialize()
```

Inside `Initialize()`, DWSIM creates an internal dictionary:

```vb
_availablecomps As Dictionary(Of String, ConstantProperties)
```

Then DWSIM loads its compound databases with its own database classes:

- `Databases.ChemSep` loads embedded `chemsep1.xml` and `chemsep2.xml`.
- `Databases.DWSIM` loads embedded `dwsim.xml`.
- `Databases.Biodiesel` loads embedded `biod_db.xml`.
- `Databases.Electrolyte` loads embedded `electrolyte.xml`.
- `Databases.ChEDL_Thermo` loads embedded `chedl_thermo.json`.

Each database loader converts records into DWSIM-native:

```vb
DWSIM.Thermodynamics.BaseClasses.ConstantProperties
```

Those `ConstantProperties` objects are what DWSIM property packages and material streams use. That is why we should not use a Go or React parser as the source of truth for simulation compounds.

## Worker Architecture

The runtime path is now:

```text
React UI
  -> src/lib/thermo
    -> Electron IPC
      -> src/main.ts
        -> Go thermo API
          -> DWSIM worker process
            -> DWSIM Calculator.Initialize()
              -> DWSIM AvailableCompounds
```

The Go thermo API talks to the worker through JSON-RPC over stdin/stdout.

Example worker request:

```json
{"jsonrpc":"2.0","method":"ListCompounds","id":1}
```

Example worker response:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": "Methane",
      "name": "Methane",
      "formula": "CH4",
      "category": "ChemSep",
      "source": "ChemSep"
    }
  ],
  "error": null,
  "id": 1
}
```

## What Was Tried

The official DWSIM macOS runtime is a Mono/.NET Framework runtime. When a `.NET 8` in-process worker path was tried against the official DWSIM DLL, it failed with a framework compatibility error:

```text
Could not load type 'System.Security.Permissions.ReflectionPermission' from assembly 'mscorlib'
```

That showed the direct `.NET 8` in-process path is not compatible with the official DWSIM macOS build.

Then we tried building DWSIM locally from `../dwsim`:

- `dotnet msbuild DWSIM.Thermodynamics/DWSIM.Thermodynamics.vbproj` first failed because Mono was missing.
- Mono was installed with Homebrew.
- DWSIM package restore then worked better.
- The build still failed because DWSIM is a legacy .NET Framework solution with macOS/Mono build issues, missing reference packages, UI dependencies, `Eto.Forms` target import issues, and `libgdiplus`/resource problems.

So the local source build was not the fastest reliable path.

## What Made It Work

The official DWSIM macOS release was downloaded:

```bash
https://github.com/DanWBR/dwsim/releases/download/v9.0.5/DWSIM.9.0.5.dmg
```

After mounting the DMG, the built DWSIM runtime was found here:

```text
/Volumes/DWSIM/DWSIM.app/Contents/MonoBundle/DWSIM.Thermodynamics.dll
```

Because this is a Mono/.NET Framework runtime, a Mono worker was added:

```text
workers/DWSIMWorkerMono/
  Program.cs
  DwsimRuntime.cs
  DWSIMWorkerMono
```

`DWSIMWorkerMono` is a small shell wrapper. It compiles `Program.cs` and `DwsimRuntime.cs` into `DWSIMWorkerMono.exe` with `mcs` if needed, then runs it with `mono`.

The Mono worker loads DWSIM using:

```csharp
Assembly.LoadFrom("DWSIM.Thermodynamics.dll")
```

Then it creates:

```csharp
DWSIM.Thermodynamics.CalculatorInterface.Calculator
```

Then it calls:

```csharp
Initialize()
```

Then worker commands read from DWSIM itself:

- `ListCompounds` reads `calculator.AvailableCompounds`.
- `ListPropertyPackages` calls `GetPropPackList()`.
- `ValidateThermoSelection` verifies compounds exist and the property package can be created.
- `CalculatePTFlash` calls DWSIM `PTFlash()`.

## Local Runtime Copy

The DWSIM app runtime was copied into:

```text
zoo/dwsim-runtime/
```

That folder is ignored in `.gitignore` because it is a large third-party runtime bundle and has GPL licensing implications.

The Mono worker discovers DWSIM from:

- `dwsim-runtime/DWSIM.Thermodynamics.dll` from the current app root

For development, `src/main.ts` now auto-selects the Mono worker when `FUGACITY_DWSIM_WORKER` is not already set:

```text
workers/DWSIMWorkerMono/DWSIMWorkerMono
```

## Commands That Worked

List property packages through the full Go path:

```bash
cd /Users/chikanma/Documents/process_simulator/zoo
FUGACITY_DWSIM_WORKER="/Users/chikanma/Documents/process_simulator/zoo/workers/DWSIMWorkerMono/DWSIMWorkerMono" \
  go run ./thermo/cmd/thermo-api ListPropertyPackages
```

This returned real DWSIM property packages, including:

```text
Peng-Robinson (PR)
Soave-Redlich-Kwong (SRK)
NRTL
UNIFAC
Raoult's Law
```

Validate a thermodynamics selection:

```bash
printf '{"propertyPackageId":"Peng-Robinson (PR)","compoundIds":["Methane","Ethane"]}' | \
  FUGACITY_DWSIM_WORKER="/Users/chikanma/Documents/process_simulator/zoo/workers/DWSIMWorkerMono/DWSIMWorkerMono" \
  go run ./thermo/cmd/thermo-api ValidateThermoSelection
```

This returned:

```json
{"valid":true}
```

Run a PT flash:

```bash
printf '{"propertyPackageId":"Peng-Robinson (PR)","compoundIds":["Methane","Ethane"],"moleFractions":[0.5,0.5],"temperatureK":250,"pressurePa":101325}' | \
  FUGACITY_DWSIM_WORKER="/Users/chikanma/Documents/process_simulator/zoo/workers/DWSIMWorkerMono/DWSIMWorkerMono" \
  go run ./thermo/cmd/thermo-api CalculatePTFlash
```

This returned a real DWSIM flash result:

```json
{
  "temperatureK": 250,
  "pressurePa": 101325,
  "vaporFraction": 1,
  "phases": [
    {
      "name": "Vapor",
      "fraction": 1,
      "moleFractions": {
        "Ethane": 0.5,
        "Methane": 0.5
      }
    }
  ]
}
```

## Important Production Note

For production, we should not rely on the mounted DMG. We need to package a DWSIM runtime folder alongside the app or server deployment:

```text
dwsim-runtime/
  DWSIM.Thermodynamics.dll
  DWSIM.Interfaces.dll
  DWSIM.SharedClasses.dll
  DWSIM.GlobalSettings.dll
  other DWSIM DLLs and native dependencies
```

For macOS desktop today, the practical runtime is the official DWSIM `Contents/MonoBundle` folder. Since that runtime is GPL-covered DWSIM distribution, packaging it with Fugacity has GPL licensing implications and must be treated intentionally.

## Current Practical Development Setup

The local working setup is:

```text
zoo/dwsim-runtime/                 copied from DWSIM.app/Contents/MonoBundle
zoo/workers/DWSIMWorkerMono/       Mono-compatible worker
zoo/thermo/                        Go API calling the worker
zoo/src/main.ts                    Electron auto-selects Mono worker in dev
```

With that in place, the app can list real DWSIM compounds instead of fake fallback data.
