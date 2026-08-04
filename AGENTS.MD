### Zoo to Fugacity

Zoo is an opensource CAD software that is agentic in nature however i want to build Fugacity which  a process simulator agentic software for chemical engineering like DWSIM, and HYSYS in fact the thermodynamics of this software will be built upon DWSIM which opensource with a GPL 2.0 license
so take this into account when building this software

### Desktop and Web Runtime Pattern

Fugacity is being migrated from Zoo CAD, which supports both Electron desktop and web runtimes from mostly shared React code.

Use `window.electron` as the desktop capability boundary:

- If `window.electron` exists, the app is running in Electron desktop and may use preload IPC APIs.
- If `window.electron` is missing, the app is running as a web app and must use browser-safe APIs or a server HTTP API.
- Do not call Electron APIs directly throughout UI code. Hide platform differences behind small adapters.

Follow Zoo's existing adapter pattern:

- Filesystem: shared `fsZds` interface selects `ElectronFS` on desktop and `OPFS` on web.
- Menus and native dialogs: no-op, hide, or use browser equivalents on web.
- Routing: desktop may use Electron/hash routing; web uses browser-safe routing.
- Exports/screenshots/open-external behavior should branch behind helper functions, not scattered UI checks.

For Fugacity thermodynamics, use the same pattern:

```text
React UI
  -> shared thermo adapter
      -> desktop: window.electron.thermo.* -> Electron main -> Go -> .NET DWSIM worker
      -> web: fetch('/api/thermo/...') -> Go server -> .NET DWSIM worker
      -> fallback/dev: explicit unavailable errors and disabled calculations
```

`window.electron.thermo.*` is desktop-only. It will not exist in the web app because preload and Electron IPC do not run in browsers.

When adding thermodynamics features:

- Keep canonical request/response types app-level and runtime-neutral.
- Put runtime branching in `src/lib/thermo` or equivalent adapter modules.
- Keep renderer components focused on UI/state and call the shared thermo adapter, not Electron directly.
- Desktop can spawn/manage local Go and DWSIM worker processes.
- Web must call a backend service for real DWSIM thermodynamics; browsers cannot spawn Go or .NET workers directly.
- If no backend is configured, do not provide fake DWSIM compounds or property packages. Surface clear unavailable errors and disabled states instead.

### DWSIM Compound Database Loading

Do not parse DWSIM compound databases in React or Go as the source of truth for simulations. DWSIM already has database loaders that convert database records into `DWSIM.Thermodynamics.BaseClasses.ConstantProperties`, and those `ConstantProperties` objects are what property packages and material streams use during calculations.

The verified local DWSIM flow is:

```vb
Dim dtlc As New DWSIM.Thermodynamics.CalculatorInterface.Calculator
dtlc.Initialize()
```

Inside `Calculator.Initialize()`, DWSIM creates `_availablecomps As Dictionary(Of String, ConstantProperties)` and loads compound databases through DWSIM's own database classes:

- `LoadCSDB()` uses `Databases.ChemSep`, which reads embedded `DWSIM.Thermodynamics.chemsep1.xml` and `DWSIM.Thermodynamics.chemsep2.xml`.
- `LoadDWSIMDB()` uses `Databases.DWSIM`, which reads embedded `DWSIM.Thermodynamics.dwsim.xml`.
- `LoadBDDB()` uses `Databases.Biodiesel`, which reads embedded `DWSIM.Thermodynamics.biod_db.xml`.
- `LoadEDB()` uses `Databases.Electrolyte`, which reads embedded `DWSIM.Thermodynamics.electrolyte.xml`.
- `LoadCheDLDB()` uses `Databases.ChEDL_Thermo`, which reads embedded `DWSIM.Thermodynamics.chedl_thermo.json` and deserializes it into `List(Of ConstantProperties)`.
- `LoadCPDB()` exists for CoolProp and is used by property-package initialization paths.

Each database class exposes `Load()` and `Transfer()` methods. `Transfer()` returns DWSIM-native `ConstantProperties` instances, not raw XML or JSON records. DWSIM then stores these objects in `Calculator.AvailableCompounds` keyed by compound name.

During flash calculations, DWSIM transfers the same compound registry into the selected property package and material stream. For each requested compound name, DWSIM does the equivalent of:

```vb
phase.Compounds.Add(c, New Compound(c, ""))
phase.Compounds(c).ConstantProperties = pp._availablecomps(c)
pp._selectedcomps.Add(c, pp._availablecomps(c))
```

Therefore Fugacity's DWSIM integration must treat the `.NET DWSIMWorker` as the DWSIM compatibility boundary:

- The worker should instantiate `DWSIM.Thermodynamics.CalculatorInterface.Calculator`.
- The worker should call `Initialize()` once and fail clearly if DWSIM cannot initialize.
- `ListCompounds` and `GetCompound` should read from `calculator.AvailableCompounds`.
- Compound IDs sent to DWSIM should remain DWSIM-resolvable compound names unless an explicit internal mapping is added.
- `ListPropertyPackages` should use DWSIM's `GetPropPackList()`.
- `ValidateThermoSelection` should verify that the property package can be created and that every compound exists in `AvailableCompounds`.
- Flash calculations should call DWSIM APIs such as `PTFlash()` or `CalcEquilibrium()` using compounds from `AvailableCompounds`.

Avoid maintaining an independent Go-side `ConstantProperties` parser as the simulation source of truth. It can be useful for inspection or experiments, but if it does not produce the same DWSIM-native objects that property packages consume, the UI may show compounds that cannot actually simulate.

Throughout, the code very important, we try to DEFINE methods, function or classes in the same file before we call them for example. let say in a .cs file, we call a GetAvailableCompounds method but define it 300 lines later. while the code still works 
it makes review it difficult. it is not MUST to do this but at the same time we should always do this when possible




 
