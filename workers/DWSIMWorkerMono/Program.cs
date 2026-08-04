using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web.Script.Serialization;

public static class Program
{
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
    private static readonly DwsimRuntime Runtime = new DwsimRuntime();

    public static void Main()
    {
        string line;
        while ((line = Console.ReadLine()) != null)
        {
            Dictionary<string, object> request;
            try
            {
                request = Json.Deserialize<Dictionary<string, object>>(line);
            }
            catch (Exception ex)
            {
                WriteResponse("2.0", null, Error("invalid_request", ex.Message), 0);
                continue;
            }

            var id = request.ContainsKey("id") ? Convert.ToInt32(request["id"], CultureInfo.InvariantCulture) : 0;
            var method = request.ContainsKey("method") ? Convert.ToString(request["method"], CultureInfo.InvariantCulture) : "";
            var parameters = request.ContainsKey("params") ? request["params"] as Dictionary<string, object> : null;

            try
            {
                object result;
                switch (method)
                {
                    case "ListCompounds":
                        result = Runtime.ListCompounds();
                        break;
                    case "ListPropertyPackages":
                        result = Runtime.ListPropertyPackages();
                        break;
                    case "ValidateThermoSelection":
                        result = Runtime.ValidateSelection(ParseSelection(parameters));
                        break;
                    case "CalculatePTFlash":
                        result = Runtime.CalculatePTFlash(ParseFlashRequest(parameters));
                        break;
                    default:
                        throw new WorkerException("unknown_method", "Unknown DWSIM worker method '" + method + "'.");
                }

                WriteResponse("2.0", result, null, id);
            }
            catch (WorkerException ex)
            {
                WriteResponse("2.0", null, Error(ex.Code, ex.Message), id);
            }
            catch (TargetInvocationException ex)
            {
                WriteResponse("2.0", null, Error("dwsim_error", ex.InnerException != null ? ex.InnerException.Message : ex.Message), id);
            }
            catch (Exception ex)
            {
                WriteResponse("2.0", null, Error("dwsim_error", ex.Message), id);
            }
        }
    }

    private static void WriteResponse(string jsonrpc, object result, object error, int id)
    {
        Console.WriteLine(Json.Serialize(new Dictionary<string, object>
        {
            { "jsonrpc", jsonrpc },
            { "result", result },
            { "error", error },
            { "id", id },
        }));
    }

    private static Dictionary<string, string> Error(string code, string message)
    {
        return new Dictionary<string, string> { { "code", code }, { "message", message } };
    }

    private static string RequiredString(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        var value = Convert.ToString(parameters[name], CultureInfo.InvariantCulture);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new WorkerException("invalid_param", "'" + name + "' must be a non-empty string.");
        }

        return value;
    }

    private static ThermoSelection ParseSelection(Dictionary<string, object> parameters)
    {
        return new ThermoSelection
        {
            PropertyPackageId = RequiredString(parameters, "propertyPackageId"),
            CompoundIds = RequiredStringArray(parameters, "compoundIds"),
        };
    }

    private static FlashRequest ParseFlashRequest(Dictionary<string, object> parameters)
    {
        return new FlashRequest
        {
            PropertyPackageId = RequiredString(parameters, "propertyPackageId"),
            CompoundIds = RequiredStringArray(parameters, "compoundIds"),
            MoleFractions = RequiredDoubleArray(parameters, "moleFractions"),
            TemperatureK = RequiredDouble(parameters, "temperatureK"),
            PressurePa = RequiredDouble(parameters, "pressurePa"),
        };
    }

    private static string[] RequiredStringArray(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name) || !(parameters[name] is ArrayList values))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        return values.Cast<object>().Select(value => Convert.ToString(value, CultureInfo.InvariantCulture)).ToArray();
    }

    private static double[] RequiredDoubleArray(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name) || !(parameters[name] is ArrayList values))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        return values.Cast<object>().Select(value => Convert.ToDouble(value, CultureInfo.InvariantCulture)).ToArray();
    }

    private static double RequiredDouble(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        return Convert.ToDouble(parameters[name], CultureInfo.InvariantCulture);
    }
}

public sealed class DwsimRuntime
{
    private object calculator;
    private Type calculatorType;
    private string assemblyDirectory;

    public object ListCompounds()
    {
        return GetAvailableCompounds()
            .Values
            .Cast<object>()
            .Select(ToCompoundSummary)
            .OrderBy(compound => Convert.ToString(compound["name"], CultureInfo.InvariantCulture), StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public object ListPropertyPackages()
    {
        return GetPropertyPackageNames()
            .Select(name => new Dictionary<string, object>
            {
                { "id", name },
                { "name", name },
                { "description", name },
            })
            .OrderBy(package => Convert.ToString(package["name"], CultureInfo.InvariantCulture), StringComparer.OrdinalIgnoreCase)
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
        if (request.MoleFractions.Length != request.CompoundIds.Length)
        {
            throw new WorkerException("invalid_composition", "moleFractions must match compoundIds length.");
        }

        var method = CalculatorType.GetMethods()
            .FirstOrDefault(candidate => candidate.Name == "PTFlash" && candidate.GetParameters().Length >= 6);
        if (method == null)
        {
            throw new WorkerException("dwsim_method_unavailable", "DWSIM PTFlash API was not found.");
        }

        var args = new object[]
        {
            packageName,
            0,
            request.PressurePa,
            request.TemperatureK,
            request.CompoundIds,
            request.MoleFractions,
            null,
            null,
            null,
            null,
        };

        var raw = method.Invoke(Calculator, args.Take(method.GetParameters().Length).ToArray());
        var matrix = raw as Array;
        if (matrix == null || matrix.Rank != 2)
        {
            throw new WorkerException("invalid_flash_result", "DWSIM returned an invalid PT flash result.");
        }

        var phases = new List<Dictionary<string, object>>();
        for (var column = 0; column < matrix.GetLength(1); column++)
        {
            var moleFractions = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            for (var row = 0; row < request.CompoundIds.Length; row++)
            {
                moleFractions[request.CompoundIds[row]] = ToDouble(matrix.GetValue(row + 2, column));
            }

            phases.Add(new Dictionary<string, object>
            {
                { "name", Convert.ToString(matrix.GetValue(0, column), CultureInfo.InvariantCulture) },
                { "fraction", ToDouble(matrix.GetValue(1, column)) },
                { "moleFractions", moleFractions },
            });
        }

        var vaporFraction = phases
            .Where(phase => Convert.ToString(phase["name"], CultureInfo.InvariantCulture).IndexOf("vapor", StringComparison.OrdinalIgnoreCase) >= 0)
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

    private void ValidateSelection(ThermoSelection selection, out string packageName)
    {
        var compounds = GetAvailableCompounds();
        if (selection.CompoundIds == null || selection.CompoundIds.Length == 0)
        {
            throw new WorkerException("missing_compounds", "at least one compound is required.");
        }

        foreach (var compoundId in selection.CompoundIds)
        {
            if (!compounds.Contains(compoundId))
            {
                throw new WorkerException("compound_not_found", "DWSIM compound '" + compoundId + "' is not available.");
            }
        }

        packageName = ResolvePropertyPackageName(selection.PropertyPackageId);
        InvokeCalculator("GetPropPackInstance", packageName);
    }

    private string[] GetPropertyPackageNames()
    {
        var raw = InvokeCalculator("GetPropPackList");
        return ((IEnumerable)raw).Cast<object>().Select(value => Convert.ToString(value, CultureInfo.InvariantCulture)).ToArray();
    }

    private string ResolvePropertyPackageName(string id)
    {
        var names = GetPropertyPackageNames();
        var match = names.FirstOrDefault(name => string.Equals(name, id, StringComparison.OrdinalIgnoreCase));
        if (match != null) return match;

        var aliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "peng-robinson", "Peng-Robinson (PR)" },
            { "pr", "Peng-Robinson (PR)" },
            { "srk", "Soave-Redlich-Kwong (SRK)" },
            { "nrtl", "NRTL" },
            { "unifac", "UNIFAC" },
            { "ideal", "Raoult's Law" },
        };

        if (aliases.ContainsKey(id))
        {
            match = names.FirstOrDefault(name => string.Equals(name, aliases[id], StringComparison.OrdinalIgnoreCase));
            if (match != null) return match;
        }

        throw new WorkerException("property_package_not_found", "DWSIM property package '" + id + "' is not available.");
    }

    private IDictionary GetAvailableCompounds()
    {
        return (IDictionary)CalculatorType.GetProperty("AvailableCompounds").GetValue(Calculator, null);
    }

    private object InvokeCalculator(string methodName, params object[] args)
    {
        var method = CalculatorType.GetMethods().FirstOrDefault(candidate => candidate.Name == methodName && candidate.GetParameters().Length == args.Length);
        if (method == null)
        {
            throw new WorkerException("dwsim_method_unavailable", "DWSIM method '" + methodName + "' was not found.");
        }

        return method.Invoke(Calculator, args);
    }

    private object Calculator
    {
        get
        {
            if (calculator != null) return calculator;

            var assemblyPath = ResolveDwsimAssemblyPath();
            assemblyDirectory = Path.GetDirectoryName(assemblyPath);
            AppDomain.CurrentDomain.AssemblyResolve += ResolveDependency;

            var assembly = Assembly.LoadFrom(assemblyPath);
            calculatorType = assembly.GetType("DWSIM.Thermodynamics.CalculatorInterface.Calculator");
            if (calculatorType == null)
            {
                throw new WorkerException("dwsim_api_unavailable", "DWSIM calculator type was not found.");
            }

            calculator = Activator.CreateInstance(calculatorType);
            InvokeCalculator("Initialize");
            return calculator;
        }
    }

    private Type CalculatorType
    {
        get
        {
            var _ = Calculator;
            return calculatorType;
        }
    }

    private Assembly ResolveDependency(object sender, ResolveEventArgs args)
    {
        var name = new AssemblyName(args.Name).Name + ".dll";
        var candidate = Path.Combine(assemblyDirectory, name);
        return File.Exists(candidate) ? Assembly.LoadFrom(candidate) : null;
    }

    private static string ResolveDwsimAssemblyPath()
    {
        var configured = Environment.GetEnvironmentVariable("FUGACITY_DWSIM_ASSEMBLY");
        if (!string.IsNullOrWhiteSpace(configured))
        {
            if (!File.Exists(configured))
            {
                throw new WorkerException("dwsim_assembly_not_found", "DWSIM assembly was not found at '" + configured + "'.");
            }

            return Path.GetFullPath(configured);
        }

        var appRoot = Environment.GetEnvironmentVariable("FUGACITY_APP_ROOT") ?? AppContext.BaseDirectory;
        var candidate = Path.Combine(appRoot, "dwsim-runtime", "DWSIM.Thermodynamics.dll");
        if (File.Exists(candidate))
        {
            return Path.GetFullPath(candidate);
        }

        throw new WorkerException(
            "dwsim_not_configured",
            "DWSIM.Thermodynamics.dll was not found. Configure FUGACITY_DWSIM_ASSEMBLY or place it in a dwsim-runtime folder "
                + "beside FUGACITY_APP_ROOT. Searched: " + candidate
        );
    }

    private static Dictionary<string, object> ToCompoundSummary(object compound)
    {
        var name = GetStringProperty(compound, "Name");
        var source = GetStringProperty(compound, "CurrentDB");
        if (string.IsNullOrWhiteSpace(source)) source = GetStringProperty(compound, "OriginalDB");

        return new Dictionary<string, object>
        {
            { "id", name },
            { "name", name },
            { "formula", GetStringProperty(compound, "Formula") },
            { "category", source },
            { "source", source },
        };
    }

    private static string GetStringProperty(object target, string name)
    {
        var property = target.GetType().GetProperty(name);
        if (property == null) return "";
        var value = property.GetValue(target, null);
        return value == null ? "" : Convert.ToString(value, CultureInfo.InvariantCulture);
    }

    private static double ToDouble(object value)
    {
        return value == null ? 0 : Convert.ToDouble(value, CultureInfo.InvariantCulture);
    }
}

public class ThermoSelection
{
    public string PropertyPackageId;
    public string[] CompoundIds;
}

public sealed class FlashRequest : ThermoSelection
{
    public double[] MoleFractions;
    public double TemperatureK;
    public double PressurePa;
}

public sealed class WorkerException : Exception
{
    public WorkerException(string code, string message) : base(message)
    {
        Code = code;
    }

    public string Code { get; private set; }
}
