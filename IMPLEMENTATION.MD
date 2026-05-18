# DWSIM Renderer Integration Plan (Zoo Design Studio)

This project already has a 2D flowsheet canvas (React/SVG) and a heavy-duty real-time rendering pipeline (KittyCAD engine stream). The easiest path is to keep the UI in this repo and introduce a separate DWSIM bridge service, ideally in Go, that exposes a clean REST/WebSocket API the UI can call.

This document focuses on how to connect a process simulation renderer to a DWSIM engine, using the existing flowsheet UI as the front end.

## What Exists in This Repo

- 2D flowsheet canvas: `src/flowsheet/Flowsheet2DScene.tsx`
- Flow types: `src/flowsheet/types.ts`
- Flowsheet is currently hardcoded, rendered inside `src/components/ConnectionStream.tsx` with `flowsheetOnly = true`.
- API base URL helpers (REST): `src/lib/withBaseURL.ts`
- WebSocket helper: `src/lib/socket.ts`

This means we can add a small API client layer and feed real nodes/edges/results into the existing flowsheet UI without touching the core modeling engine stack.

## Implementation Options

### Option A (Recommended): Go API + Python DWSIM Worker

Use Go for the web server and orchestration, and keep DWSIM interaction in a Python worker where pythonnet + DWSIM are already stable.

Why this is best:

- DWSIM is easiest and most stable through Python + pythonnet.
- Go is excellent for multi-tenant APIs, load management, and process isolation.
- You keep the DWSIM engine in a container that mirrors the existing cloud-native architecture.

Shape:

- Go API server (REST + optional WebSocket):
  - GET /health
  - GET /models
  - GET /models/{id}
  - POST /run/{id}
  - POST /admin/reload
- Python worker (same contract as your DWSIM spec):
  - Loads .dwxmz
  - Receives validated inputs
  - Returns outputs

Go can talk to Python in three common ways:

1) HTTP call to Python worker (FastAPI or simple HTTP server)
2) gRPC between Go and Python
3) Run Python as a subprocess and communicate over stdin/stdout JSON

For speed to integrate, HTTP is simplest.

### Option B: Go + Direct .NET Interop (Not Recommended)

Go does not have a native, mature path for .NET CLR interop. You can wrap DWSIM via a C# service and have Go call it, but that adds a second server anyway. This ends up being more complex than Option A.

### Option C: Keep FastAPI Backend, Add Go Proxy

If you already have a Python FastAPI backend (like in your DWSIM spec), you can add Go as a reverse proxy or API gateway. This can help with auth, rate limits, and streaming, while leaving DWSIM interaction in Python.

## Recommended Architecture

```
UI (this repo)
  |
  | REST/WS
  v
Go API (gateway + orchestration)
  |
  | HTTP/gRPC
  v
Python DWSIM worker (pythonnet + DWSIM)
```

## How It Maps to Your UI

The 2D flowsheet already supports:

- nodes with x/y/width/height
- edges with from/to
- drag, zoom, pan

We just need to replace the hardcoded `seedNodes` and `seedEdges` in `src/flowsheet/Flowsheet2DScene.tsx` with dynamic data from the DWSIM model schema.

The UI can call your backend to get:

- `GET /models` to list models
- `GET /models/{id}` to fetch schema (nodes/edges/inputs/outputs)
- `POST /run/{id}` to execute and receive results

Results can map to labels on nodes (stream/equipment) or a side panel.

## Implementation Steps

### 1) Add an API Client Layer in the UI

Add a small client module in `src/lib` (or similar) to call the DWSIM bridge.

Suggested API contract (align to your spec):

- `GET /models` -> array of models
- `GET /models/{id}` -> { meta, schema }
- `POST /run/{id}` -> { inputs, outputs, duration_ms }

Use `withAPIBaseURL` to point at the Go API. This keeps the environment configuration consistent.

### 2) Update Flowsheet2DScene to Use Live Model Data

Replace seed data with state loaded from the backend:

- Map `schema.flowchart.nodes` to `FlowNode` (add size defaults)
- Map `schema.flowchart.connections` to `FlowEdge`

Suggested file to update:

- `src/flowsheet/Flowsheet2DScene.tsx`

### 3) Add Input Panels + Result Labels

Use a lightweight floating panel when clicking on a node. Inputs can be derived from `schema.inputs` filtered by `node`.

Outputs can show as labels below nodes or in a side panel.

### 4) Build the Go API Bridge

Minimal Go server (Gin or Chi) that:

- loads `models/` on startup (same contract as your Python spec)
- validates inputs against schema
- forwards to Python worker (HTTP or gRPC)
- returns outputs

### 5) Dockerize the Full Stack

Use a single Docker image with:

- Go API server
- Python DWSIM worker
- DWSIM runtime

Expose Go on port 8001 (or another port) and point the UI to it.

## Suggested Data Shapes

### Schema JSON

```
{
  "flowchart": {
    "nodes": [
      { "id": "stream_in", "type": "stream", "label": "Stream 1", "x": 120, "y": 140 },
      { "id": "pump", "type": "equipment", "label": "PUMP-1", "x": 380, "y": 140 }
    ],
    "connections": [
      { "from": "stream_in", "to": "pump" }
    ]
  },
  "inputs": [
    { "id": "mass_flow", "label": "Mass flow", "type": "float", "unit": "kg/s", "node": "stream_in" }
  ],
  "outputs": [
    { "id": "pressure_out", "label": "Outlet pressure", "type": "float", "unit": "Pa", "node": "pump" }
  ]
}
```

### Run Request

```
POST /run/01_water_pump
{ "mass_flow": 1.0, "temperature": 300 }
```

### Run Response

```
{
  "model_id": "01_water_pump",
  "inputs": { ... },
  "outputs": { ... },
  "duration_ms": 1200
}
```

## Recommendations

- Start with Option A. It is the fastest way to deliver a working system with Go in the mix.
- Keep the DWSIM engine in Python. You will spend far less time fighting interop issues.
- Keep the UI flowsheet simple at first: live schema + run button + output labels.
- Add WebSocket streaming later if you want live solver state or progress updates.

## Next Steps You Can Implement in This Repo

1) Add a `flowsheet` API client that fetches schema + run results.
2) Replace `seedNodes` and `seedEdges` in `src/flowsheet/Flowsheet2DScene.tsx` with loaded schema data.
3) Add a minimal run button that posts to `/run/{id}` and displays outputs.

## AI Integration (Without PSL)

Start with AI driving the existing API and UI state, without introducing a new language. This keeps the system simpler and lets you prove value quickly.

### Architecture

```
Chat UI (this repo)
  |
  | REST
  v
AI Orchestrator (Go service or separate API)
  |
  | REST
  v
DWSIM Bridge API (Go -> Python worker)
```

### Approach

- Keep the flowsheet as data fetched from the simulation API (schema.json).
- AI only edits inputs and triggers runs.
- Use tool-like endpoints the AI can call deterministically:
  - list_models
  - get_model
  - run_model
  - update_inputs
  - get_last_results

### UX Flow

1) User: "Increase feed temperature to 350 K and simulate."
2) AI: reads current model schema + inputs
3) AI: updates inputs in UI state
4) AI: triggers POST /run/{id}
5) AI: summarizes outputs + highlights deltas in UI

### Benefits

- Minimal new infrastructure
- Tight loop between chat and simulation results
- No new language to design or parse

### Limitations

- No persistent "source of truth" for flowsheet changes
- AI can only change inputs, not topology
- Limited audit trail unless you log diffs separately

## AI Integration (With PSL)

After the non-PSL flow is stable, introduce a PSL (Process Simulation Language) so the flowsheet, inputs, and layout become code that the AI edits directly.

### Architecture

```
Chat UI
  |
  | REST
  v
AI Orchestrator
  |
  | PSL patch requests
  v
PSL Compiler/Validator
  |
  | JSON schema + run inputs
  v
DWSIM Bridge API
```

### Approach

- PSL is the single source of truth for flowsheet topology + inputs.
- UI is a pure projection of PSL (nodes/edges/inputs/outputs).
- AI edits PSL through patch operations, not direct UI mutation.

### Workflow

1) AI proposes PSL diff
2) Validate PSL (schema + constraints)
3) Apply diff and re-render UI
4) Run simulation when requested

### Benefits

- Deterministic state and audit trail
- Easier collaboration and version control
- AI can edit topology, parameters, and metadata

### Costs

- You must define and maintain PSL syntax + validator
- Parser/compiler adds engineering overhead

## Recommendation

- Start with AI integration without PSL to validate the workflow and UX.
- Add PSL only after you have stable API contracts and the AI loop is proven.
- If you decide on PSL, keep it initially JSON-based with strict schema for speed and validation, then consider a text DSL later.
