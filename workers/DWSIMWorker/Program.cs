using System.Text.Json;

while (Console.ReadLine() is { } line)
{
    var request = JsonSerializer.Deserialize<JsonRpcRequest>(line);
    if (request is null)
    {
        continue;
    }

    var error = new
    {
        code = "dwsim_not_configured",
        message = "DWSIM.Thermodynamics integration is not configured in this worker yet.",
    };
    Console.WriteLine(
        JsonSerializer.Serialize(new JsonRpcResponse("2.0", null, error, request.id))
    );
}

record JsonRpcRequest(string jsonrpc, string method, JsonElement? @params, int id);

record JsonRpcResponse(string jsonrpc, object? result, object? error, int id);
