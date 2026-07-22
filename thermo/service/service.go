package service

import (
	"fugacity/thermo/api"
	"fugacity/thermo/dwsim"
)

type Service struct {
	client *dwsim.Client
}

func New(_ string) (*Service, error) {
	client, err := dwsim.NewClientFromEnv()
	if err != nil {
		return nil, err
	}
	return &Service{client: client}, nil
}

func (s *Service) ListCompounds() ([]api.CompoundSummary, error) {
	var compounds []api.CompoundSummary
	if err := s.client.Call(api.CommandListCompounds, nil, &compounds); err != nil {
		return nil, err
	}
	return compounds, nil
}

func (s *Service) GetCompound(id string) (api.CompoundDetails, error) {
	var compound api.CompoundDetails
	if err := s.client.Call(api.CommandGetCompound, map[string]string{"id": id}, &compound); err != nil {
		return api.CompoundDetails{}, err
	}
	return compound, nil
}

func (s *Service) ListPropertyPackages() ([]api.PropertyPackageSummary, error) {
	var packages []api.PropertyPackageSummary
	if err := s.client.Call(api.CommandListPropertyPackages, nil, &packages); err != nil {
		return nil, err
	}
	return packages, nil
}

func (s *Service) ValidateThermoSelection(selection api.ThermoSelection) error {
	if selection.PropertyPackageID == "" {
		return api.ThermoError{Code: "missing_property_package", Message: "propertyPackageId is required"}
	}
	if len(selection.CompoundIDs) == 0 {
		return api.ThermoError{Code: "missing_compounds", Message: "at least one compound is required"}
	}
	return s.client.Call(api.CommandValidateThermoSelection, selection, nil)
}

func (s *Service) CalculatePTFlash(request api.FlashRequest) (api.FlashResult, error) {
	if err := s.ValidateThermoSelection(api.ThermoSelection{PropertyPackageID: request.PropertyPackageID, CompoundIDs: request.CompoundIDs}); err != nil {
		return api.FlashResult{}, err
	}
	if request.TemperatureK <= 0 || request.PressurePa <= 0 {
		return api.FlashResult{}, api.ThermoError{Code: "invalid_flash_conditions", Message: "temperatureK and pressurePa must be positive"}
	}
	if len(request.MoleFractions) != len(request.CompoundIDs) {
		return api.FlashResult{}, api.ThermoError{Code: "invalid_composition", Message: "moleFractions must match compoundIds length"}
	}
	var result api.FlashResult
	if err := s.client.Call(api.CommandCalculatePTFlash, request, &result); err != nil {
		return api.FlashResult{}, err
	}
	return result, nil
}
