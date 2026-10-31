using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using DWSIM.Automation;
using DWSIM.Interfaces;
using DWSIM.Interfaces.Enums.GraphicObjects;

public static class FlowsheetSimulation
{
    private static readonly Regex PathSegment = new Regex(
        @"\G(?:\.?(?<name>[A-Za-z_]\w*)|\[(?<index>\d+)\]|\[""(?<key>[^""]*)""\])"
    );

    private static ObjectType ToObjectType(string unitType)
    {
        switch (unitType)
        {
            case "MaterialStream":
                return ObjectType.MaterialStream;
            case "EnergyStream":
                return ObjectType.EnergyStream;
            case "Valve":
                return ObjectType.Valve;
            case "Compressor":
                return ObjectType.Compressor;
            case "Expander":
                return ObjectType.Expander;
            case "Pump":
                return ObjectType.Pump;
            case "Mixer":
                return ObjectType.NodeIn;
            case "Splitter":
                return ObjectType.NodeOut;
            case "Recycle":
                return ObjectType.OT_Recycle;
            case "Cooler":
                return ObjectType.Cooler;
            case "HeatExchanger":
                return ObjectType.HeatExchanger;
            case "Heater":
                return ObjectType.Heater;
            case "SeparatorVessel":
                return ObjectType.Vessel;
            case "AbsorptionColumn":
                return ObjectType.AbsorptionColumn;
            case "DistillationColumn":
                return ObjectType.DistillationColumn;
            case "CSTR":
                return ObjectType.RCT_CSTR;
            case "ConversionReactor":
                return ObjectType.RCT_Conversion;
            case "EquilibriumReactor":
                return ObjectType.RCT_Equilibrium;
            case "GibbsReactor":
                return ObjectType.RCT_Gibbs;
            case "PFR":
                return ObjectType.RCT_PFR;
            default:
                throw new WorkerException(
                    "unsupported_unit_operation",
                    "Unit operation '" + unitType + "' is not supported by the DWSIM worker."
                );
        }
    }

    private static string ResolvePropertyPackageName(Automation3 automation, string id)
    {
        var names = automation.AvailablePropertyPackages.Keys;
        var alias = DwsimRuntime.PropertyPackageAliases.ContainsKey(id)
            ? DwsimRuntime.PropertyPackageAliases[id]
            : id;
        var match = names.FirstOrDefault(name =>
            string.Equals(name, id, StringComparison.OrdinalIgnoreCase)
            || string.Equals(name, alias, StringComparison.OrdinalIgnoreCase)
        );
        if (match == null)
        {
            throw new WorkerException(
                "property_package_not_found",
                "DWSIM property package '" + id + "' is not available."
            );
        }

        return match;
    }

    private static object ConvertValue(object value, Type type)
    {
        var target = Nullable.GetUnderlyingType(type) ?? type;
        if (target.IsEnum)
        {
            return value is string text
                ? Enum.Parse(target, text, true)
                : Enum.ToObject(target, Convert.ToInt32(value, CultureInfo.InvariantCulture));
        }

        return Convert.ChangeType(value, target, CultureInfo.InvariantCulture);
    }

    private static PropertyInfo FindProperty(object target, string name)
    {
        return target
            .GetType()
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(property =>
                property.Name == name && property.GetIndexParameters().Length == 0
            );
    }

    private static object GetMember(object target, string name)
    {
        var property = FindProperty(target, name);
        if (property != null)
            return property.GetValue(target, null);

        var field = target.GetType().GetField(name, BindingFlags.Public | BindingFlags.Instance);
        if (field != null)
            return field.GetValue(target);

        throw new WorkerException(
            "unknown_property",
            "DWSIM object '" + target.GetType().Name + "' has no property '" + name + "'."
        );
    }

    private static void SetMember(object target, string name, object value)
    {
        var property = FindProperty(target, name);
        if (property != null && property.CanWrite)
        {
            property.SetValue(target, ConvertValue(value, property.PropertyType), null);
            return;
        }

        var field = target.GetType().GetField(name, BindingFlags.Public | BindingFlags.Instance);
        if (field != null)
        {
            field.SetValue(target, ConvertValue(value, field.FieldType));
            return;
        }

        throw new WorkerException(
            "unknown_property",
            "DWSIM object '" + target.GetType().Name + "' has no writable property '" + name + "'."
        );
    }

    private static object GetItem(object target, object key)
    {
        if (target is IDictionary dictionary && dictionary.Contains(key))
            return dictionary[key];
        if (target is IList list && key is int index && index < list.Count)
            return list[index];

        throw new WorkerException(
            "unknown_property",
            "DWSIM collection has no item '" + key + "'."
        );
    }

    private static void SetPropertyPath(object target, string path, object value)
    {
        var segments = PathSegment.Matches(path).Cast<Match>().ToList();
        if (segments.Sum(segment => segment.Length) != path.Length || !segments.Last().Groups["name"].Success)
        {
            throw new WorkerException("invalid_property", "Invalid DWSIM property path '" + path + "'.");
        }

        var current = target;
        foreach (var segment in segments.Take(segments.Count - 1))
        {
            if (segment.Groups["name"].Success)
                current = GetMember(current, segment.Groups["name"].Value);
            else if (segment.Groups["index"].Success)
                current = GetItem(current, int.Parse(segment.Groups["index"].Value, CultureInfo.InvariantCulture));
            else
                current = GetItem(current, segment.Groups["key"].Value);
        }

        SetMember(current, segments.Last().Groups["name"].Value, value);
    }

    private static void ApplyProperties(ISimulationObject simulationObject, FlowsheetObjectInput input)
    {
        foreach (var property in input.Properties)
        {
            try
            {
                SetPropertyPath(simulationObject, property.Key, property.Value);
            }
            catch (WorkerException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new WorkerException(
                    "invalid_property",
                    input.Tag + ": could not set '" + property.Key + "': " + (ex.InnerException ?? ex).Message
                );
            }
        }
    }

    private static void NormalizeComposition(IMaterialStream stream)
    {
        var fractions = stream.Phases[0].Compounds.Values
            .Select(compound => compound.MoleFraction.GetValueOrDefault())
            .ToArray();
        var total = fractions.Sum();
        if (total > 0)
            stream.SetOverallComposition(fractions.Select(fraction => fraction / total).ToArray());
    }

    private static Dictionary<string, double> ToMoleFractions(IPhase phase)
    {
        return phase.Compounds.ToDictionary(
            compound => compound.Key,
            compound => compound.Value.MoleFraction.GetValueOrDefault()
        );
    }

    private static Dictionary<string, object> ToPhaseResult(IPhase phase)
    {
        return new Dictionary<string, object>
        {
            { "fraction", phase.Properties.molarfraction.GetValueOrDefault() },
            { "moleFractions", ToMoleFractions(phase) },
        };
    }

    private static Dictionary<string, object> ToStreamResult(IMaterialStream stream)
    {
        var phases = new Dictionary<string, object>();
        foreach (var phase in new[] { Tuple.Create(2, "vapor"), Tuple.Create(3, "liquid1"), Tuple.Create(4, "liquid2") })
        {
            if (stream.Phases[phase.Item1].Properties.molarfraction.GetValueOrDefault() > 0)
                phases[phase.Item2] = ToPhaseResult(stream.Phases[phase.Item1]);
        }

        return new Dictionary<string, object>
        {
            { "temperatureK", stream.GetTemperature() },
            { "pressurePa", stream.GetPressure() },
            { "massFlowKgPerS", stream.GetMassFlow() },
            { "molarFlowMolPerS", stream.GetMolarFlow() },
            { "massEnthalpyJPerKg", stream.GetMassEnthalpy() * 1000 },
            { "vaporFraction", stream.Phases[2].Properties.molarfraction.GetValueOrDefault() },
            { "moleFractions", ToMoleFractions(stream.Phases[0]) },
            { "phases", phases },
        };
    }

    private static Dictionary<string, object> ToObjectResult(ISimulationObject simulationObject)
    {
        var result = new Dictionary<string, object>
        {
            { "tag", simulationObject.GraphicObject.Tag },
            { "calculated", simulationObject.Calculated },
            { "errorMessage", simulationObject.ErrorMessage ?? "" },
        };
        if (simulationObject is IMaterialStream stream && simulationObject.Calculated)
            result["stream"] = ToStreamResult(stream);
        if (simulationObject is IEnergyStream energy && simulationObject.Calculated)
            result["energyFlowW"] = energy.GetEnergyFlow() * 1000;
        return result;
    }

    private static IFlowsheet Build(Automation3 automation, SolveFlowsheetRequest request)
    {
        var flowsheet = automation.CreateFlowsheet();
        foreach (var compoundId in request.CompoundIds)
        {
            if (!automation.AvailableCompounds.ContainsKey(compoundId))
            {
                throw new WorkerException(
                    "compound_not_found",
                    "DWSIM compound '" + compoundId + "' is not available."
                );
            }
            flowsheet.AddCompound(compoundId);
        }
        var propertyPackage = flowsheet.CreateAndAddPropertyPackage(
            ResolvePropertyPackageName(automation, request.PropertyPackageId)
        );

        var objects = new Dictionary<string, ISimulationObject>();
        foreach (var input in request.Objects)
        {
            var simulationObject = flowsheet.AddObject(
                ToObjectType(input.UnitType),
                (int)input.X,
                (int)input.Y,
                input.Id,
                input.Tag
            );
            simulationObject.PropertyPackage = propertyPackage;
            objects[input.Id] = simulationObject;
        }

        foreach (var input in request.Objects)
        {
            ApplyProperties(objects[input.Id], input);
            if (objects[input.Id] is IMaterialStream stream)
                NormalizeComposition(stream);
        }

        foreach (var connection in request.Connections)
        {
            if (!objects.ContainsKey(connection.From) || !objects.ContainsKey(connection.To))
            {
                throw new WorkerException(
                    "invalid_connection",
                    "Connection references a node that is not in the flowsheet."
                );
            }
            var from = objects[connection.From];
            var to = objects[connection.To];
            try
            {
                flowsheet.ConnectObjects(from.GraphicObject, to.GraphicObject, connection.FromPort, connection.ToPort);
            }
            catch (Exception ex)
            {
                throw new WorkerException(
                    "invalid_connection",
                    from.GraphicObject.Tag + " -> " + to.GraphicObject.Tag + ": " + ex.Message
                );
            }
        }

        return flowsheet;
    }

    public static object Solve(SolveFlowsheetRequest request)
    {
        var automation = new Automation3();
        try
        {
            var flowsheet = Build(automation, request);
            DWSIM.GlobalSettings.Settings.SolverMode = 0;
            var errors = automation.CalculateFlowsheet4(flowsheet);
            var objects = flowsheet.SimulationObjects.Values.ToDictionary(
                simulationObject => simulationObject.Name,
                simulationObject => (object)ToObjectResult(simulationObject)
            );

            return new Dictionary<string, object>
            {
                { "solved", errors.Count == 0 && flowsheet.Solved },
                {
                    "errors",
                    errors
                        .Select(error => (error.InnerException ?? error).Message)
                        .Concat(string.IsNullOrEmpty(flowsheet.ErrorMessage) ? new string[0] : new[] { flowsheet.ErrorMessage })
                        .Distinct()
                        .ToArray()
                },
                { "objects", objects },
            };
        }
        finally
        {
            automation.ReleaseResources();
        }
    }
}


public static class AutomationRuntime
{
    private static string directory;

    private static string ResolveDirectory()
    {
        var configured = Environment.GetEnvironmentVariable("DWSIM_AUTOMATION_RUNTIME");
        var candidate = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(AppContext.BaseDirectory, "cavett-runtime")
            : configured;
        if (!File.Exists(Path.Combine(candidate, "DWSIM.Automation.dll")))
        {
            throw new WorkerException(
                "dwsim_automation_not_configured",
                "DWSIM Automation runtime was not found at '"
                    + candidate
                    + "'. Set DWSIM_AUTOMATION_RUNTIME to a full DWSIM Mono bundle."
            );
        }

        return Path.GetFullPath(candidate);
    }

    private static Assembly ResolveDependency(object sender, ResolveEventArgs args)
    {
        var candidate = Path.Combine(directory, new AssemblyName(args.Name).Name + ".dll");
        return File.Exists(candidate) ? Assembly.LoadFrom(candidate) : null;
    }

    private static void Load()
    {
        if (directory != null)
            return;

        directory = ResolveDirectory();
        AppDomain.CurrentDomain.AssemblyResolve += ResolveDependency;
        Directory.SetCurrentDirectory(directory);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static object SolveLoadedFlowsheet(SolveFlowsheetRequest request)
    {
        return FlowsheetSimulation.Solve(request);
    }

    public static object SolveFlowsheet(SolveFlowsheetRequest request)
    {
        Load();
        return SolveLoadedFlowsheet(request);
    }
}
