package main

import (
	"embed"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"strings"
)

//go:embed assets
var f embed.FS

const (
	biodieselDatabasePath        = "assets/Compounds.Databases/biod_db.xml"
	chedlThermoDatabasePath      = "assets/Compounds.Databases/chedl_thermo.json"
	chemsep1DatabasePath         = "assets/Compounds.Databases/chemsep1.xml"
	chemsep2DatabasePath         = "assets/Compounds.Databases/chemsep2.xml"
	coolpropDatabasePath         = "assets/Compounds.Databases/coolprop.xml"
	coolPropMixturesDatabasePath = "assets/Compounds.Databases/CoolPropIncompMixtures.txt"
	coolPropPureDatabasePath     = "assets/Compounds.Databases/CoolPropIncompPure.txt"
	dwsimDatabasePath            = "assets/Compounds.Databases/dwsim.xml"
	electrolyteDatabasePath      = "assets/Compounds.Databases/electrolyte.xml"
	foodPropDatabasePath         = "assets/Compounds.Databases/FoodProp.xml"
)

type CompoundDatabases struct {
	Biodiesel              []Compound
	ChEDLThermo            []map[string]any
	ChemSep                []Compound
	CoolProp               []Compound
	CoolPropIncompMixtures string
	CoolPropIncompPure     string
	DWSIM                  []Compound
	Electrolyte            []Compound
	FoodProp               []Compound
}

type Compound struct {
	Source string
	Fields map[string]string
}

type xmlNode struct {
	XMLName xml.Name
	Attrs   []xml.Attr `xml:",any,attr"`
	Text    string     `xml:",chardata"`
	Nodes   []xmlNode  `xml:",any"`
}

func main() {
	compounds, err := LoadCompoundDatabases()
	if err != nil {
		panic(err)
	}

	data, err := json.MarshalIndent(compounds, "", "  ")
	if err != nil {
		panic(err)
	}

	fmt.Println(string(data))
}

func LoadCompoundDatabases() (CompoundDatabases, error) {
	biodiesel, err := loadCompoundsFromXMLFile(biodieselDatabasePath, "Biodiesel")
	if err != nil {
		return CompoundDatabases{}, err
	}

	chedlThermo, err := loadChEDLThermoDatabase(chedlThermoDatabasePath)
	if err != nil {
		return CompoundDatabases{}, err
	}

	chemsep1, err := loadCompoundsFromXMLFile(chemsep1DatabasePath, "ChemSep")
	if err != nil {
		return CompoundDatabases{}, err
	}

	chemsep2, err := loadCompoundsFromXMLFile(chemsep2DatabasePath, "ChemSep")
	if err != nil {
		return CompoundDatabases{}, err
	}

	coolprop, err := loadCompoundsFromXMLFile(coolpropDatabasePath, "CoolProp")
	if err != nil {
		return CompoundDatabases{}, err
	}

	coolPropMixtures, err := readEmbeddedText(coolPropMixturesDatabasePath)
	if err != nil {
		return CompoundDatabases{}, err
	}

	coolPropPure, err := readEmbeddedText(coolPropPureDatabasePath)
	if err != nil {
		return CompoundDatabases{}, err
	}

	dwsim, err := loadCompoundsFromXMLFile(dwsimDatabasePath, "DWSIM")
	if err != nil {
		return CompoundDatabases{}, err
	}

	electrolyte, err := loadCompoundsFromXMLFile(electrolyteDatabasePath, "Electrolyte")
	if err != nil {
		return CompoundDatabases{}, err
	}

	foodProp, err := loadCompoundsFromXMLFile(foodPropDatabasePath, "FoodProp")
	if err != nil {
		return CompoundDatabases{}, err
	}

	return CompoundDatabases{
		Biodiesel:              biodiesel,
		ChEDLThermo:            chedlThermo,
		ChemSep:                append(chemsep1, chemsep2...),
		CoolProp:               coolprop,
		CoolPropIncompMixtures: coolPropMixtures,
		CoolPropIncompPure:     coolPropPure,
		DWSIM:                  dwsim,
		Electrolyte:            electrolyte,
		FoodProp:               foodProp,
	}, nil
}

func readEmbeddedText(path string) (string, error) {
	data, err := f.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", path, err)
	}

	return string(data), nil
}

func loadChEDLThermoDatabase(path string) ([]map[string]any, error) {
	data, err := f.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	var compounds []map[string]any
	if err := json.Unmarshal(data, &compounds); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}

	return compounds, nil
}

func loadCompoundsFromXMLFile(path, source string) ([]Compound, error) {
	data, err := f.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	return parseCompoundXML(data, source, path)
}

func parseCompoundXML(data []byte, source, path string) ([]Compound, error) {
	var root xmlNode
	if err := xml.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}

	compounds := make([]Compound, 0, len(root.Nodes))
	for _, node := range root.Nodes {
		if node.XMLName.Local != "compound" && node.XMLName.Local != "component" {
			continue
		}

		compound := Compound{
			Source: source,
			Fields: make(map[string]string, len(node.Nodes)+2),
		}

		if source == "ChemSep" {
			compound.Fields["OriginalDB"] = source
			compound.Fields["CurrentDB"] = source
		}

		for _, field := range node.Nodes {
			compound.Fields[field.XMLName.Local] = fieldValue(field)
		}

		compounds = append(compounds, compound)
	}

	return compounds, nil
}

func fieldValue(node xmlNode) string {
	if value, ok := attrValue(node.Attrs, "value"); ok {
		return strings.TrimSpace(value)
	}

	if len(node.Nodes) == 0 {
		return strings.TrimSpace(node.Text)
	}

	parts := make([]string, 0, len(node.Nodes))
	for _, child := range node.Nodes {
		value := fieldValue(child)
		if value == "" {
			continue
		}

		if name, ok := attrValue(child.Attrs, "name"); ok && name != "" {
			parts = append(parts, name+"="+value)
			continue
		}

		parts = append(parts, child.XMLName.Local+"="+value)
	}

	return strings.Join(parts, ";")
}

func attrValue(attrs []xml.Attr, name string) (string, bool) {
	for _, attr := range attrs {
		if attr.Name.Local == name {
			return attr.Value, true
		}
	}

	return "", false
}
