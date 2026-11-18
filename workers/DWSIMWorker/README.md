# DWSIMWorker (.NET 10)

## The problem

Solving a flowsheet failed with:

```
DWSIM object 'MaterialStream' has no writable property 'GeneratePhaseEnvelopeLookup'.
```

The UI sends DWSIM 10 property names, but flowsheet solving ran on an old DWSIM 9.0.5 bundle
(`DWSIMWorkerMono/cavett-runtime`). That property does not exist in DWSIM 9.

## Why a new worker

The local DWSIM 10 source (`../dwsim10`) only builds for .NET 10. Mono cannot load .NET 10
assemblies, so the worker had to move from Mono to .NET 10.

## What changed

| | Old (`DWSIMWorkerMono`) | New (`DWSIMWorker`) |
|---|---|---|
| Runtime | Mono | .NET 10 |
| DWSIM version | 9.0.5 for solving, 10.2.11 for thermo | 10.2.11 for everything |
| DWSIM bundles | `cavett-runtime` + `dwsim-runtime` | built from `../dwsim10` |
| JSON | `JavaScriptSerializer` | `System.Text.Json` |
| Loading DWSIM | reflection + assembly resolvers | normal project reference |

- `Program.cs`: same JSON-RPC methods, new JSON parsing.
- `DwsimRuntime.cs`: calls DWSIM's `Calculator` directly.
- `FlowsheetSimulation.cs`: same code, without the `AutomationRuntime` loader.
- `src/main.ts`: now starts `workers/DWSIMWorker/DWSIMWorker` by default.
- The Mono worker is untouched. Use it by setting `FUGACITY_DWSIM_WORKER`.

## How it runs

```text
Electron -> Go thermo-api -> workers/DWSIMWorker/DWSIMWorker (bash) -> dotnet DWSIMWorker.dll
```

The `DWSIMWorker` script rebuilds the worker when a source file changed, then runs it.
Responses go to stdout; DWSIM logs go to stderr.

## Requirements

- .NET 10 SDK
- DWSIM 10 checked out at `../dwsim10` with its submodule:

  ```bash
  git -C ../dwsim10 submodule update --init external/ReoGrid
  ```

- A different location works too: `dotnet build -p:DwsimSourceRoot=/path/to/dwsim10`

## Quick check

```bash
echo '{"id":1,"method":"ListPropertyPackages"}' | workers/DWSIMWorker/DWSIMWorker
```
