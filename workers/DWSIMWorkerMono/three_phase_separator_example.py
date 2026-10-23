import argparse
import math
import os
from pathlib import Path
import subprocess

from heater_example import load_dwsim, save_pfd


def create_three_phase_property_package():
    from DWSIM.Interfaces.Enums import FlashSetting
    from DWSIM.Thermodynamics.PropertyPackages import PengRobinsonPropertyPackage, PropertyPackage

    package = PengRobinsonPropertyPackage()
    package.FlashCalculationApproach = PropertyPackage.FlashCalculationApproachType.InsideOut
    package.SetPhaseEquilibriaCalculationMode("VLLE")
    package.FlashSettings[FlashSetting.FailSafeCalculationMode] = "3"
    for first, second, value in (
        ("Methane", "N-decane", 0.0489),
        ("Water", "Methane", 0.5),
        ("Water", "N-decane", 0.5),
    ):
        package.m_pr.InteractionParameters[first][second].kij = value
    return package


def print_stream_table(simulation, streams):
    rows = [["Property", "Feed (4)", "Vapor (1)", "Light liquid (2)", "Heavy liquid (3)", "Units"]]
    for index in [*range(12), 27, 45]:
        property_id = f"PROP_MS_{index}"
        rows.append([
            simulation.GetTranslatedString(property_id),
            *(f"{stream.GetPropertyValue(property_id, None):.8g}" for stream in streams),
            streams[0].GetPropertyUnit(property_id, None) or "-",
        ])
    for name in streams[0].Phases[0].Compounds.Keys:
        rows.append([
            f"Mole fraction / {name}",
            *(f"{stream.Phases[0].Compounds[name].MoleFraction:.8g}" for stream in streams),
            "-",
        ])

    widths = [max(len(row[column]) for row in rows) for column in range(len(rows[0]))]
    separator = "+-" + "-+-".join("-" * width for width in widths) + "-+"
    print(separator)
    for index, row in enumerate(rows):
        cells = [
            cell.rjust(widths[column]) if index and 0 < column < len(row) - 1
            else cell.ljust(widths[column])
            for column, cell in enumerate(row)
        ]
        print("| " + " | ".join(cells) + " |")
        if index == 0:
            print(separator)
    print(separator)


def validate_outlets(feed, outlets):
    feed_flow = feed.GetMassFlow()
    outlet_flows = [stream.GetMassFlow() for stream in outlets]
    if any(not math.isfinite(flow) or flow <= 0.0 for flow in outlet_flows):
        raise RuntimeError(f"Expected three nonempty outlet phases, got {outlet_flows} kg/s.")
    balance_error = feed_flow - sum(outlet_flows)
    if not math.isclose(feed_flow, sum(outlet_flows), rel_tol=1e-6, abs_tol=1e-8):
        raise RuntimeError(f"Separator mass balance failed: {balance_error:.8g} kg/s.")
    for name in feed.Phases[0].Compounds.Keys:
        inlet_flow = feed_flow * feed.Phases[0].Compounds[name].MassFraction
        outlet_flow = sum(
            stream.GetMassFlow() * stream.Phases[0].Compounds[name].MassFraction
            for stream in outlets
        )
        if not math.isclose(inlet_flow, outlet_flow, rel_tol=1e-6, abs_tol=1e-8):
            raise RuntimeError(f"Separator component mass balance failed for {name}.")
    print(f"Mass balance error: {balance_error:.8g} kg/s")


def run_separator(output_directory):
    from DWSIM.Automation import Automation3
    from DWSIM.GlobalSettings import Settings
    from DWSIM.Interfaces.Enums import ForcedPhase, StreamSpec
    from DWSIM.Interfaces.Enums.GraphicObjects import ObjectType
    from DWSIM.UnitOperations.UnitOperations import Vessel
    from System import Array, Double

    automation = Automation3()
    try:
        simulation = automation.CreateFlowsheet()
        composition = {"Methane": 1 / 3, "Water": 1 / 3, "N-decane": 1 / 3}
        for name in composition:
            compound = simulation.AvailableCompounds[name]
            simulation.SelectedCompounds.Add(compound.Name, compound)
        package = create_three_phase_property_package()
        simulation.AddPropertyPackage(package)

        feed = simulation.AddObject(ObjectType.MaterialStream, 80, 160, "4").GetAsObject()
        vapor = simulation.AddObject(ObjectType.MaterialStream, 360, 80, "1").GetAsObject()
        light_liquid = simulation.AddObject(ObjectType.MaterialStream, 360, 160, "2").GetAsObject()
        heavy_liquid = simulation.AddObject(ObjectType.MaterialStream, 360, 240, "3").GetAsObject()
        separator = simulation.AddObject(ObjectType.Vessel, 220, 100, "SEP-1").GetAsObject()
        streams = (feed, vapor, light_liquid, heavy_liquid)
        for stream in streams:
            stream.PropertyPackage = package
            stream.GraphicObject.Width = 80
            stream.GraphicObject.Height = 20
        vapor.ForcePhase = ForcedPhase.Vapor
        light_liquid.ForcePhase = ForcedPhase.Liquid
        heavy_liquid.ForcePhase = ForcedPhase.Liquid
        separator.PropertyPackage = package
        separator.GraphicObject.Width = 60
        separator.GraphicObject.Height = 100
        separator.CalculationMode = Vessel.CalculationModes.Adiabatic

        simulation.ConnectObjects(feed.GraphicObject, separator.GraphicObject, 0, 5)
        simulation.ConnectObjects(separator.GraphicObject, vapor.GraphicObject, 0, 0)
        simulation.ConnectObjects(separator.GraphicObject, light_liquid.GraphicObject, 1, 0)
        simulation.ConnectObjects(separator.GraphicObject, heavy_liquid.GraphicObject, 2, 0)

        feed.SetOverallComposition(Array[Double]([
            composition[name] for name in feed.Phases[0].Compounds.Keys
        ]))
        feed.SpecType = StreamSpec.Temperature_and_Pressure
        feed.SetTemperature(300.0)
        feed.SetPressure(101325.0)
        feed.SetMassFlow(32.0)
        Settings.SolverMode = 0

        print("Calculating SEP-1: methane / water / n-decane, equal mole fractions...", flush=True)
        print("Feed (4): 300 K, 101325 Pa, 32 kg/s; Peng-Robinson with inside-out VLLE flash.", flush=True)
        errors = automation.CalculateFlowsheet4(simulation)
        if errors.Count:
            raise RuntimeError("\n".join(str(error) for error in errors))
        if not simulation.Solved:
            raise RuntimeError(f"Flowsheet did not solve: {simulation.ErrorMessage}")

        validate_outlets(feed, streams[1:])
        print_stream_table(simulation, streams)

        flowsheet_path = output_directory / "three_phase_separator.dwxmz"
        image_path = output_directory / "pfd.png"
        save_pfd(simulation, image_path)
        automation.SaveFlowsheet(simulation, str(flowsheet_path), True)
        print(f"Flowsheet: {flowsheet_path}")
        print(f"PFD image: {image_path}")
        print("Finished OK!")
        return image_path
    finally:
        automation.ReleaseResources()


def main():
    directory = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Build and run a DWSIM three-phase separator using Python and Mono.")
    parser.add_argument("--runtime", type=Path,
                        default=Path(os.environ.get("DWSIM_AUTOMATION_RUNTIME", directory / "cavett-runtime")))
    parser.add_argument("--output-dir", type=Path, default=directory / "separator-output")
    parser.add_argument("--show", action="store_true", help="Open the PFD image in the default macOS viewer.")
    arguments = parser.parse_args()
    runtime = arguments.runtime.resolve()
    output_directory = arguments.output_dir.resolve()
    output_directory.mkdir(parents=True, exist_ok=True)

    load_dwsim(runtime)
    image_path = run_separator(output_directory)
    if arguments.show:
        subprocess.run(["open", str(image_path)], check=True)


if __name__ == "__main__":
    main()
