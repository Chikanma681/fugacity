using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using CapeOpen;
using DWSIM.Interfaces;

public static class CavettExample
{
    private static ICapeThermoMaterialObject GetStream(IFlowsheet simulation, string tag)
    {
        var stream = simulation.GetFlowsheetSimulationObject(tag) as ICapeThermoMaterialObject;
        if (stream == null)
            throw new InvalidOperationException("Material stream '" + tag + "' was not found.");
        return stream;
    }

    private static double GetMassFlow(ICapeThermoMaterialObject stream)
    {
        var values = (Array)stream.GetProp("totalflow", "overall", null, "", "mass");
        return Convert.ToDouble(values.GetValue(0), CultureInfo.InvariantCulture);
    }

    private static string FormatValue(object value)
    {
        if (value == null)
            return "N/A";

        var number = Convert.ToDouble(value, CultureInfo.InvariantCulture);
        return double.IsNaN(number) || double.IsInfinity(number)
            ? "N/A"
            : number.ToString("G8", CultureInfo.InvariantCulture);
    }

    private static void PrintTable(List<string[]> rows)
    {
        var widths = Enumerable.Range(0, rows[0].Length)
            .Select(column => rows.Max(row => row[column].Length)).ToArray();
        var separator = "+-" + string.Join("-+-", widths.Select(width => new string('-', width))) + "-+";
        Console.WriteLine(separator);
        for (var i = 0; i < rows.Count; i++)
        {
            Console.WriteLine("| " + string.Join(" | ", rows[i].Select((cell, column) =>
                i == 0 || column == 0 || column == widths.Length - 1
                    ? cell.PadRight(widths[column])
                    : cell.PadLeft(widths[column]))) + " |");
            if (i == 0)
                Console.WriteLine(separator);
        }
        Console.WriteLine(separator);
    }

    private static void PrintPhaseTable(IFlowsheet simulation, ISimulationObject[] streams,
        string name, int phaseId, int firstProperty, int propertyCount)
    {
        var phases = streams.Select(stream => ((IMaterialStream)stream).Phases[phaseId]).ToArray();
        var present = phases.Select(phase => phaseId == 0 || phase.Properties.molarfraction.GetValueOrDefault() > 0)
            .ToArray();
        var rows = new List<string[]>
        {
            new[] { "Property", "Feed (2)", "Vapor outlet (8)", "Liquid outlet (18)", "Units" },
        };

        for (var i = firstProperty; i < firstProperty + propertyCount; i++)
        {
            var property = "PROP_MS_" + i;
            var unit = streams[0].GetPropertyUnit(property, null);
            rows.Add(new[]
            {
                simulation.GetTranslatedString(property),
                present[0] ? FormatValue(streams[0].GetPropertyValue(property, null)) : "N/A",
                present[1] ? FormatValue(streams[1].GetPropertyValue(property, null)) : "N/A",
                present[2] ? FormatValue(streams[2].GetPropertyValue(property, null)) : "N/A",
                string.IsNullOrEmpty(unit) ? "-" : unit,
            });
        }

        foreach (var compound in phases[0].Compounds.Keys)
        {
            rows.Add(new[]
            {
                "Mole fraction / " + compound,
                present[0] ? FormatValue(phases[0].Compounds[compound].MoleFraction) : "N/A",
                present[1] ? FormatValue(phases[1].Compounds[compound].MoleFraction) : "N/A",
                present[2] ? FormatValue(phases[2].Compounds[compound].MoleFraction) : "N/A",
                "-",
            });
        }

        Console.WriteLine();
        Console.WriteLine(name);
        PrintTable(rows);
    }

    private static void PrintStreamProperties(IFlowsheet simulation, params ICapeThermoMaterialObject[] streams)
    {
        var simulationObjects = streams.Cast<ISimulationObject>().ToArray();
        PrintPhaseTable(simulation, simulationObjects, "Overall / Mixture", 0, 0, 12);
        PrintPhaseTable(simulation, simulationObjects, "Vapor phase", 2, 12, 18);
        PrintPhaseTable(simulation, simulationObjects, "Liquid phase (combined)", 1, 30, 18);
        Console.WriteLine("N/A = absent phase or unavailable/non-finite value; '-' = dimensionless.");
        Console.WriteLine();
    }

    private static void Run(string flowsheetPath)
    {
        var automation = new DWSIM.Automation.Automation3();
        try
        {
            Console.WriteLine("Loading flowsheet: " + flowsheetPath);
            var simulation = automation.LoadFlowsheet(flowsheetPath);
            var feed = GetStream(simulation, "2");
            var vaporOutlet = GetStream(simulation, "8");
            var liquidOutlet = GetStream(simulation, "18");
            var flows = new[] { 170.0, 180.0, 190.0, 200.0 };

            for (var i = 0; i < flows.Length; i++)
            {
                feed.SetProp("totalflow", "overall", null, "", "mass", new[] { flows[i] });
                Console.WriteLine("Running simulation with F = {0} kg/s, please wait...", flows[i]);
                var errors = automation.CalculateFlowsheet4(simulation);
                if (errors.Count > 0)
                    throw new AggregateException("Error solving flowsheet.", errors);
                if (!simulation.Solved)
                    throw new InvalidOperationException("Error solving flowsheet: " + simulation.ErrorMessage);

                var vaporFlow = GetMassFlow(vaporOutlet);
                var liquidFlow = GetMassFlow(liquidOutlet);
                Console.WriteLine("Simulation run #{0} results:", i + 1);
                Console.WriteLine("Feed: {0:G12}, Vapor: {1:G12}, Liquid: {2:G12} kg/s",
                    flows[i], vaporFlow, liquidFlow);
                Console.WriteLine("Mass balance error: {0:G12} kg/s", flows[i] - vaporFlow - liquidFlow);
                PrintStreamProperties(simulation, feed, vaporOutlet, liquidOutlet);
            }

            Console.WriteLine("Finished OK!");
        }
        finally
        {
            automation.ReleaseResources();
        }
    }

    [STAThread]
    public static int Main(string[] args)
    {
        Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
        Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;
        try
        {
            if (args.Length != 2)
                throw new ArgumentException("Usage: CavettExample.exe <runtime-directory> <flowsheet-path>");

            var runtimeDirectory = Path.GetFullPath(args[0]);
            var flowsheetPath = Path.GetFullPath(args[1]);
            if (!File.Exists(flowsheetPath))
                throw new FileNotFoundException("Cavett flowsheet was not found.", flowsheetPath);

            Directory.SetCurrentDirectory(runtimeDirectory);
            Run(flowsheetPath);
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error);
            return 1;
        }
    }
}
