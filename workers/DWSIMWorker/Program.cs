using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

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

public sealed class FlowsheetObjectInput
{
    public string Id;
    public string Tag;
    public string UnitType;
    public double X;
    public double Y;
    public Dictionary<string, object> Properties;
    public string[] Outputs;
}

public sealed class FlowsheetConnectionInput
{
    public string From;
    public int FromPort;
    public string To;
    public int ToPort;
}

public sealed class SolveFlowsheetRequest : ThermoSelection
{
    public List<FlowsheetObjectInput> Objects;
    public List<FlowsheetConnectionInput> Connections;
}

public sealed class WorkerException : Exception
{
    public WorkerException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public string Code { get; private set; }
}

public static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals,
    };
    private static readonly DwsimRuntime Runtime = new DwsimRuntime();
    private static readonly System.IO.TextWriter Output = new System.IO.StreamWriter(
        Console.OpenStandardOutput()
    )
    {
        AutoFlush = true,
    };

    private static object ToValue(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                return element
                    .EnumerateObject()
                    .ToDictionary(property => property.Name, property => ToValue(property.Value));
            case JsonValueKind.Array:
                return element.EnumerateArray().Select(ToValue).ToList();
            case JsonValueKind.String:
                return element.GetString();
            case JsonValueKind.Number:
                return element.TryGetInt32(out var integer) ? integer : element.GetDouble();
            case JsonValueKind.True:
                return true;
            case JsonValueKind.False:
                return false;
            default:
                return null;
        }
    }

    private static Dictionary<string, object> ParseRequest(string line)
    {
        using (var document = JsonDocument.Parse(line))
        {
            return ToValue(document.RootElement) as Dictionary<string, object>
                ?? throw new WorkerException("invalid_request", "Request must be a JSON object.");
        }
    }

    private static void WriteResponse(string jsonrpc, object result, object error, int id)
    {
        Output.WriteLine(
            JsonSerializer.Serialize<object>(
                new Dictionary<string, object>
                {
                    { "jsonrpc", jsonrpc },
                    { "result", result },
                    { "error", error },
                    { "id", id },
                },
                JsonOptions
            )
        );
    }

    private static Dictionary<string, string> Error(string code, string message)
    {
        return new Dictionary<string, string> { { "code", code }, { "message", message } };
    }

    private static double RequiredDouble(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        return Convert.ToDouble(parameters[name], CultureInfo.InvariantCulture);
    }

    private static List<object> RequiredArray(Dictionary<string, object> parameters, string name)
    {
        if (parameters == null || !parameters.ContainsKey(name) || !(parameters[name] is List<object> values))
        {
            throw new WorkerException("missing_param", "'" + name + "' is required.");
        }

        return values;
    }

    private static double[] RequiredDoubleArray(Dictionary<string, object> parameters, string name)
    {
        return RequiredArray(parameters, name)
            .Select(value => Convert.ToDouble(value, CultureInfo.InvariantCulture))
            .ToArray();
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
            throw new WorkerException(
                "invalid_param",
                "'" + name + "' must be a non-empty string."
            );
        }

        return value;
    }

    private static string[] RequiredStringArray(Dictionary<string, object> parameters, string name)
    {
        return RequiredArray(parameters, name)
            .Select(value => Convert.ToString(value, CultureInfo.InvariantCulture))
            .ToArray();
    }

    private static List<Dictionary<string, object>> RequiredObjectArray(
        Dictionary<string, object> parameters,
        string name
    )
    {
        return RequiredArray(parameters, name)
            .Select(value => value as Dictionary<string, object>)
            .ToList();
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

    private static FlowsheetObjectInput ParseFlowsheetObject(Dictionary<string, object> parameters)
    {
        return new FlowsheetObjectInput
        {
            Id = RequiredString(parameters, "id"),
            Tag = RequiredString(parameters, "tag"),
            UnitType = RequiredString(parameters, "unitType"),
            X = RequiredDouble(parameters, "x"),
            Y = RequiredDouble(parameters, "y"),
            Properties = parameters.ContainsKey("properties")
                ? parameters["properties"] as Dictionary<string, object>
                    ?? new Dictionary<string, object>()
                : new Dictionary<string, object>(),
            Outputs = parameters.ContainsKey("outputs")
                ? RequiredStringArray(parameters, "outputs")
                : new string[0],
        };
    }

    private static FlowsheetConnectionInput ParseFlowsheetConnection(
        Dictionary<string, object> parameters
    )
    {
        return new FlowsheetConnectionInput
        {
            From = RequiredString(parameters, "from"),
            FromPort = (int)RequiredDouble(parameters, "fromPort"),
            To = RequiredString(parameters, "to"),
            ToPort = (int)RequiredDouble(parameters, "toPort"),
        };
    }

    private static SolveFlowsheetRequest ParseSolveFlowsheetRequest(
        Dictionary<string, object> parameters
    )
    {
        return new SolveFlowsheetRequest
        {
            PropertyPackageId = RequiredString(parameters, "propertyPackageId"),
            CompoundIds = RequiredStringArray(parameters, "compoundIds"),
            Objects = RequiredObjectArray(parameters, "objects")
                .Select(ParseFlowsheetObject)
                .ToList(),
            Connections = RequiredObjectArray(parameters, "connections")
                .Select(ParseFlowsheetConnection)
                .ToList(),
        };
    }

    public static void Main()
    {
        Console.SetOut(Console.Error);
        string line;
        while ((line = Console.ReadLine()) != null)
        {
            Dictionary<string, object> request;
            try
            {
                request = ParseRequest(line);
            }
            catch (Exception ex)
            {
                WriteResponse("2.0", null, Error("invalid_request", ex.Message), 0);
                continue;
            }

            var id = request.ContainsKey("id")
                ? Convert.ToInt32(request["id"], CultureInfo.InvariantCulture)
                : 0;
            var method = request.ContainsKey("method")
                ? Convert.ToString(request["method"], CultureInfo.InvariantCulture)
                : "";
            var parameters = request.ContainsKey("params")
                ? request["params"] as Dictionary<string, object>
                : null;

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
                    case "SolveFlowsheet":
                        result = FlowsheetSimulation.Solve(ParseSolveFlowsheetRequest(parameters));
                        break;
                    default:
                        throw new WorkerException(
                            "unknown_method",
                            "Unknown DWSIM worker method '" + method + "'."
                        );
                }

                WriteResponse("2.0", result, null, id);
            }
            catch (WorkerException ex)
            {
                WriteResponse("2.0", null, Error(ex.Code, ex.Message), id);
            }
            catch (TargetInvocationException ex)
            {
                WriteResponse(
                    "2.0",
                    null,
                    Error("dwsim_error", (ex.InnerException ?? ex).Message),
                    id
                );
            }
            catch (Exception ex)
            {
                WriteResponse("2.0", null, Error("dwsim_error", ex.Message), id);
            }
        }
    }
}
