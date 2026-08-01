package api

type CompoundSummary struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Formula  string `json:"formula"`
	Category string `json:"category"`
	Source   string `json:"source,omitempty"`
}

type PropertyPackageSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type ThermoSelection struct {
	PropertyPackageID string   `json:"propertyPackageId"`
	CompoundIDs       []string `json:"compoundIds"`
}

type MaterialStreamInput struct {
	PropertyPackageID string    `json:"propertyPackageId"`
	CompoundIDs       []string  `json:"compoundIds"`
	MoleFractions     []float64 `json:"moleFractions"`
	TemperatureK      float64   `json:"temperatureK"`
	PressurePa        float64   `json:"pressurePa"`
}

type FlashRequest = MaterialStreamInput

type FlashResult struct {
	TemperatureK  float64            `json:"temperatureK"`
	PressurePa    float64            `json:"pressurePa"`
	VaporFraction float64            `json:"vaporFraction"`
	Phases        []PhaseResult      `json:"phases"`
}

type PhaseResult struct {
	Name          string             `json:"name"`
	Fraction      float64            `json:"fraction"`
	MoleFractions map[string]float64 `json:"moleFractions"`
}

type ThermoError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e ThermoError) Error() string {
	return e.Message
}
