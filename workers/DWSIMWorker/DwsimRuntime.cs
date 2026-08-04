using System.Collections;
using System.Reflection;
using System.Runtime.Loader;

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

    private static double ToDouble(object? value)
    {
        return value is null
            ? 0
            : Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static string GetStringProperty(object target, string name)
    {
        var value = target.GetType().GetProperty(name)?.GetValue(target);
        return Convert.ToString(value) ?? "";
    }

    private static string GetCompoundSource(object compound)
    {
        var currentDatabase = GetStringProperty(compound, "CurrentDB");
        return string.IsNullOrWhiteSpace(currentDatabase)
            ? GetStringProperty(compound, "OriginalDB")
            : currentDatabase;
    }

    private static string GetCompoundCategory(object compound)
    {
        if (
            string.Equals(
                GetStringProperty(compound, "IsIon"),
                "True",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return "Ion";
        }

        if (
            string.Equals(
                GetStringProperty(compound, "IsSalt"),
                "True",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return "Salt";
        }

        return GetCompoundSource(compound);
    }

    private static CompoundSummary ToCompoundSummary(object compound)
    {
        var name = GetStringProperty(compound, "Name");
        var category = GetCompoundCategory(compound);
        return new CompoundSummary(
            name,
            name,
            GetStringProperty(compound, "Formula"),
            category,
            category is "Ion" or "Salt" ? GetCompoundSource(compound) : category
        );
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

    private static double GetVaporFraction(IEnumerable<PhaseResult> phases)
    {
        return phases
            .Where(phase => phase.Name.Contains("vapor", StringComparison.OrdinalIgnoreCase))
            .Select(phase => phase.Fraction)
            .FirstOrDefault();
    }

    private static void ValidateFlashRequest(FlashRequest request)
    {
        if (request.TemperatureK <= 0 || request.PressurePa <= 0)
        {
            throw new WorkerException(
                "invalid_flash_conditions",
                "temperatureK and pressurePa must be positive."
            );
        }

        if (request.MoleFractions.Length != request.CompoundIds.Length)
        {
            throw new WorkerException(
                "invalid_composition",
                "moleFractions must match compoundIds length."
            );
        }
    }

    private static string? FindPackageName(IEnumerable<string> packages, string id)
    {
        return packages.FirstOrDefault(name =>
            string.Equals(name, id, StringComparison.OrdinalIgnoreCase)
        );
    }

    private static IReadOnlyList<PhaseResult> ToPhaseResults(Array matrix, string[] compoundIds)
    {
        var phases = new List<PhaseResult>();

        for (var column = 0; column < matrix.GetLength(1); column++)
        {
            var name = Convert.ToString(matrix.GetValue(0, column)) ?? $"Phase {column + 1}";
            var fraction = ToDouble(matrix.GetValue(1, column));
            var moleFractions = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);

            for (var row = 0; row < compoundIds.Length; row++)
            {
                moleFractions[compoundIds[row]] = ToDouble(matrix.GetValue(row + 2, column));
            }

            phases.Add(new PhaseResult(name, fraction, moleFractions));
        }

        return phases;
    }

    private static IEnumerable<string> GetDefaultDwsimAssemblyPaths()
    {
        var workerDirectory = AppContext.BaseDirectory;
        yield return Path.Combine(workerDirectory, "dwsim-runtime", "DWSIM.Thermodynamics.dll");

        var appRoot = Environment.GetEnvironmentVariable("FUGACITY_APP_ROOT");
        if (string.IsNullOrWhiteSpace(appRoot))
        {
            yield break;
        }

        yield return Path.Combine(appRoot, "dwsim-runtime", "DWSIM.Thermodynamics.dll");
        yield return Path.Combine(
            appRoot,
            "workers",
            "DWSIMWorker",
            "dwsim-runtime",
            "DWSIM.Thermodynamics.dll"
        );
    }

    private static string ResolveDwsimAssemblyPath()
    {
        var configuredPath = Environment.GetEnvironmentVariable("FUGACITY_DWSIM_ASSEMBLY");
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            if (!File.Exists(configuredPath))
            {
                throw new WorkerException(
                    "dwsim_assembly_not_found",
                    $"DWSIM assembly was not found at '{configuredPath}'."
                );
            }

            return Path.GetFullPath(configuredPath);
        }

        var searchedPaths = GetDefaultDwsimAssemblyPaths().ToArray();
        var discoveredPath = searchedPaths.FirstOrDefault(File.Exists);
        if (discoveredPath is not null)
        {
            return Path.GetFullPath(discoveredPath);
        }

        throw new WorkerException(
            "dwsim_not_configured",
            "DWSIM.Thermodynamics.dll was not found. Configure FUGACITY_DWSIM_ASSEMBLY to a compatible DWSIM.Thermodynamics.dll, "
                + "or place it in a dwsim-runtime folder beside the worker. A DWSIM source checkout is not enough; the worker needs built runtime DLLs. "
                + "Searched: "
                + string.Join(", ", searchedPaths)
        );
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

    private Assembly LoadCalculatorAssembly()
    {
        var assemblyPath = ResolveDwsimAssemblyPath();
        assemblyDirectory = Path.GetDirectoryName(assemblyPath);
        AssemblyLoadContext.Default.Resolving += ResolveDependency;

        try
        {
            return AssemblyLoadContext.Default.LoadFromAssemblyPath(assemblyPath);
        }
        catch (Exception ex)
        {
            throw new WorkerException(
                "dwsim_load_failed",
                $"Failed to load DWSIM assembly '{assemblyPath}': {ex.Message}"
            );
        }
    }

    private object GetCalculator()
    {
        if (calculator is not null)
        {
            return calculator;
        }

        var assembly = LoadCalculatorAssembly();
        calculatorType =
            assembly.GetType("DWSIM.Thermodynamics.CalculatorInterface.Calculator")
            ?? throw new WorkerException(
                "dwsim_api_unavailable",
                "DWSIM calculator type was not found."
            );

        calculator =
            Activator.CreateInstance(calculatorType)
            ?? throw new WorkerException(
                "dwsim_init_failed",
                "DWSIM calculator could not be created."
            );

        InvokeCalculator("Initialize");
        return calculator;
    }

    private Type GetCalculatorType()
    {
        _ = GetCalculator();
        return calculatorType!;
    }

    private object? InvokeCalculator(string methodName, params object[] parameters)
    {
        var calculatorType = GetCalculatorType();
        var method =
            calculatorType.GetMethod(
                methodName,
                parameters.Select(parameter => parameter.GetType()).ToArray()
            ) ?? calculatorType.GetMethod(methodName);

        if (method is null)
        {
            throw new WorkerException(
                "dwsim_method_unavailable",
                $"DWSIM method '{methodName}' was not found."
            );
        }

        return method.Invoke(GetCalculator(), parameters);
    }

    private IDictionary GetAvailableCompounds()
    {
        var property = GetCalculatorType().GetProperty("AvailableCompounds");
        if (property is null)
        {
            throw new WorkerException(
                "dwsim_api_unavailable",
                "DWSIM AvailableCompounds API was not found."
            );
        }

        return property.GetValue(GetCalculator()) as IDictionary
            ?? throw new WorkerException(
                "dwsim_api_unavailable",
                "DWSIM AvailableCompounds did not return a dictionary."
            );
    }

    private object GetCompoundOrThrow(string id)
    {
        var compounds = GetAvailableCompounds();
        if (!compounds.Contains(id))
        {
            throw new WorkerException(
                "compound_not_found",
                $"DWSIM compound '{id}' is not available."
            );
        }

        return compounds[id]!;
    }

    private string[] GetPropertyPackageNames()
    {
        var raw = InvokeCalculator("GetPropPackList");
        if (raw is not IEnumerable values)
        {
            throw new WorkerException(
                "dwsim_api_unavailable",
                "DWSIM GetPropPackList returned an invalid result."
            );
        }

        return values
            .Cast<object>()
            .Select(value => value.ToString())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!)
            .ToArray();
    }

    private string ResolvePropertyPackageName(string id)
    {
        var packages = GetPropertyPackageNames();
        var directMatch = FindPackageName(packages, id);
        if (directMatch is not null)
        {
            return directMatch;
        }

        if (KnownPropertyPackageNames.TryGetValue(id, out var mappedName))
        {
            var mappedMatch = FindPackageName(packages, mappedName);
            if (mappedMatch is not null)
            {
                return mappedMatch;
            }
        }

        throw new WorkerException(
            "property_package_not_found",
            $"DWSIM property package '{id}' is not available."
        );
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

        foreach (var compoundId in selection.CompoundIds)
        {
            _ = GetCompoundOrThrow(compoundId);
        }

        packageName = ResolvePropertyPackageName(selection.PropertyPackageId);
        _ = InvokeCalculator("GetPropPackInstance", packageName);
    }

    private Array InvokePtFlash(FlashRequest request, string packageName)
    {
        var method = GetCalculatorType()
            .GetMethod(
                "PTFlash",
                new[]
                {
                    typeof(string),
                    typeof(int),
                    typeof(double),
                    typeof(double),
                    typeof(string[]),
                    typeof(double[]),
                }
            );

        if (method is null)
        {
            throw new WorkerException(
                "dwsim_method_unavailable",
                "DWSIM PTFlash API was not found."
            );
        }

        var raw = method.Invoke(
            GetCalculator(),
            new object[]
            {
                packageName,
                0,
                request.PressurePa,
                request.TemperatureK,
                request.CompoundIds,
                request.MoleFractions,
            }
        );

        if (raw is not Array matrix || matrix.Rank != 2)
        {
            throw new WorkerException(
                "invalid_flash_result",
                "DWSIM returned an invalid PT flash result."
            );
        }

        return matrix;
    }

    public IReadOnlyList<CompoundSummary> ListCompounds()
    {
        return GetAvailableCompounds()
            .Values.Cast<object>()
            .Select(ToCompoundSummary)
            .OrderBy(compound => compound.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public IReadOnlyList<PropertyPackageSummary> ListPropertyPackages()
    {
        return GetPropertyPackageNames()
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
        ValidateFlashRequest(request);

        var matrix = InvokePtFlash(request, packageName);
        var phases = ToPhaseResults(matrix, request.CompoundIds);

        return new FlashResult(
            request.TemperatureK,
            request.PressurePa,
            GetVaporFraction(phases),
            phases
        );
    }
}

record CompoundSummary(string Id, string Name, string Formula, string Category, string Source);

record PropertyPackageSummary(string Id, string Name, string Description);

record FlashResult(
    double TemperatureK,
    double PressurePa,
    double VaporFraction,
    IReadOnlyList<PhaseResult> Phases
);

record PhaseResult(string Name, double Fraction, IReadOnlyDictionary<string, double> MoleFractions);
