# Process Simulation in DWSIM: From Flowsheet to Solved Simulation

This document explains how a process simulation works end-to-end in DWSIM: how a user-created flowsheet (the drawing on the canvas) becomes an executed process simulation with converged results.

DWSIM uses a **Sequential Modular** architecture. A separate `FlowsheetSolver` resolves the calculation order, calls each unit operation's calculation routine in sequence, and iterates around recycle loops until convergence.

---

## 1. Building the Flowsheet (drawing objects on canvas)

When a user drags an object onto the canvas:

- The SkiaSharp drawing surface creates a visual **`GraphicObject`** (e.g. `MixerGraphic`). This object holds the **connectors** (input/output ports / connection points).
- `FlowsheetBase.AddObjectToSurface()` (`DWSIM.FlowsheetBase/FlowsheetBase.vb:992`) creates a *matching logical simulation object* (e.g. `UnitOperations.Mixer`), assigns `myObj.GraphicObject = myGobj`, and stores **both under the same GUID key** in two parallel dictionaries:
  - `SimulationObjects` — the logical objects (`FlowsheetBase.vb:513`)
  - `GraphicObjects` — the visual objects

When the user connects two objects, the wire is recorded on the connectors (`AttachedConnector.AttachedFrom` / `AttachedTo`).

> **Key design point:** the dependency graph used for solving is **reconstructed from the graphical wires**, not from a separate model. The solver reads the connectors to learn which object feeds which.

---

## 2. Prerequisites

Before solving, the UI validates that the user has selected:

- a **Property Package** (thermo model, e.g. Peng-Robinson) — `Flowsheet.cs:126`
- at least one **compound** — `Flowsheet.cs:132`

---

## 3. Triggering the Solve

There are two ways a calculation starts:

- **Solve button** → `Flowsheet.SolveFlowsheet2()` (`DWSIM.UI.Desktop.Shared/Flowsheet/Flowsheet.cs:195`) → `RequestCalculation()` → `FlowsheetSolver.FlowsheetSolver.SolveFlowsheet(Me, mode)` (`FlowsheetBase.vb:433`).
- **Editing a stream / unit-op value** → `RequestCalculation(sender)` (`FlowsheetBase.vb:411`), which enqueues the object as "dirty" and calls `SolveFlowsheet(..., frompgrid:=True)` so **only the affected downstream branch** is recalculated.

Both paths run on a background `Task`, keeping the UI responsive (`Flowsheet.cs:142`).

---

## 4. `SolveFlowsheet()` — the Orchestrator

**Entry point:** `DWSIM.FlowsheetSolver/FlowsheetSolver.vb:1120`

The execution sequence:

1. **Order the graph** — `GetSolvingList()` (`FlowsheetSolver.vb:930`) performs a **reverse BFS from sink objects** (product streams with no output connection). Walking each object's `InputConnectors` backward builds breadth-levels, flattened into `objstack` = **feed-first → product-last**. Recycle outputs are deliberately **excluded** from the walk — this is the *tearing* that breaks cycles into a DAG (`FlowsheetSolver.vb:1052`).
2. **Detect recycles** (tear blocks) and set up convergence vectors (`FlowsheetSolver.vb:1314`).
3. **The outer solve loop** (runs until converged):
   - Reset every object to `Calculated = False` and enqueue the whole `objstack` as `CalculationArgs` (`FlowsheetSolver.vb:1394`).
   - Run `ProcessCalculationQueue()` (`FlowsheetSolver.vb:484`) — the actual compute pass.
   - Check every recycle's `Converged` flag; if not converged, apply a **Wegstein successive-substitution** or **global Broyden** correction to the tear variables and loop again (`FlowsheetSolver.vb:1484-1569`).

---

## 5. The Compute Pass

`ProcessQueueInternalAsync` (`FlowsheetSolver.vb:632`) is a `While CalculationQueue.Count >= 1` loop that dispatches per object:

- **Material streams** → `CalculateMaterialStreamAsync` → runs the stream's flash (`ms.Solve()`).
- **Unit operations** → `CalculateObjectAsync` (`FlowsheetSolver.vb:263`): runs any attached specs (Design Spec / Adjust convergence around the unit op), then calls `myObj.Solve()`.

### Inside `Solve()`

`BaseClass.Solve()` (`DWSIM.SharedClasses/BaseClass/SimulationObjectBaseClasses.vb:488`):

1. Checks dirty status via `CheckDirtyStatus()` — compares a snapshot of the object's input state (`LastSolutionInputSnapshot`) against its current data to skip re-solving unchanged objects.
2. Calls the unit op's `Calculate()` unless previous results can be reused.
3. Saves a new input snapshot.

`UnitOpBaseClass.Solve()` (`DWSIM.UnitOperations/BaseClasses/UnitOperations.vb:87`) wraps this with state save/restore so a failed calculation rolls back cleanly.

### Inside a unit op's `Calculate()`

Using the Mixer as the canonical example (`DWSIM.UnitOperations/UnitOperations/Mixer.vb:85`):

1. **Find its inputs** via the graphic connectors: `FlowSheet.SimulationObjects(cp.AttachedConnector.AttachedFrom.Name)` — this is how the unit op discovers its connected streams.
2. **Mass balance** — sum the inlet flows and compositions to define the outlet.
3. **Energy balance** — compute the weighted inlet enthalpy to define the outlet enthalpy.
4. **Write results into the outlet stream as a specification** — e.g. the Mixer sets `SpecType = Pressure_and_Enthalpy` on the outlet stream (`Mixer.vb:234`).
5. The outlet stream's `Solve()` then runs a **Flash** (via the Property Package), which fills in all the outlet properties (phase split, temperature, density, enthalpy, etc.).

> **The crucial handoff:** unit operations set *specifications* on streams; the **Property Package + Flash algorithm** (the thermo layer) converts those specs into full thermodynamic state. Downstream unit ops then read the finished stream.

---

## 6. Downstream Propagation

Because the queue is processed in graph order each pass, a unit op always sees freshly-computed inlet streams. After each object, the worker sets `GraphicObject.Calculated = True` and fires events (`CalculatingObject`, `UnitOpCalculationStarted` / `Finished`) that the UI subscribes to — this drives the per-object status animation (flashing blue/green) on the canvas.

---

## 7. Convergence and Recycle Loops

If the flowsheet has a recycle, the outer `SolveFlowsheet` loop iterates:

- Each pass re-runs the whole ordered queue.
- The `Recycle` block (`DWSIM.UnitOperations/LogicalBlocks/Recycle.vb:263`) compares the tear-stream inlet vs. outlet, stores the error in `ConvergenceHistory`, smooths the tear values (`SetOutletStreamProperties`, `Recycle.vb:211`), and reports `Converged`.
- `SolveFlowsheet` exits the loop when every recycle converges (`FlowsheetSolver.vb:1531`).

---

## 8. Post-Solve

`SolveFlowsheet` finalizes the run (`FlowsheetSolver.vb:1619-1771`):

- `UpdateMassAndEnergyBalance()` — global mass/energy balance.
- `UpdateDisplayStatus` — per-object status refresh.
- Sets `fs.Solved = True`, `fs.ErrorMessage = ""`.
- Fires `FlowsheetCalculationFinished`, refreshes the spreadsheet and UI.

---

## Summary Diagram

```
Canvas wire connectors  ──►  GetSolvingList (reverse BFS, tear recycles)
        │                               │
        ▼                               ▼
  SimulationObjects dict         objstack (ordered)
        │                               │
        └───────────┬───────────────────┘
                    ▼
        SolveFlowsheet outer loop (recycle convergence)
                    │
                    ▼
   ProcessCalculationQueue (per object, in order)
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   Stream.Solve()         UnitOp.Calculate()
   (Property Pkg + Flash)  (mass/energy balance)
          │                    │
          └─────────┬──────────┘
                    ▼
      writes outlet stream specs ──► flash ──► downstream objects
```

---

## Key Files

| Concern | Location |
|---|---|
| `SolveFlowsheet` (main entry) | `DWSIM.FlowsheetSolver/FlowsheetSolver.vb:1120` |
| `GetSolvingList` (ordering / graph traversal) | `FlowsheetSolver.vb:930` |
| `ProcessCalculationQueue` | `FlowsheetSolver.vb:484` |
| `ProcessQueueInternalAsync` (per-object loop) | `FlowsheetSolver.vb:632` |
| `CalculateObjectAsync` (per-unit-op worker) | `FlowsheetSolver.vb:263` |
| `Solve()` / `RequestCalculation` (entry from UI) | `FlowsheetBase.vb:405`, `:411` |
| `AddObjectToSurface` (object factory) | `FlowsheetBase.vb:992` |
| `SimulationObjects` store | `FlowsheetBase.vb:513` |
| UI "Solve" button → `SolveFlowsheet2` | `DWSIM.UI.Desktop.Shared/Flowsheet/Flowsheet.cs:195` |
| Base `Solve()` (dirty-check + dispatch) | `DWSIM.SharedClasses/BaseClass/SimulationObjectBaseClasses.vb:488` |
| `UnitOpBaseClass.Solve()` (state save/restore) | `DWSIM.UnitOperations/BaseClasses/UnitOperations.vb:87` |
| Example unit op `Calculate()` (Mixer) | `DWSIM.UnitOperations/UnitOperations/Mixer.vb:85` |
| `Recycle.Calculate` (tear / convergence) | `DWSIM.UnitOperations/LogicalBlocks/Recycle.vb:263` |

---

## Notes

- The parallel task schedulers (`LimitedConcurrencyLevelTaskScheduler`, `StaTaskScheduler`) exist in `DWSIM.FlowsheetSolver/Task Schedulers/` but are **not wired into the active solve path** — calculation is single-threaded async today.
- A newer parallel reimplementation exists (`FlowsheetSolver2.vb`), but the UI only calls the original `FlowsheetSolver` class.
