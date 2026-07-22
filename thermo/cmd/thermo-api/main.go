package main

import (
	"encoding/json"
	"fmt"
	"os"

	"fugacity/thermo/api"
	"fugacity/thermo/service"
)

func main() {
	if len(os.Args) < 2 {
		writeError(api.ThermoError{Code: "missing_command", Message: "thermo command is required"})
		os.Exit(2)
	}

	root, err := os.Getwd()
	if err != nil {
		writeError(api.ThermoError{Code: "cwd_error", Message: err.Error()})
		os.Exit(1)
	}
	if envRoot := os.Getenv("FUGACITY_APP_ROOT"); envRoot != "" {
		root = envRoot
	}

	svc, err := service.New(root)
	if err != nil {
		exitError(err)
	}

	switch os.Args[1] {
	case api.CommandListCompounds:
		result, err := svc.ListCompounds()
		if err != nil {
			exitError(err)
		}
		writeJSON(result)
	case api.CommandListPropertyPackages:
		result, err := svc.ListPropertyPackages()
		if err != nil {
			exitError(err)
		}
		writeJSON(result)
	case api.CommandGetCompound:
		var request struct {
			ID string `json:"id"`
		}
		if err := readRequest(&request); err != nil {
			exitError(err)
		}
		result, err := svc.GetCompound(request.ID)
		if err != nil {
			exitError(err)
		}
		writeJSON(result)
	case api.CommandValidateThermoSelection:
		var request api.ThermoSelection
		if err := readRequest(&request); err != nil {
			exitError(err)
		}
		if err := svc.ValidateThermoSelection(request); err != nil {
			exitError(err)
		}
		writeJSON(map[string]bool{"valid": true})
	case api.CommandCalculatePTFlash:
		var request api.FlashRequest
		if err := readRequest(&request); err != nil {
			exitError(err)
		}
		result, err := svc.CalculatePTFlash(request)
		if err != nil {
			exitError(err)
		}
		writeJSON(result)
	default:
		exitError(api.ThermoError{Code: "unknown_command", Message: "unknown thermo command"})
	}
}

func readRequest(value any) error {
	return json.NewDecoder(os.Stdin).Decode(value)
}

func writeJSON(value any) {
	data, err := json.Marshal(value)
	if err != nil {
		exitError(api.ThermoError{Code: "encode_failed", Message: err.Error()})
	}
	fmt.Println(string(data))
}

func exitError(err error) {
	writeError(err)
	os.Exit(1)
}

func writeError(err error) {
	if thermoErr, ok := err.(api.ThermoError); ok {
		_ = json.NewEncoder(os.Stderr).Encode(thermoErr)
		return
	}
	_ = json.NewEncoder(os.Stderr).Encode(api.ThermoError{Code: "thermo_error", Message: err.Error()})
}
