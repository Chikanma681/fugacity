package dwsim

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"fugacity/thermo/api"
)

type Client struct {
	workerPath string
}

func NewClientFromEnv() (*Client, error) {
	workerPath := os.Getenv("FUGACITY_DWSIM_WORKER")
	if workerPath == "" {
		return nil, api.ThermoError{Code: "dwsim_worker_unavailable", Message: "FUGACITY_DWSIM_WORKER is not configured"}
	}

	return &Client{workerPath: workerPath}, nil
}

func (c *Client) Call(method string, params any, result any) error {
	request := rpcRequest{JSONRPC: "2.0", Method: method, Params: params, ID: 1}
	requestData, err := json.Marshal(request)
	if err != nil {
		return api.ThermoError{Code: "encode_request_failed", Message: err.Error()}
	}

	cmd := exec.Command(c.workerPath)
	cmd.Stdin = bytes.NewReader(append(requestData, '\n'))
	stderr := bytes.Buffer{}
	cmd.Stderr = &stderr

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return api.ThermoError{Code: "worker_stdout_failed", Message: err.Error()}
	}
	if err := cmd.Start(); err != nil {
		return api.ThermoError{Code: "worker_start_failed", Message: err.Error()}
	}

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 1024), 32*1024*1024)
	if !scanner.Scan() {
		_ = cmd.Wait()
		message := stderr.String()
		if message == "" && scanner.Err() != nil {
			message = scanner.Err().Error()
		}
		if message == "" {
			message = "DWSIM worker did not return a response"
		}
		return api.ThermoError{Code: "worker_no_response", Message: message}
	}

	waitErr := cmd.Wait()
	if waitErr != nil {
		return api.ThermoError{Code: "worker_failed", Message: firstNonEmpty(stderr.String(), waitErr.Error())}
	}

	var response rpcResponse
	if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
		return api.ThermoError{Code: "decode_response_failed", Message: err.Error()}
	}
	if response.Error != nil {
		return response.Error.toThermoError()
	}
	if result == nil {
		return nil
	}
	if len(response.Result) == 0 {
		return api.ThermoError{Code: "missing_result", Message: fmt.Sprintf("DWSIM worker returned no result for %s", method)}
	}
	if err := json.Unmarshal(response.Result, result); err != nil {
		return api.ThermoError{Code: "decode_result_failed", Message: err.Error()}
	}
	return nil
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
	ID      int    `json:"id"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error"`
	ID      int             `json:"id"`
}

type rpcError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e rpcError) toThermoError() api.ThermoError {
	code := firstNonEmpty(e.Code, "dwsim_worker_error")
	message := firstNonEmpty(e.Message, "DWSIM worker returned an error")
	return api.ThermoError{Code: code, Message: message}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
