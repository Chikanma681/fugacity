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

type FlowsheetObject struct {
	ID         string         `json:"id"`
	Tag        string         `json:"tag"`
	UnitType   string         `json:"unitType"`
	X          float64        `json:"x"`
	Y          float64        `json:"y"`
	Properties map[string]any `json:"properties"`
}

type FlowsheetConnection struct {
	From     string `json:"from"`
	FromPort int    `json:"fromPort"`
	To       string `json:"to"`
	ToPort   int    `json:"toPort"`
}

type SolveFlowsheetRequest struct {
	ThermoSelection
	Objects     []FlowsheetObject     `json:"objects"`
	Connections []FlowsheetConnection `json:"connections"`
}

type StreamPhaseResult struct {
	Fraction      float64            `json:"fraction"`
	MoleFractions map[string]float64 `json:"moleFractions"`
}

type StreamResult struct {
	TemperatureK       float64                `json:"temperatureK"`
	PressurePa         float64                `json:"pressurePa"`
	MassFlowKgPerS     float64                `json:"massFlowKgPerS"`
	MolarFlowMolPerS   float64                `json:"molarFlowMolPerS"`
	MassEnthalpyJPerKg float64                `json:"massEnthalpyJPerKg"`
	VaporFraction      float64                `json:"vaporFraction"`
	MoleFractions      map[string]float64     `json:"moleFractions"`
	Phases             map[string]StreamPhaseResult `json:"phases"`
}

type FlowsheetObjectResult struct {
	Tag          string        `json:"tag"`
	Calculated   bool          `json:"calculated"`
	ErrorMessage string        `json:"errorMessage"`
	Stream       *StreamResult `json:"stream,omitempty"`
	EnergyFlowW  *float64      `json:"energyFlowW,omitempty"`
}

type SolveFlowsheetResult struct {
	Solved  bool                             `json:"solved"`
	Errors  []string                         `json:"errors"`
	Objects map[string]FlowsheetObjectResult `json:"objects"`
}

type ThermoError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e ThermoError) Error() string {
	return e.Message
}
