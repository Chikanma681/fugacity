using System.Collections;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;

var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
var runtime = new DwsimRuntime();

while (Console.ReadLine() is { } line)
{
    JsonRpcRequest? request;
    try
    {
        request = JsonSerializer.Deserialize<JsonRpcRequest>(line, jsonOptions);
    }
    catch (Exception ex)
    {
        WriteResponse(new JsonRpcResponse("2.0", null, new JsonRpcError("invalid_request", ex.Message), 0));
        continue;
    }

    if (request is null)
    {
        continue;
    }

    try
    {
        var result = request.Method switch
        {
            "ListCompounds" => runtime.ListCompounds(),
            "GetCompound" => runtime.GetCompound(GetRequiredStringParam(request.Params, "id")),
            "ListPropertyPackages" => runtime.ListPropertyPackages(),
            "ValidateThermoSelection" => runtime.ValidateThermoSelection(ParseParams<ThermoSelection>(request.Params)),
            "CalculatePTFlash" => runtime.CalculatePTFlash(ParseParams<FlashRequest>(request.Params)),
            _ => throw new WorkerException("unknown_method", $"Unknown DWSIM worker method '{request.Method}'."),
        };

        WriteResponse(new JsonRpcResponse("2.0", result, null, request.Id));
    }
    catch (WorkerException ex)
    {
        WriteResponse(new JsonRpcResponse("2.0", null, new JsonRpcError(ex.Code, ex.Message), request.Id));
    }
    catch (TargetInvocationException ex) when (ex.InnerException is not null)
    {
        WriteResponse(new JsonRpcResponse("2.0", null, new JsonRpcError("dwsim_error", ex.InnerException.Message), request.Id));
    }
    catch (Exception ex)
    {
        WriteResponse(new JsonRpcResponse("2.0", null, new JsonRpcError("dwsim_error", ex.Message), request.Id));
    }
}

void WriteResponse(JsonRpcResponse response)
{
    Console.WriteLine(JsonSerializer.Serialize(response, jsonOptions));
}

static T ParseParams<T>(JsonElement? parameters)
{
    if (parameters is null)
    {
        throw new WorkerException("missing_params", "Request parameters are required.");
    }

    var value = parameters.Value.Deserialize<T>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    if (value is null)
    {
        throw new WorkerException("invalid_params", "Request parameters are invalid.");
    }

    return value;
}

static string GetRequiredStringParam(JsonElement? parameters, string name)
{
    if (parameters is null || !parameters.Value.TryGetProperty(name, out var value))
    {
        throw new WorkerException("missing_param", $"'{name}' is required.");
    }

    var result = value.GetString();
    if (string.IsNullOrWhiteSpace(result))
    {
        throw new WorkerException("invalid_param", $"'{name}' must be a non-empty string.");
    }

    return result;
}

sealed class DwsimRuntime
{
    private static readonly IReadOnlyDictionary<string, string> KnownPropertyPackageNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["peng-robinson"] = "Peng-Robinson (PR)",
            ["pr"] = "Peng-Robinson (PR)",
            ["srk"] = "Soave-Redlich-Kwong (SRK)",
            ["nrtl"] = "NRTL",
            ["unifac"] = "UNIFAC",
            ["ideal"] = "Raoult's Law",
            ["raoult"] = "Raoult's Law",
        };

    private object? calculator;
    private Type? calculatorType;
    private string? assemblyDirectory;

    public IReadOnlyList<CompoundSummary> ListCompounds()
    {
        return GetAvailableCompounds()
            .Values
            .Cast<object>()
            .Select(ToCompoundSummary)
            .OrderBy(compound => compound.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public CompoundDetails GetCompound(string id)
    {
        var compounds = GetAvailableCompounds();
        if (!compounds.Contains(id))
        {
            throw new WorkerException("compound_not_found", $"DWSIM compound '{id}' is not available.");
        }

        var compound = compounds[id]!;
        var summary = ToCompoundSummary(compound);
        return new CompoundDetails(
            summary.Id,
            summary.Name,
            summary.Formula,
            summary.Category,
            summary.Source,
            GetStringProperty(compound, "CAS_Number"),
            ToFieldMap(compound)
        );
    }

    public IReadOnlyList<PropertyPackageSummary> ListPropertyPackages()
    {
        var names = GetPropertyPackageNames();
        return names
            .Select(name => new PropertyPackageSummary(ToPropertyPackageId(name), name, name))
            .OrderBy(package => package.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public object ValidateThermoSelection(ThermoSelection selection)
    {
        ValidateSelection(selection, out _);
        return new { valid = true };
    }

    public FlashResult CalculatePTFlash(FlashRequest request)
    {
        ValidateSelection(request, out var packageName);

        if (request.TemperatureK <= 0 || request.PressurePa <= 0)
        {
            throw new WorkerException("invalid_flash_conditions", "temperatureK and pressurePa must be positive.");
        }

        if (request.MoleFractions.Length != request.CompoundIds.Length)
        {
            throw new WorkerException("invalid_composition", "moleFractions must match compoundIds length.");
        }

        var method = GetCalculatorType().GetMethod("PTFlash", new[]
        {
            typeof(string), typeof(int), typeof(double), typeof(double), typeof(string[]), typeof(double[]),
        });

        if (method is null)
        {
            throw new WorkerException("dwsim_method_unavailable", "DWSIM PTFlash API was not found.");
        }

        var raw = method.Invoke(GetCalculator(), new object[]
        {
            packageName,
            0,
            request.PressurePa,
            request.TemperatureK,
            request.CompoundIds,
            request.MoleFractions,
        });

        if (raw is not Array matrix || matrix.Rank != 2)
        {
            throw new WorkerException("invalid_flash_result", "DWSIM returned an invalid PT flash result.");
        }

        var phases = new List<PhaseResult>();
        for (var column = 0; column < matrix.GetLength(1); column++)
        {
            var name = Convert.ToString(matrix.GetValue(0, column)) ?? $"Phase {column + 1}";
            var fraction = ToDouble(matrix.GetValue(1, column));
            var moleFractions = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);

            for (var row = 0; row < request.CompoundIds.Length; row++)
            {
                moleFractions[request.CompoundIds[row]] = ToDouble(matrix.GetValue(row + 2, column));
            }

            phases.Add(new PhaseResult(name, fraction, moleFractions));
        }

        var vaporFraction = phases
            .Where(phase => phase.Name.Contains("vapor", StringComparison.OrdinalIgnoreCase))
            .Select(phase => phase.Fraction)
            .FirstOrDefault();

        return new FlashResult(request.TemperatureK, request.PressurePa, vaporFraction, phases, null);
    }

    private void ValidateSelection(ThermoSelection selection, out string packageName)
    {
        if (string.IsNullOrWhiteSpace(selection.PropertyPackageId))
        {
            throw new WorkerException("missing_property_package", "propertyPackageId is required.");
        }

        if (selection.CompoundIds.Length == 0)
        {
            throw new WorkerException("missing_compounds", "at least one compound is required.");
        }

        var compounds = GetAvailableCompounds();
        foreach (var compoundId in selection.CompoundIds)
        {
            if (!compounds.Contains(compoundId))
            {
                throw new WorkerException("compound_not_found", $"DWSIM compound '{compoundId}' is not available.");
            }
        }

        packageName = ResolvePropertyPackageName(selection.PropertyPackageId);
        _ = InvokeCalculator("GetPropPackInstance", packageName);
    }

    private IDictionary GetAvailableCompounds()
    {
        var property = GetCalculatorType().GetProperty("AvailableCompounds");
        if (property is null)
        {
            throw new WorkerException("dwsim_api_unavailable", "DWSIM AvailableCompounds API was not found.");
        }

        return property.GetValue(GetCalculator()) as IDictionary
            ?? throw new WorkerException("dwsim_api_unavailable", "DWSIM AvailableCompounds did not return a dictionary.");
    }

    private string[] GetPropertyPackageNames()
    {
        var raw = InvokeCalculator("GetPropPackList");
        return raw switch
        {
            string[] values => values,
            IEnumerable values => values.Cast<object>().Select(value => value.ToString() ?? "").Where(value => value != "").ToArray(),
            _ => throw new WorkerException("dwsim_api_unavailable", "DWSIM GetPropPackList returned an invalid result."),
        };
    }

    private string ResolvePropertyPackageName(string id)
    {
        var packages = GetPropertyPackageNames();
        if (packages.Contains(id, StringComparer.OrdinalIgnoreCase))
        {
            return packages.First(name => string.Equals(name, id, StringComparison.OrdinalIgnoreCase));
        }

        if (KnownPropertyPackageNames.TryGetValue(id, out var mappedName)
            && packages.Contains(mappedName, StringComparer.OrdinalIgnoreCase))
        {
            return packages.First(name => string.Equals(name, mappedName, StringComparison.OrdinalIgnoreCase));
        }

        throw new WorkerException("property_package_not_found", $"DWSIM property package '{id}' is not available.");
    }

    private object? InvokeCalculator(string methodName, params object[] parameters)
    {
        var method = GetCalculatorType().GetMethod(methodName, parameters.Select(parameter => parameter.GetType()).ToArray())
            ?? GetCalculatorType().GetMethod(methodName);

        if (method is null)
        {
            throw new WorkerException("dwsim_method_unavailable", $"DWSIM method '{methodName}' was not found.");
        }

        return method.Invoke(GetCalculator(), parameters);
    }

    private object GetCalculator()
    {
        if (calculator is not null)
        {
            return calculator;
        }

        var assemblyPath = ResolveDwsimAssemblyPath();
        assemblyDirectory = Path.GetDirectoryName(assemblyPath);
        AssemblyLoadContext.Default.Resolving += ResolveDependency;

        Assembly assembly;
        try
        {
            assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(assemblyPath);
        }
        catch (Exception ex)
        {
            throw new WorkerException("dwsim_load_failed", $"Failed to load DWSIM assembly '{assemblyPath}': {ex.Message}");
        }

        calculatorType = assembly.GetType("DWSIM.Thermodynamics.CalculatorInterface.Calculator")
            ?? throw new WorkerException("dwsim_api_unavailable", "DWSIM calculator type was not found.");

        calculator = Activator.CreateInstance(calculatorType)
            ?? throw new WorkerException("dwsim_init_failed", "DWSIM calculator could not be created.");

        InvokeCalculator("Initialize");
        return calculator;
    }

    private Type GetCalculatorType()
    {
        _ = GetCalculator();
        return calculatorType!;
    }

    private Assembly? ResolveDependency(AssemblyLoadContext context, AssemblyName name)
    {
        if (assemblyDirectory is null)
        {
            return null;
        }

        var candidate = Path.Combine(assemblyDirectory, name.Name + ".dll");
        return File.Exists(candidate) ? context.LoadFromAssemblyPath(candidate) : null;
    }

    private static string ResolveDwsimAssemblyPath()
    {
        var configuredPath = Environment.GetEnvironmentVariable("FUGACITY_DWSIM_ASSEMBLY")
            ?? Environment.GetEnvironmentVariable("DWSIM_THERMODYNAMICS_ASSEMBLY");

        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            if (!File.Exists(configuredPath))
            {
                throw new WorkerException("dwsim_assembly_not_found", $"DWSIM assembly was not found at '{configuredPath}'.");
            }

            return Path.GetFullPath(configuredPath);
        }

        var root = Environment.GetEnvironmentVariable("FUGACITY_DWSIM_ROOT");
        if (!string.IsNullOrWhiteSpace(root))
        {
            var candidate = Path.Combine(root, "DWSIM.Thermodynamics.dll");
            if (File.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }
        }

        var searchedPaths = GetDefaultDwsimAssemblyPaths().ToArray();
        foreach (var candidate in searchedPaths)
        {
            if (File.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }
        }

        throw new WorkerException(
            "dwsim_not_configured",
            "DWSIM.Thermodynamics.dll was not found. Configure FUGACITY_DWSIM_ASSEMBLY to a compatible DWSIM.Thermodynamics.dll, "
                + "or FUGACITY_DWSIM_ROOT to a directory containing it. A DWSIM source checkout is not enough; the worker needs built runtime DLLs. "
                + "Searched: " + string.Join(", ", searchedPaths)
        );
    }

    private static IEnumerable<string> GetDefaultDwsimAssemblyPaths()
    {
        var workerDirectory = AppContext.BaseDirectory;
        yield return Path.Combine(workerDirectory, "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(workerDirectory, "dwsim", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(workerDirectory, "dwsim-runtime", "DWSIM.Thermodynamics.dll");

        var appRoot = Environment.GetEnvironmentVariable("FUGACITY_APP_ROOT");
        if (string.IsNullOrWhiteSpace(appRoot))
        {
            yield break;
        }

        yield return Path.Combine(appRoot, "dwsim-runtime", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(appRoot, "workers", "DWSIMWorker", "dwsim-runtime", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(appRoot, "..", "dwsim", "DWSIM.Thermodynamics", "bin", "Debug", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(appRoot, "..", "dwsim", "DWSIM.Thermodynamics", "bin", "Release", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(appRoot, "..", "dwsim", "DWSIM.Thermodynamics.StandaloneLibrary", "bin", "Debug", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(appRoot, "..", "dwsim", "DWSIM.Thermodynamics.StandaloneLibrary", "bin", "Release", "DWSIM.Thermodynamics.dll");
    }

    private static CompoundSummary ToCompoundSummary(object compound)
    {
        var name = GetStringProperty(compound, "Name");
        return new CompoundSummary(
            name,
            name,
            GetStringProperty(compound, "Formula"),
            GetCompoundCategory(compound),
            GetStringProperty(compound, "CurrentDB") is { Length: > 0 } currentDb
                ? currentDb
                : GetStringProperty(compound, "OriginalDB")
        );
    }

    private static Dictionary<string, string> ToFieldMap(object compound)
    {
        return compound
            .GetType()
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(property => property.GetIndexParameters().Length == 0)
            .Select(property => new { property.Name, Value = SafeGetPropertyValue(property, compound) })
            .Where(item => item.Value is not null)
            .ToDictionary(item => item.Name, item => Convert.ToString(item.Value) ?? "", StringComparer.OrdinalIgnoreCase);
    }

    private static object? SafeGetPropertyValue(PropertyInfo property, object target)
    {
        try
        {
            return property.GetValue(target);
        }
        catch
        {
            return null;
        }
    }

    private static string GetStringProperty(object target, string name)
    {
        var value = target.GetType().GetProperty(name)?.GetValue(target);
        return Convert.ToString(value) ?? "";
    }

    private static string GetCompoundCategory(object compound)
    {
        if (string.Equals(GetStringProperty(compound, "IsIon"), "True", StringComparison.OrdinalIgnoreCase))
        {
            return "Ion";
        }

        if (string.Equals(GetStringProperty(compound, "IsSalt"), "True", StringComparison.OrdinalIgnoreCase))
        {
            return "Salt";
        }

        var source = GetStringProperty(compound, "CurrentDB");
        return string.IsNullOrWhiteSpace(source) ? GetStringProperty(compound, "OriginalDB") : source;
    }

    private static string ToPropertyPackageId(string name)
    {
        foreach (var pair in KnownPropertyPackageNames)
        {
            if (string.Equals(pair.Value, name, StringComparison.OrdinalIgnoreCase))
            {
                return pair.Key;
            }
        }

        return name;
    }

    private static double ToDouble(object? value)
    {
        return value is null ? 0 : Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
    }
}

sealed class WorkerException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

record JsonRpcRequest(string Jsonrpc, string Method, JsonElement? Params, int Id);

record JsonRpcResponse(string Jsonrpc, object? Result, JsonRpcError? Error, int Id);

record JsonRpcError(string Code, string Message);

record CompoundSummary(string Id, string Name, string Formula, string Category, string Source);

record CompoundDetails(
    string Id,
    string Name,
    string Formula,
    string Category,
    string Source,
    string CasNumber,
    IReadOnlyDictionary<string, string> Fields
);

record PropertyPackageSummary(string Id, string Name, string Description);

record ThermoSelection(string PropertyPackageId, string[] CompoundIds);

record FlashRequest(
    string PropertyPackageId,
    string[] CompoundIds,
    double[] MoleFractions,
    double TemperatureK,
    double PressurePa
) : ThermoSelection(PropertyPackageId, CompoundIds);

record FlashResult(
    double TemperatureK,
    double PressurePa,
    double VaporFraction,
    IReadOnlyList<PhaseResult> Phases,
    IReadOnlyDictionary<string, double>? Properties
);

record PhaseResult(string Name, double Fraction, IReadOnlyDictionary<string, double> MoleFractions);
