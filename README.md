# Fugacity

An agentic process simulator for chemical engineering.

Fugacity is our take on what a modern process simulation experience can be, in the spirit of tools like DWSIM and HYSYS. It applies several lessons learned in the decades since most major process simulators came into existence:

- Flowsheets should be readable, versionable artifacts. At the end of the day, your simulation project should be "plain text"
  - This makes version control—which is a solved problem in software engineering—trivial for process simulation
- All GUI (or point-and-click) interactions should be actions performed on that representation under the hood
  - This unlocks a hybrid approach to simulation. Whether you drag unit operations onto the canvas, edit the flowsheet directly, or ask the agent to do it for you, you are performing the same action in Fugacity
- Thermodynamics should be built on a proven, open foundation
  - Rather than reinventing property packages and compound databases, Fugacity's thermodynamics are built on [DWSIM](https://github.com/DanWBR/dwsim), using its native compound databases, property packages and flash algorithms
- The same app should run on the desktop and in the browser
  - On desktop, Fugacity manages a local thermodynamics worker. On the web, the same UI calls a backend service that runs the DWSIM worker

Fugacity is a _hybrid_ and _agentic_ user interface for process simulation. You can build flowsheets by hand, connect streams and unit operations, choose compounds and property packages, and let the agent help you set up, solve and analyze your process.

Flowsheets are solved using a sequential modular approach: the solver resolves the calculation order from the connected flowsheet, calculates each unit operation in sequence, and iterates around recycle loops until convergence. See [SIMULATION.md](SIMULATION.md) for details.

## Technology

- UI
  - [React](https://react.dev/)
  - [Headless UI](https://headlessui.com/)
  - [TailwindCSS](https://tailwindcss.com/)
  - [XState](https://xstate.js.org/)
- Desktop
  - [Electron](https://www.electronjs.org/)
- Services
  - [Go](https://go.dev/) server and process orchestration
- Thermodynamics
  - [DWSIM](https://github.com/DanWBR/dwsim) via a .NET worker
  - DWSIM compound databases (ChemSep, DWSIM, Biodiesel, Electrolyte, ChEDL Thermo, CoolProp)

## Get Started

See the [installation guide](INSTALL.md) for instructions. If you don't see your platform or architecture supported, please file an issue.

## Developing

If you'd like to run a development build or contribute to the project, please visit our [contributor guide](CONTRIBUTING.md) to get started.

## License

Fugacity is licensed under the [GNU General Public License v3.0](LICENSE). Its thermodynamics are built on [DWSIM](https://github.com/DanWBR/dwsim), which is licensed under the GPL.
