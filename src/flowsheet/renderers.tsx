import type { FlowConnector, FlowNode } from '@src/flowsheet/types'

const lineColor = '#1F3D4D'
const fillColor = '#1F3D4D33'
const energyColor = '#FFD761'
const inletColor = '#61B8FF'
const outletColor = '#FFB761'

function connectorColor(connector: FlowConnector) {
  if (connector.type === 'energy') {
    return energyColor
  }
  return connector.type === 'in' ? inletColor : outletColor
}

function UnitLabel({ node }: { node: FlowNode }) {
  return (
    <text
      x={node.width / 2}
      y={node.height + 18}
      textAnchor="middle"
      fontFamily="'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace"
      fontSize={12}
      fill={lineColor}
    >
      {node.tag}
    </text>
  )
}

function Connectors({ node }: { node: FlowNode }) {
  return (
    <>
      {node.connectors.map((connector) => (
        <g
          key={connector.id}
          transform={`translate(${connector.x * node.width} ${
            connector.y * node.height
          })`}
        >
          <circle
            r={5}
            fill={connectorColor(connector)}
            stroke={lineColor}
            strokeWidth={1.5}
          />
          <title>{connector.label}</title>
        </g>
      ))}
    </>
  )
}

function StreamGraphic({ node, energy }: { node: FlowNode; energy?: boolean }) {
  const path = `M 0 ${node.height * 0.35} L ${node.width * 0.65} ${
    node.height * 0.35
  } L ${node.width * 0.65} ${node.height * 0.25} L ${node.width} ${
    node.height * 0.5
  } L ${node.width * 0.65} ${node.height * 0.75} L ${node.width * 0.65} ${
    node.height * 0.65
  } L 0 ${node.height * 0.65} Z`

  return (
    <>
      <path
        d={path}
        fill={energy ? '#FFD76155' : fillColor}
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function ValveGraphic({ node }: { node: FlowNode }) {
  const path = `M 0 ${node.height * 0.2} L ${node.width * 0.5} ${
    node.height * 0.5
  } L ${node.width} ${node.height * 0.2} L ${node.width} ${
    node.height * 0.8
  } L ${node.width * 0.5} ${node.height * 0.5} L 0 ${node.height * 0.8} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function CompressorGraphic({ node }: { node: FlowNode }) {
  const path = `M 0 0 L ${node.width} ${node.height * 0.3} L ${node.width} ${
    node.height * 0.7
  } L 0 ${node.height} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function ExpanderGraphic({ node }: { node: FlowNode }) {
  const path = `M ${node.width} 0 L 0 ${node.height * 0.3} L 0 ${
    node.height * 0.7
  } L ${node.width} ${node.height} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function PumpGraphic({ node }: { node: FlowNode }) {
  const casing = `M ${node.width * 0.5} ${node.height} L ${
    node.width * 0.7
  } ${node.height * 0.98} L ${node.width * 0.8} ${
    node.height * 0.9
  } L ${node.width * 0.9} ${node.height} L ${node.width * 0.1} ${
    node.height
  } L ${node.width * 0.2} ${node.height * 0.9} L ${node.width * 0.3} ${
    node.height * 0.98
  } Z`
  const nozzle = `M ${node.width * 0.5} 0 L ${node.width} 0 L ${
    node.width
  } ${node.height * 0.25} L ${node.width * 0.93} ${node.height * 0.25}`

  return (
    <>
      <circle
        cx={node.width / 2}
        cy={node.height / 2}
        r={node.width / 2}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <path d={casing} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <path d={nozzle} fill="none" stroke={lineColor} strokeWidth={2} />
      <rect
        x={-node.width * 0.05}
        y={node.height * 0.35}
        width={node.width * 0.55}
        height={node.height * 0.3}
        fill="#F3E9D9"
        stroke={lineColor}
        strokeWidth={2}
      />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function HeatExchangerGraphic({ node }: { node: FlowNode }) {
  const exchangerPath = `M 0 ${node.height} L ${node.width * 0.25} ${
    node.height * 0.375
  } L ${node.width * 0.75} ${node.height * 0.625} L ${node.width} 0`

  return (
    <>
      <ellipse
        cx={node.width / 2}
        cy={node.height / 2}
        rx={node.width / 2}
        ry={node.height / 2}
        fill={fillColor}
      />
      <ellipse
        cx={node.width / 2}
        cy={node.height / 2}
        rx={node.width / 2}
        ry={node.height / 2}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
      <path d={exchangerPath} stroke={lineColor} strokeWidth={2} fill="none" />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function MixerGraphic({ node }: { node: FlowNode }) {
  const path = `M ${node.width} ${node.height * 0.5} L ${
    node.width * 0.5
  } 0 L 0 0 L 0 ${node.height} L ${node.width * 0.5} ${node.height} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function SplitterGraphic({ node }: { node: FlowNode }) {
  const path = `M 0 ${node.height * 0.5} L ${node.width * 0.5} 0 L ${
    node.width
  } 0 L ${node.width} ${node.height} L ${node.width * 0.5} ${node.height} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function HeaterCoolerGraphic({
  node,
  label,
}: {
  node: FlowNode
  label: 'H' | 'C'
}) {
  const path = `M 0 ${node.height * 0.5} L ${node.width * 0.5} 0 L ${
    node.width
  } ${node.height * 0.5} L ${node.width * 0.5} ${node.height} Z`

  return (
    <>
      <path d={path} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      <text
        x={node.width / 2}
        y={node.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace"
        fontSize={18}
        fontWeight={700}
        fill={lineColor}
      >
        {label}
      </text>
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function SeparatorVesselGraphic({ node }: { node: FlowNode }) {
  return (
    <>
      <rect
        x={node.width * 0.25}
        y={node.height * 0.2}
        width={node.width * 0.5}
        height={node.height * 0.6}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <path
        d={`M ${node.width * 0.25} ${node.height * 0.2} A ${
          node.width * 0.25
        } ${node.height * 0.2} 0 0 1 ${node.width * 0.75} ${node.height * 0.2}`}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <path
        d={`M ${node.width * 0.25} ${node.height * 0.8} A ${
          node.width * 0.25
        } ${node.height * 0.2} 0 0 0 ${node.width * 0.75} ${node.height * 0.8}`}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <line
        x1={node.width * 0.25}
        y1={node.height * 0.5}
        x2={node.width * 0.75}
        y2={node.height * 0.5}
        stroke={lineColor}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function ColumnGraphic({
  node,
  distillation,
}: {
  node: FlowNode
  distillation?: boolean
}) {
  const columnX = node.width * 0.0625
  const columnW = node.width * 0.25
  const topY = node.height * 0.1
  const columnH = node.height * 0.8
  const outletX = distillation ? node.width * 0.75 : node.width

  return (
    <>
      <rect
        x={columnX}
        y={topY}
        width={columnW}
        height={columnH}
        rx={10}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((y) => (
        <line
          key={y}
          x1={columnX}
          y1={node.height * y}
          x2={node.width * 0.31}
          y2={node.height * y}
          stroke={lineColor}
          strokeWidth={1.5}
        />
      ))}
      <polyline
        points={`${node.width * 0.175},${topY} ${node.width * 0.175},${
          node.height * 0.02
        } ${outletX},${node.height * 0.02}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
      <polyline
        points={`${node.width * 0.175},${topY + columnH} ${
          node.width * 0.175
        },${node.height * 0.98} ${outletX},${node.height * 0.98}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
      {distillation && (
        <>
          <circle
            cx={node.width * 0.75}
            cy={node.height * 0.175}
            r={node.width * 0.08}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
          />
          <circle
            cx={node.width * 0.75}
            cy={node.height * 0.825}
            r={node.width * 0.08}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
          />
          <line
            x1={node.width * 0.65}
            y1={node.height * 0.175}
            x2={node.width}
            y2={node.height * 0.175}
            stroke={lineColor}
            strokeWidth={2}
          />
          <line
            x1={node.width * 0.65}
            y1={node.height * 0.825}
            x2={node.width}
            y2={node.height * 0.825}
            stroke={lineColor}
            strokeWidth={2}
          />
        </>
      )}
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function ReactorGraphic({
  node,
  label,
}: {
  node: FlowNode
  label: 'C' | 'E' | 'G'
}) {
  return (
    <>
      <rect
        x={node.width * 0.2}
        y={node.height * 0.1}
        width={node.width * 0.6}
        height={node.height * 0.8}
        rx={node.width * 0.12}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <line
        x1={node.width * 0.2}
        y1={node.height * 0.33}
        x2={node.width * 0.8}
        y2={node.height * 0.33}
        stroke={lineColor}
        strokeWidth={1.5}
      />
      <line
        x1={node.width * 0.2}
        y1={node.height * 0.67}
        x2={node.width * 0.8}
        y2={node.height * 0.67}
        stroke={lineColor}
        strokeWidth={1.5}
      />
      <text
        x={node.width / 2}
        y={node.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace"
        fontSize={18}
        fontWeight={700}
        fill={lineColor}
      >
        {label}
      </text>
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function CSTRGraphic({ node }: { node: FlowNode }) {
  return (
    <>
      <ellipse
        cx={node.width / 2}
        cy={node.height * 0.2}
        rx={node.width * 0.4}
        ry={node.height * 0.1}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <rect
        x={node.width * 0.1}
        y={node.height * 0.2}
        width={node.width * 0.8}
        height={node.height * 0.65}
        fill={fillColor}
        stroke={lineColor}
        strokeWidth={2}
      />
      <ellipse
        cx={node.width / 2}
        cy={node.height * 0.85}
        rx={node.width * 0.4}
        ry={node.height * 0.1}
        fill="#F3E9D9"
        stroke={lineColor}
        strokeWidth={2}
      />
      <line
        x1={node.width / 2}
        y1={-node.height * 0.1}
        x2={node.width / 2}
        y2={node.height * 0.7}
        stroke={lineColor}
        strokeWidth={2}
      />
      <ellipse
        cx={node.width * 0.35}
        cy={node.height * 0.65}
        rx={node.width * 0.15}
        ry={node.height * 0.05}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
      <ellipse
        cx={node.width * 0.65}
        cy={node.height * 0.65}
        rx={node.width * 0.15}
        ry={node.height * 0.05}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

function PFRGraphic({ node }: { node: FlowNode }) {
  const shellPath = `M ${node.width * 0.1} 0 L ${node.width * 0.8} 0 A ${
    node.width * 0.1
  } ${node.height * 0.5} 0 0 1 ${node.width * 0.8} ${node.height} L ${
    node.width * 0.1
  } ${node.height} A ${node.width * 0.1} ${
    node.height * 0.5
  } 0 0 1 ${node.width * 0.1} 0 Z`

  return (
    <>
      <path d={shellPath} fill={fillColor} stroke={lineColor} strokeWidth={2} />
      {Array.from({ length: 8 }, (_, index) => {
        const x = node.width * (0.15 + index * 0.075)
        return (
          <path
            key={index}
            d={`M ${x} 0 A ${node.width * 0.1} ${
              node.height * 0.5
            } 0 0 1 ${x} ${node.height}`}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.2}
          />
        )
      })}
      <Connectors node={node} />
      <UnitLabel node={node} />
    </>
  )
}

export function FlowNodeGraphic({ node }: { node: FlowNode }) {
  switch (node.unitType) {
    case 'MaterialStream':
      return <StreamGraphic node={node} />
    case 'EnergyStream':
      return <StreamGraphic node={node} energy />
    case 'Valve':
      return <ValveGraphic node={node} />
    case 'Compressor':
      return <CompressorGraphic node={node} />
    case 'Expander':
      return <ExpanderGraphic node={node} />
    case 'Pump':
      return <PumpGraphic node={node} />
    case 'Mixer':
      return <MixerGraphic node={node} />
    case 'Splitter':
      return <SplitterGraphic node={node} />
    case 'Cooler':
      return <HeaterCoolerGraphic node={node} label="C" />
    case 'HeatExchanger':
      return <HeatExchangerGraphic node={node} />
    case 'Heater':
      return <HeaterCoolerGraphic node={node} label="H" />
    case 'SeparatorVessel':
      return <SeparatorVesselGraphic node={node} />
    case 'AbsorptionColumn':
      return <ColumnGraphic node={node} />
    case 'DistillationColumn':
      return <ColumnGraphic node={node} distillation />
    case 'CSTR':
      return <CSTRGraphic node={node} />
    case 'ConversionReactor':
      return <ReactorGraphic node={node} label="C" />
    case 'EquilibriumReactor':
      return <ReactorGraphic node={node} label="E" />
    case 'GibbsReactor':
      return <ReactorGraphic node={node} label="G" />
    case 'PFR':
      return <PFRGraphic node={node} />
  }
}
