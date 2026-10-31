import { useSignals } from '@preact/signals-react/runtime'
import type { ReactNode } from 'react'

import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import { simulationRun } from '@src/flowsheet/simulationRun'
import { fromSI, panelUnits } from '@src/flowsheet/units'
import type { AreaTypeComponentProps } from '@src/lib/layout'
import type {
  FlowsheetObjectResult,
  SolveFlowsheetResult,
  StreamResult,
} from '@src/lib/thermo'

function formatValue(
  value: number | undefined,
  unit?: string,
  symbol?: string
) {
  if (value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  const panelUnit = unit
    ? panelUnits[unit]?.find(([candidate]) => candidate === symbol)
    : undefined
  const displayed = panelUnit ? fromSI(value, panelUnit) : value
  return displayed.toLocaleString(undefined, { maximumSignificantDigits: 6 })
}

type StreamRow = {
  label: string
  value: (stream: StreamResult) => number | undefined
  unit?: string
  symbol?: string
}

function getStreamRows(compoundIds: string[]): StreamRow[] {
  return [
    {
      label: 'Temperature',
      value: (stream) => stream.temperatureK,
      unit: 'temperature',
      symbol: '°C',
    },
    {
      label: 'Pressure',
      value: (stream) => stream.pressurePa,
      unit: 'pressure',
      symbol: 'bar',
    },
    {
      label: 'Mass Flow',
      value: (stream) => stream.massFlowKgPerS,
      unit: 'massflow',
      symbol: 'kg/h',
    },
    {
      label: 'Molar Flow',
      value: (stream) => stream.molarFlowMolPerS,
      unit: 'molarflow',
      symbol: 'kmol/h',
    },
    {
      label: 'Vapor Fraction',
      value: (stream) => stream.vaporFraction,
    },
    {
      label: 'Specific Enthalpy',
      value: (stream) => stream.massEnthalpyJPerKg,
      unit: 'enthalpy',
      symbol: 'kJ/kg',
    },
    ...compoundIds.map((compoundId) => ({
      label: `Mole Fraction / ${compoundId}`,
      value: (stream: StreamResult) => stream.moleFractions[compoundId],
    })),
  ]
}

function ResultsTable({
  headers,
  children,
}: {
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-chalkboard-70 dark:text-chalkboard-40">
            {headers.map((header) => (
              <th
                key={header}
                className="px-2 py-1 font-semibold whitespace-nowrap border-b border-chalkboard-20 dark:border-chalkboard-80"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const cellClassName =
  'px-2 py-1 whitespace-nowrap border-b border-chalkboard-10 dark:border-chalkboard-90'

function MaterialStreamResults({
  streams,
}: {
  streams: (FlowsheetObjectResult & { stream: StreamResult })[]
}) {
  const compoundIds = Object.keys(streams[0].stream.moleFractions)
  return (
    <ResultsTable
      headers={['Property', ...streams.map((object) => object.tag), 'Units']}
    >
      {getStreamRows(compoundIds).map((row) => (
        <tr key={row.label}>
          <td className={cellClassName}>{row.label}</td>
          {streams.map((object) => (
            <td
              key={object.tag}
              className={`${cellClassName} text-right tabular-nums`}
            >
              {formatValue(row.value(object.stream), row.unit, row.symbol)}
            </td>
          ))}
          <td className={cellClassName}>{row.symbol ?? '—'}</td>
        </tr>
      ))}
    </ResultsTable>
  )
}

function ObjectStatusResults({
  objects,
}: { objects: FlowsheetObjectResult[] }) {
  return (
    <ResultsTable headers={['Object', 'Status', 'Heat Flow (kW)', 'Message']}>
      {objects.map((object) => (
        <tr key={object.tag}>
          <td className={cellClassName}>{object.tag}</td>
          <td
            className={`${cellClassName} ${object.calculated ? 'text-succeed-80 dark:text-succeed-40' : 'text-destroy-80'}`}
          >
            {object.calculated ? 'Calculated' : 'Not calculated'}
          </td>
          <td className={`${cellClassName} text-right tabular-nums`}>
            {object.energyFlowW === undefined
              ? '—'
              : formatValue(object.energyFlowW, 'heatflow', 'kW')}
          </td>
          <td className={`${cellClassName} whitespace-normal`}>
            {object.errorMessage || '—'}
          </td>
        </tr>
      ))}
    </ResultsTable>
  )
}

function SimulationResults({
  result,
  finishedAt,
}: {
  result: SolveFlowsheetResult
  finishedAt: Date
}) {
  const objects = Object.values(result.objects)
  const streams = objects.filter(
    (object): object is FlowsheetObjectResult & { stream: StreamResult } =>
      object.stream !== undefined
  )
  const others = objects.filter((object) => object.stream === undefined)
  return (
    <div className="flex flex-col gap-4 p-2 text-sm">
      <div
        className={
          result.solved
            ? 'text-succeed-80 dark:text-succeed-40'
            : 'text-destroy-80'
        }
      >
        {result.solved ? 'Flowsheet solved' : 'Flowsheet did not solve'}
        <span className="ml-2 text-xs text-chalkboard-60 dark:text-chalkboard-40">
          {finishedAt.toLocaleTimeString()}
        </span>
      </div>
      {result.errors.length > 0 && (
        <ul className="m-0 pl-4 list-disc text-xs text-destroy-80">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {streams.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="m-0 text-xs font-semibold">Material Streams</h3>
          <MaterialStreamResults streams={streams} />
        </section>
      )}
      {others.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="m-0 text-xs font-semibold">
            Unit Operations and Energy Streams
          </h3>
          <ObjectStatusResults objects={others} />
        </section>
      )}
    </div>
  )
}

function SimulationRunContent() {
  useSignals()
  const run = simulationRun.value
  switch (run.status) {
    case 'idle':
      return (
        <div className="p-4 text-sm text-chalkboard-60 dark:text-chalkboard-40">
          Run the simulation to see results here.
        </div>
      )
    case 'running':
      return (
        <div className="p-4 text-sm text-chalkboard-60 dark:text-chalkboard-40">
          Running simulation…
        </div>
      )
    case 'failed':
      return <div className="p-4 text-sm text-destroy-80">{run.error}</div>
    case 'finished':
      return (
        <SimulationResults result={run.result} finishedAt={run.finishedAt} />
      )
  }
}

export function ResultsPane(props: AreaTypeComponentProps) {
  return (
    <LayoutPanel
      title={props.layout.label}
      id={`${props.layout.id}-pane`}
      className="border-none"
    >
      <LayoutPanelHeader
        id={props.layout.id}
        icon="logs"
        title={props.layout.label}
      />
      <div className="overflow-auto">
        <SimulationRunContent />
      </div>
    </LayoutPanel>
  )
}
