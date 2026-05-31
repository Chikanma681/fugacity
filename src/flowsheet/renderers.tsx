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
    case 'Pump':
      return <PumpGraphic node={node} />
    case 'HeatExchanger':
      return <HeatExchangerGraphic node={node} />
  }
}
