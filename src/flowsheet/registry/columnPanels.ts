import type { PanelRow } from './types'

function createColumnSpecificationPanel(key: string, label: string): PanelRow {
  return {
    type: 'group',
    label,
    visibleWhen: { property: `Specs[${key}]`, operator: 'exists' },
    rows: [
      {
        type: 'dropdown',
        label: 'Specification',
        property: `Specs[${key}].SType`,
        enumType: 'ColumnSpec.SpecType',
        fallbackIndex: 0,
        options: [
          {
            label: 'Product Molar Flow Rate',
            value: 'Product_Molar_Flow_Rate',
          },
          { label: 'Product Mass Flow Rate', value: 'Product_Mass_Flow_Rate' },
          { label: 'Reflux/Boil-Up Ratio', value: 'Stream_Ratio' },
          { label: 'Heat Load', value: 'Heat_Duty' },
          { label: 'Compound Mass Flow', value: 'Component_Mass_Flow_Rate' },
          { label: 'Compound Molar Flow', value: 'Component_Molar_Flow_Rate' },
          { label: 'Compound Recovery', value: 'Component_Recovery' },
          { label: 'Compound Fraction', value: 'Component_Fraction' },
          { label: 'Temperature', value: 'Temperature' },
          { label: 'Feed Recovery', value: 'Feed_Recovery' },
        ],
      },
      {
        type: 'dropdown',
        label: 'Compound',
        property: `Specs[${key}].ComponentID`,
        fallbackIndex: 0,
        options: {
          source: 'selectedCompounds',
          prepend: [{ label: '', value: '' }],
        },
      },
      {
        type: 'textbox',
        label: 'Value',
        property: `Specs[${key}].SpecValue`,
        format: 'nf',
      },
      {
        type: 'dropdown',
        label: 'Units',
        property: `Specs[${key}].SpecUnit`,
        fallbackIndex: 0,
        options: {
          source: 'columnSpecificationUnits',
          prepend: [{ label: '', value: '' }],
          unitMeasures: ['molarflow', 'massflow', 'heatflow', 'temperature'],
          append: ['% M/M', '% W/W', 'M', 'We', '%'].map((unit) => ({
            label: unit,
            value: unit,
          })),
        },
      },
    ],
  }
}

export function createColumnPanels(hasCondenser: boolean): PanelRow[] {
  return [
    { type: 'label', label: 'Column Configuration' },
    { type: 'readonly', label: 'Column Type', property: 'ColumnType' },
    {
      type: 'numeric',
      label: 'Number of Stages',
      property: 'NumberOfStages',
      min: 3,
      max: 200,
      decimalPlaces: 0,
      valueType: 'integer',
      setter: 'SetNumberOfStages',
    },
    ...(hasCondenser
      ? [
          {
            type: 'dropdown' as const,
            label: 'Condenser Type',
            property: 'CondenserType',
            enumType: 'Column.condtype',
            fallbackIndex: 0,
            options: [
              { label: 'Total Condenser', value: 0 },
              { label: 'Partial Condenser', value: 1 },
              { label: 'Full Reflux', value: 2 },
            ],
          },
        ]
      : []),
    {
      type: 'dropdown',
      label: 'Solving Method',
      property: 'SolvingMethodName',
      fallbackIndex: 0,
      options: [
        {
          label: 'Wang-Henke (Bubble Point)',
          value: 'Wang-Henke (Bubble Point)',
        },
        {
          label: 'Modified Wang-Henke (Bubble Point)',
          value: 'Modified Wang-Henke (Bubble Point)',
        },
        {
          label: 'Naphtali-Sandholm (Simultaneous Correction)',
          value: 'Naphtali-Sandholm (Simultaneous Correction)',
        },
      ],
    },
    {
      type: 'dropdown',
      label: 'Solver Scheme',
      property: 'SolverScheme',
      enumType: 'Column.SolvingScheme',
      fallbackIndex: 0,
      options: [
        { label: 'Ideal K Initialization', value: 0 },
        { label: 'Ideal Enthalpy Initialization', value: 1 },
        { label: 'Ideal K + Enthalpy Initialization', value: 2 },
        { label: 'Direct', value: 3 },
      ],
    },
    {
      type: 'numeric',
      label: 'Maximum Iterations',
      property: 'MaxIterations',
      min: 1,
      max: 10000,
      decimalPlaces: 0,
      valueType: 'integer',
    },
    {
      type: 'textbox',
      label: 'Temperature Step Fraction (Bubble-Point Solvers)',
      property: 'TemperatureStepFraction',
      format: 'G',
      min: 0,
      exclusiveMin: true,
      max: 1,
    },
    {
      type: 'textbox',
      label: 'Internal Loop Tolerance',
      property: 'InternalLoopTolerance',
      format: 'G',
      min: 0,
      exclusiveMin: true,
    },
    {
      type: 'textbox',
      label: 'External Loop Tolerance',
      property: 'ExternalLoopTolerance',
      format: 'G',
      min: 0,
      exclusiveMin: true,
    },
    {
      type: 'checkbox',
      label: 'Generate Convergence Report',
      property: 'CreateSolverConvergengeReport',
    },
    { type: 'label', label: 'Operating Specifications' },
    {
      type: 'textbox',
      label: 'Condenser Pressure Drop',
      property: 'CondenserDeltaP',
      format: 'nf',
      unit: 'deltaP',
    },
    {
      type: 'textbox',
      label: 'Column Pressure Drop',
      property: 'ColumnPressureDrop',
      format: 'nf',
      unit: 'deltaP',
    },
    {
      type: 'textbox',
      label: 'Reflux Ratio',
      property: 'RefluxRatio',
      format: 'nf',
    },
    {
      type: 'textbox',
      label: 'Distillate Flow Rate',
      property: 'DistillateFlowRate',
      format: 'nf',
      unit: 'molarflow',
    },
    {
      type: 'textbox',
      label: 'Vapor Flow Rate',
      property: 'VaporFlowRate',
      format: 'nf',
      unit: 'molarflow',
    },
    {
      type: 'textbox',
      label: 'Reboiler Duty',
      property: 'ReboilerDuty',
      format: 'nf',
      unit: 'heatflow',
    },
    {
      type: 'textbox',
      label: 'Condenser Duty',
      property: 'CondenserDuty',
      format: 'nf',
      unit: 'heatflow',
    },
    { type: 'label', label: 'Geometry (Sizing)' },
    {
      type: 'textbox',
      label: 'Tray Spacing',
      property: 'TraySpacing',
      format: 'nf',
      unit: 'distance',
    },
    {
      type: 'textbox',
      label: 'Top Spacing',
      property: 'TopSpacing',
      format: 'nf',
      unit: 'distance',
    },
    {
      type: 'textbox',
      label: 'Bottom Spacing',
      property: 'BottomSpacing',
      format: 'nf',
      unit: 'distance',
    },
    {
      type: 'readonly',
      label: 'Estimated Diameter',
      property: 'EstimatedDiameter',
      format: 'nf',
      unit: 'distance',
    },
    {
      type: 'readonly',
      label: 'Estimated Height',
      property: 'EstimatedHeight',
      format: 'nf',
      unit: 'distance',
    },
    {
      type: 'group',
      label: 'Streams',
      visibleWhen: { property: 'Stages', operator: 'notEmpty' },
      rows: [
        {
          type: 'description',
          label: 'Assigns each connected stream to a column stage.',
        },
        {
          type: 'collection',
          label: 'Material Stream Stages',
          property: 'MaterialStreams',
          itemLabel: '{prefix} {StreamTag}',
          labelPrefixes: {
            property: 'StreamBehavior',
            values: {
              Feed: '[FEED]',
              Sidedraw: '[SIDEDRAW]',
              OverheadVapor: '[OVH VAPOR]',
              Distillate: '[DISTILLATE]',
              BottomsLiquid: '[BOTTOMS]',
            },
          },
          filter: [
            {
              property: 'StreamBehavior',
              operator: 'in',
              value: [
                'Feed',
                'Sidedraw',
                'OverheadVapor',
                'Distillate',
                'BottomsLiquid',
              ],
            },
            {
              property: 'StreamID',
              operator: 'existsIn',
              value: 'flowsheet.SimulationObjects',
            },
            {
              property: 'flowsheet.SimulationObjects[{StreamID}].GraphicObject',
              operator: 'exists',
            },
          ],
          rows: [
            {
              type: 'dropdown',
              label: '{prefix} {StreamTag}',
              property: 'AssociatedStage',
              options: {
                source: 'stages',
                labelProperty: 'Name',
                valueProperty: 'ID',
                matchProperties: ['ID', 'Name'],
                prepend: [{ label: '', value: '' }],
              },
            },
          ],
        },
        {
          type: 'collection',
          label: 'Energy Stream Stages',
          property: 'EnergyStreams',
          itemLabel: '{prefix} {StreamTag}',
          labelPrefixes: {
            property: 'StreamBehavior',
            values: {
              Distillate: '[COND. DUTY]',
              BottomsLiquid: '[REB. DUTY]',
            },
          },
          filter: [
            {
              property: 'StreamBehavior',
              operator: 'in',
              value: ['Distillate', 'BottomsLiquid'],
            },
            {
              property: 'StreamID',
              operator: 'existsIn',
              value: 'flowsheet.SimulationObjects',
            },
            {
              property: 'flowsheet.SimulationObjects[{StreamID}].GraphicObject',
              operator: 'exists',
            },
          ],
          rows: [
            {
              type: 'dropdown',
              label: '{prefix} {StreamTag}',
              property: 'AssociatedStage',
              options: {
                source: 'stages',
                labelProperty: 'Name',
                valueProperty: 'ID',
                matchProperties: ['ID', 'Name'],
                prepend: [{ label: '', value: '' }],
              },
            },
          ],
        },
        {
          type: 'group',
          label: 'Side Draw Specs',
          visibleWhen: {
            property: 'MaterialStreams',
            operator: 'notEmpty',
            filter: [
              {
                property: 'StreamBehavior',
                operator: 'equals',
                value: 'Sidedraw',
              },
              {
                property: 'StreamID',
                operator: 'existsIn',
                value: 'flowsheet.SimulationObjects',
              },
              {
                property:
                  'flowsheet.SimulationObjects[{StreamID}].GraphicObject',
                operator: 'exists',
              },
            ],
          },
          rows: [
            {
              type: 'collection',
              label: 'Side Draws',
              property: 'MaterialStreams',
              itemLabel: '{StreamTag}',
              filter: [
                {
                  property: 'StreamBehavior',
                  operator: 'equals',
                  value: 'Sidedraw',
                },
                {
                  property: 'StreamID',
                  operator: 'existsIn',
                  value: 'flowsheet.SimulationObjects',
                },
                {
                  property:
                    'flowsheet.SimulationObjects[{StreamID}].GraphicObject',
                  operator: 'exists',
                },
              ],
              rows: [
                {
                  type: 'dropdown',
                  label: '{StreamTag} / Draw Phase',
                  property: 'StreamPhase',
                  enumType: 'StreamInformation.Phase',
                  fallbackIndex: 0,
                  options: [
                    { label: 'L', value: 'L' },
                    { label: 'V', value: 'V' },
                  ],
                },
                {
                  type: 'textbox',
                  label: '{StreamTag} / Molar Flow',
                  property: 'FlowRate.Value',
                  format: 'nf',
                  unit: 'molarflow',
                },
              ],
            },
          ],
        },
      ],
    },
    createColumnSpecificationPanel('C', 'Condenser Specification'),
    createColumnSpecificationPanel('R', 'Reboiler Specification'),
    { type: 'label', label: 'Stage Properties' },
    {
      type: 'description',
      label: 'Stages will be created on next solve.',
      visibleWhen: { property: 'Stages', operator: 'empty' },
    },
    {
      type: 'description',
      label:
        '{Stages.Count} stage(s). Edit pressure, temperature and Murphree efficiency below.',
      visibleWhen: { property: 'Stages', operator: 'notEmpty' },
    },
    {
      type: 'collection',
      label: 'Stages',
      property: 'Stages',
      itemLabel: '{Name}',
      itemLabelExpression:
        'IsAutomaticStageName(Name) ? Name : "Stage {index + 1}: {Name}"',
      rows: [
        { type: 'label', label: '{itemLabel}', level: 2 },
        {
          type: 'textbox',
          label: '  Pressure',
          property: 'P',
          format: 'nf',
          unit: 'pressure',
        },
        {
          type: 'textbox',
          label: '  Temperature',
          property: 'T',
          format: 'nf',
          unit: 'temperature',
        },
        {
          type: 'textbox',
          label: '  Murphree Efficiency',
          property: 'Efficiency',
          format: 'nf',
        },
      ],
    },
    {
      type: 'group',
      label: 'Initial Estimates',
      visibleWhen: { property: 'Stages', operator: 'notEmpty' },
      rows: [
        {
          type: 'checkbox',
          label: 'Auto-update from previous solve',
          property: 'AutoUpdateInitialEstimates',
        },
        {
          type: 'checkbox',
          label: 'Use Temperature Estimates',
          property: 'UseTemperatureEstimates',
        },
        {
          type: 'checkbox',
          label: 'Use Vapor Flow Estimates',
          property: 'UseVaporFlowEstimates',
        },
        {
          type: 'checkbox',
          label: 'Use Liquid Flow Estimates',
          property: 'UseLiquidFlowEstimates',
        },
        {
          type: 'description',
          label:
            'No initial-estimates container present. Solve once to populate.',
          visibleWhen: {
            property: 'InitialEstimates',
            operator: 'exists',
            value: false,
          },
        },
        {
          type: 'group',
          label: '',
          visibleWhen: { property: 'InitialEstimates', operator: 'exists' },
          rows: [
            {
              type: 'textbox',
              label: 'Distillate Flow Rate',
              property: 'InitialEstimates.DistillateFlowRate',
              format: 'nf',
              unit: 'molarflow',
            },
            {
              type: 'textbox',
              label: 'Vapor Product Flow Rate',
              property: 'InitialEstimates.VaporProductFlowRate',
              format: 'nf',
              unit: 'molarflow',
            },
            {
              type: 'textbox',
              label: 'Bottoms Flow Rate',
              property: 'InitialEstimates.BottomsFlowRate',
              format: 'nf',
              unit: 'molarflow',
            },
            {
              type: 'textbox',
              label: 'Initial Reflux Ratio',
              property: 'InitialEstimates.RefluxRatio',
              format: 'nf',
            },
            {
              type: 'description',
              label:
                'Per-stage initial T / molar flows are not seeded yet. They populate after the first solve and can be tweaked here for the next run.',
              visibleWhen: {
                property: 'InitialEstimates.StageTemps',
                operator: 'empty',
              },
            },
            {
              type: 'group',
              label: 'Per-Stage Estimates',
              level: 2,
              visibleWhen: {
                property: 'InitialEstimates.StageTemps',
                operator: 'notEmpty',
              },
              rows: [
                {
                  type: 'collection',
                  label: 'Stage Estimates',
                  property: 'InitialEstimates.StageTemps',
                  itemLabel: 'Stage {index + 1}',
                  rows: [
                    {
                      type: 'textbox',
                      label: '  Stage {index + 1} T',
                      property: 'Value',
                      format: 'nf',
                      unit: 'temperature',
                    },
                    {
                      type: 'textbox',
                      label: '  Stage {index + 1} V',
                      property: 'InitialEstimates.VapMolarFlows[{index}].Value',
                      format: 'nf',
                      unit: 'molarflow',
                      visibleWhen: {
                        property: 'InitialEstimates.VapMolarFlows[{index}]',
                        operator: 'exists',
                      },
                    },
                    {
                      type: 'textbox',
                      label: '  Stage {index + 1} L',
                      property: 'InitialEstimates.LiqMolarFlows[{index}].Value',
                      format: 'nf',
                      unit: 'molarflow',
                      visibleWhen: {
                        property: 'InitialEstimates.LiqMolarFlows[{index}]',
                        operator: 'exists',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}
