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







 
