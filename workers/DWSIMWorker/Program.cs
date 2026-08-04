using System.Reflection;
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
        WriteResponse(
            new JsonRpcResponse("2.0", null, new JsonRpcError("invalid_request", ex.Message), 0)
        );
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
            "ListPropertyPackages" => runtime.ListPropertyPackages(),
            "ValidateThermoSelection" => runtime.ValidateThermoSelection(
                ParseParams<ThermoSelection>(request.Params)
            ),
            "CalculatePTFlash" => runtime.CalculatePTFlash(
                ParseParams<FlashRequest>(request.Params)
            ),
            _ => throw new WorkerException(
                "unknown_method",
                $"Unknown DWSIM worker method '{request.Method}'."
            ),
        };

        WriteResponse(new JsonRpcResponse("2.0", result, null, request.Id));
    }
    catch (WorkerException ex)
    {
        WriteResponse(
            new JsonRpcResponse("2.0", null, new JsonRpcError(ex.Code, ex.Message), request.Id)
        );
    }
    catch (TargetInvocationException ex) when (ex.InnerException is not null)
    {
        WriteResponse(
            new JsonRpcResponse(
                "2.0",
                null,
                new JsonRpcError("dwsim_error", ex.InnerException.Message),
                request.Id
            )
        );
    }
    catch (Exception ex)
    {
        WriteResponse(
            new JsonRpcResponse(
                "2.0",
                null,
                new JsonRpcError("dwsim_error", ex.Message),
                request.Id
            )
        );
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

    var value = parameters.Value.Deserialize<T>(
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
    );
    if (value is null)
    {
        throw new WorkerException("invalid_params", "Request parameters are invalid.");
    }

    return value;
}

sealed class WorkerException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

record JsonRpcRequest(string Jsonrpc, string Method, JsonElement? Params, int Id);

record JsonRpcResponse(string Jsonrpc, object? Result, JsonRpcError? Error, int Id);

record JsonRpcError(string Code, string Message);

record ThermoSelection(string PropertyPackageId, string[] CompoundIds);

record FlashRequest(
    string PropertyPackageId,
    string[] CompoundIds,
    double[] MoleFractions,
    double TemperatureK,
    double PressurePa
) : ThermoSelection(PropertyPackageId, CompoundIds);
