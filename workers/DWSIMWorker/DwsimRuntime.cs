using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using DWSIM.Thermodynamics.BaseClasses;
using DWSIM.Thermodynamics.CalculatorInterface;

public sealed class DwsimRuntime
{
    internal static readonly Dictionary<string, string> PropertyPackageAliases = new Dictionary<
        string,
        string
    >(StringComparer.OrdinalIgnoreCase)
    {
        { "peng-robinson", "Peng-Robinson (PR)" },
        { "pr", "Peng-Robinson (PR)" },
        { "srk", "Soave-Redlich-Kwong (SRK)" },
        { "nrtl", "NRTL" },
        { "unifac", "UNIFAC" },
        { "ideal", "Raoult's Law" },
    };

    private Calculator calculator;

    private static double ToDouble(object value)
    {
        return value == null ? 0 : Convert.ToDouble(value, CultureInfo.InvariantCulture);
    }

    private static Dictionary<string, object> ToCompoundSummary(ConstantProperties compound)
    {
        var source = string.IsNullOrWhiteSpace(compound.CurrentDB)
            ? compound.OriginalDB ?? ""
            : compound.CurrentDB;

        return new Dictionary<string, object>
        {
            { "id", compound.Name },
            { "name", compound.Name },
            { "formula", compound.Formula ?? "" },
            { "category", source },
            { "source", source },
        };
    }

    private Calculator Calculator
    {
        get
        {
            if (calculator != null)
                return calculator;

            var created = new Calculator();
            try
            {
                created.Initialize();
            }
            catch (Exception ex)
            {
                throw new WorkerException(
                    "dwsim_initialization_failed",
                    "DWSIM calculator failed to initialize: " + ex.Message
                );
            }

            calculator = created;
            return calculator;
        }
    }

    private void ValidateFlashRequest(FlashRequest request)
    {
        if (request.MoleFractions.Length != request.CompoundIds.Length)
        {
            throw new WorkerException(
                "invalid_composition",
                "moleFractions must match compoundIds length."
            );
        }
    }

    private string ResolvePropertyPackageName(string id)
    {
        var names = Calculator.GetPropPackList();
        var match = names.FirstOrDefault(name =>
            string.Equals(name, id, StringComparison.OrdinalIgnoreCase)
        );
        if (match != null)
            return match;

        if (PropertyPackageAliases.ContainsKey(id))
        {
            match = names.FirstOrDefault(name =>
                string.Equals(name, PropertyPackageAliases[id], StringComparison.OrdinalIgnoreCase)
            );
            if (match != null)
                return match;
        }

        throw new WorkerException(
            "property_package_not_found",
            "DWSIM property package '" + id + "' is not available."
        );
    }

    private void ValidateSelection(ThermoSelection selection, out string packageName)
    {
        if (selection.CompoundIds == null || selection.CompoundIds.Length == 0)
        {
            throw new WorkerException("missing_compounds", "at least one compound is required.");
        }

        foreach (var compoundId in selection.CompoundIds)
        {
            if (!Calculator.AvailableCompounds.ContainsKey(compoundId))
            {
                throw new WorkerException(
                    "compound_not_found",
                    "DWSIM compound '" + compoundId + "' is not available."
                );
            }
        }

        packageName = ResolvePropertyPackageName(selection.PropertyPackageId);
        Calculator.GetPropPackInstance(packageName);
    }

    private List<Dictionary<string, object>> ToPhaseResults(object[,] matrix, string[] compoundIds)
    {
        var phases = new List<Dictionary<string, object>>();
        for (var column = 0; column < matrix.GetLength(1); column++)
        {
            var moleFractions = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            for (var row = 0; row < compoundIds.Length; row++)
            {
                moleFractions[compoundIds[row]] = ToDouble(matrix[row + 2, column]);
            }

            phases.Add(
                new Dictionary<string, object>
                {
                    { "name", Convert.ToString(matrix[0, column], CultureInfo.InvariantCulture) },
                    { "fraction", ToDouble(matrix[1, column]) },
                    { "moleFractions", moleFractions },
                }
            );
        }

        return phases;
    }

    public object ListCompounds()
    {
        return Calculator
            .AvailableCompounds.Values.Select(ToCompoundSummary)
            .OrderBy(
                compound => Convert.ToString(compound["name"], CultureInfo.InvariantCulture),
                StringComparer.OrdinalIgnoreCase
            )
            .ToArray();
    }

    public object ListPropertyPackages()
    {
        return Calculator
            .GetPropPackList()
            .Select(name => new Dictionary<string, object>
            {
                { "id", name },
                { "name", name },
                { "description", name },
            })
            .OrderBy(
                package => Convert.ToString(package["name"], CultureInfo.InvariantCulture),
                StringComparer.OrdinalIgnoreCase
            )
            .ToArray();
    }

    public object ValidateSelection(ThermoSelection selection)
    {
        ValidateSelection(selection, out _);
        return new Dictionary<string, object> { { "valid", true } };
    }

    public object CalculatePTFlash(FlashRequest request)
    {
        ValidateSelection(request, out var packageName);
        ValidateFlashRequest(request);

        var matrix = Calculator.PTFlash(
            packageName,
            0,
            request.PressurePa,
            request.TemperatureK,
            request.CompoundIds,
            request.MoleFractions
        );
        if (matrix == null)
        {
            throw new WorkerException(
                "invalid_flash_result",
                "DWSIM returned an invalid PT flash result."
            );
        }

        var phases = ToPhaseResults(matrix, request.CompoundIds);
        var vaporFraction = phases
            .Where(phase =>
                Convert
                    .ToString(phase["name"], CultureInfo.InvariantCulture)
                    .IndexOf("vapor", StringComparison.OrdinalIgnoreCase) >= 0
            )
            .Select(phase => Convert.ToDouble(phase["fraction"], CultureInfo.InvariantCulture))
            .FirstOrDefault();

        return new Dictionary<string, object>
        {
            { "temperatureK", request.TemperatureK },
            { "pressurePa", request.PressurePa },
            { "vaporFraction", vaporFraction },
            { "phases", phases },
        };
    }
}
