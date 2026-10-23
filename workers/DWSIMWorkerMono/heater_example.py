import argparse
import os
from pathlib import Path
import subprocess
import sys


def load_dwsim(runtime):
    if not (runtime / "DWSIM.Automation.dll").is_file():
        raise FileNotFoundError(f"Full DWSIM Mono runtime not found: {runtime}")

    from pythonnet import load

    load("mono")
    import clr

    sys.path.insert(0, str(runtime))
    for assembly in (
        "CapeOpen",
        "DWSIM.Automation",
        "DWSIM.Interfaces",
        "DWSIM.GlobalSettings",
        "DWSIM.SharedClasses",
        "DWSIM.Thermodynamics",
        "DWSIM.UnitOperations",
        "SkiaSharp",
    ):
        clr.AddReference(str(runtime / f"{assembly}.dll"))

    from System.IO import Directory

    Directory.SetCurrentDirectory(str(runtime))


def print_stream_table(simulation, inlet, outlet):
    rows = [["Property", "Inlet", "Outlet", "Units"]]
    for index in [*range(12), 27, 45]:
        property_id = f"PROP_MS_{index}"
        rows.append([
            simulation.GetTranslatedString(property_id),
            f"{inlet.GetPropertyValue(property_id, None):.8g}",
            f"{outlet.GetPropertyValue(property_id, None):.8g}",
            inlet.GetPropertyUnit(property_id, None) or "-",
        ])

    widths = [max(len(row[column]) for row in rows) for column in range(4)]
    separator = "+-" + "-+-".join("-" * width for width in widths) + "-+"
    print(separator)
    for index, row in enumerate(rows):
        cells = [
            cell.rjust(widths[column]) if index and column in (1, 2)
            else cell.ljust(widths[column])
            for column, cell in enumerate(row)
        ]
        print("| " + " | ".join(cells) + " |")
        if index == 0:
            print(separator)
    print(separator)


def save_pfd(simulation, image_path):
    from SkiaSharp import SKBitmap, SKCanvas, SKColors, SKEncodedImageFormat, SKImage

    surface = simulation.GetSurface()
    surface.ZoomAll(1024, 768)
    surface.Zoom = min(surface.Zoom, 3.0)
    surface.Center(1024, 768)
    bitmap = SKBitmap(1024, 768)
    try:
        canvas = SKCanvas(bitmap)
        try:
            canvas.Clear(SKColors.White)
            surface.UpdateCanvas(canvas)
            canvas.Flush()
            image = SKImage.FromBitmap(bitmap)
            try:
                data = image.Encode(SKEncodedImageFormat.Png, 100)
                if data is None:
                    raise RuntimeError("DWSIM PFD could not be encoded as PNG.")
                try:
                    image_path.write_bytes(bytes(data.ToArray()))
                finally:
                    data.Dispose()
            finally:
                image.Dispose()
        finally:
            canvas.Dispose()
    finally:
        bitmap.Dispose()


def run_heater(output_directory):
    from DWSIM.Automation import Automation3
    from DWSIM.GlobalSettings import Settings
    from DWSIM.Interfaces.Enums.GraphicObjects import ObjectType
    from DWSIM.Thermodynamics.PropertyPackages import SteamTablesPropertyPackage
    from DWSIM.UnitOperations.UnitOperations import Heater

    automation = Automation3()
    try:
        simulation = automation.CreateFlowsheet()
        water = simulation.AvailableCompounds["Water"]
        simulation.SelectedCompounds.Add(water.Name, water)

        inlet = simulation.AddObject(ObjectType.MaterialStream, 50, 50, "inlet").GetAsObject()
        outlet = simulation.AddObject(ObjectType.MaterialStream, 150, 50, "outlet").GetAsObject()
        power = simulation.AddObject(ObjectType.EnergyStream, 100, 50, "power")
        heater = simulation.AddObject(ObjectType.Heater, 100, 50, "heater").GetAsObject()

        simulation.ConnectObjects(inlet.GraphicObject, heater.GraphicObject, -1, -1)
        simulation.ConnectObjects(heater.GraphicObject, outlet.GraphicObject, -1, -1)
        simulation.ConnectObjects(power.GraphicObject, heater.GraphicObject, -1, -1)
        simulation.AutoLayout()
        simulation.AddPropertyPackage(SteamTablesPropertyPackage())

        inlet.SetTemperature(300.0)
        inlet.SetMassFlow(100.0)
        heater.CalcMode = Heater.CalculationMode.OutletTemperature
        heater.OutletTemperature = 400.0
        Settings.SolverMode = 0

        print("Calculating water heater: 100 kg/s, 300 K -> 400 K...", flush=True)
        errors = automation.CalculateFlowsheet4(simulation)
        if errors.Count:
            raise RuntimeError("\n".join(str(error) for error in errors))
        if not simulation.Solved:
            raise RuntimeError(f"Flowsheet did not solve: {simulation.ErrorMessage}")

        print(f"Heater Heat Load: {heater.DeltaQ:.8f} kW")
        print_stream_table(simulation, inlet, outlet)

        flowsheet_path = output_directory / "heatersample.dwxmz"
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
    parser = argparse.ArgumentParser(description="Run DWSIM's water-heater example using Python and Mono.")
    parser.add_argument("--runtime", type=Path,
                        default=Path(os.environ.get("DWSIM_AUTOMATION_RUNTIME", directory / "cavett-runtime")))
    parser.add_argument("--output-dir", type=Path, default=directory / "heater-output")
    parser.add_argument("--show", action="store_true", help="Open the PFD image in the default macOS viewer.")
    arguments = parser.parse_args()
    runtime = arguments.runtime.resolve()
    output_directory = arguments.output_dir.resolve()
    output_directory.mkdir(parents=True, exist_ok=True)

    load_dwsim(runtime)
    image_path = run_heater(output_directory)
    if arguments.show:
        subprocess.run(["open", str(image_path)], check=True)


if __name__ == "__main__":
    main()
