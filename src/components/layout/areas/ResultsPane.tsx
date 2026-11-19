import { Menu } from '@headlessui/react'
import { useSignals } from '@preact/signals-react/runtime'
import type { ReactNode } from 'react'

import { CustomIcon } from '@src/components/CustomIcon'
import { LayoutPanel, LayoutPanelHeader } from '@src/components/layout/Panel'
import styles from '@src/components/layout/areas/KclEditorMenu.module.css'
import {
  type StreamObjectResult,
  formatValue,
  getStreamRows,
  splitResultObjects,
} from '@src/flowsheet/results'
import { exportResults } from '@src/flowsheet/resultsExport'
import { isSimulationStale, simulationRun } from '@src/flowsheet/simulationRun'
import { useApp } from '@src/lib/boot'
import type { AreaTypeComponentProps } from '@src/lib/layout'
import { getFlowsheetFilePath } from '@src/lib/store/database'
import type {
  FlowsheetObjectResult,
  SolveFlowsheetResult,
} from '@src/lib/thermo'

function ResultsTable({
  headers,
  children,
}: {
  headers: { label: string; numeric?: boolean }[]
  children: ReactNode
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-chalkboard-70 dark:text-chalkboard-40">
            {headers.map((header) => (
              <th
                key={header.label}
                className={`px-2 py-1 font-semibold whitespace-nowrap border-b border-chalkboard-20 dark:border-chalkboard-80 ${header.numeric ? 'text-right' : 'text-left'}`}
              >
                {header.label}
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

function MaterialStreamResults({ streams }: { streams: StreamObjectResult[] }) {
  const compoundIds = Object.keys(streams[0].stream.moleFractions)
  return (
    <ResultsTable
      headers={[
        { label: 'Property' },
        ...streams.map((object) => ({ label: object.tag, numeric: true })),
        { label: 'Units' },
      ]}
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
}: {
  objects: FlowsheetObjectResult[]
}) {
  return (
    <ResultsTable
      headers={[
        { label: 'Object' },
        { label: 'Status' },
        { label: 'Heat Flow (kW)', numeric: true },
        { label: 'Message' },
      ]}
    >
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

const exportFormats = [
  { format: 'xlsx', label: 'Excel (.xlsx)' },
  { format: 'pdf', label: 'PDF (.pdf)' },
] as const

function useProjectFileName() {
  const { project } = useApp()
  const filePath = getFlowsheetFilePath(project?.executingFileEntry.value?.path)
  return (
    filePath
      ?.split(/[\\/]/)
      .at(-1)
      ?.replace(/\.fgc$/i, '') || 'simulation-results'
  )
}

function ExportMenu({
  result,
  finishedAt,
}: {
  result: SolveFlowsheetResult
  finishedAt: Date
}) {
  const fileName = useProjectFileName()
  return (
    <Menu as="div" className="relative ml-auto">
      <Menu.Button className="flex items-center gap-1 px-2 py-0.5 text-xs border border-chalkboard-30 dark:border-chalkboard-80 rounded-sm bg-transparent hover:border-primary ui-open:border-primary">
        Export
        <CustomIcon name="caretDown" className="w-4 h-4" />
      </Menu.Button>
      <Menu.Items className="absolute right-0 z-20 mt-1 w-36 flex flex-col p-1 bg-chalkboard-10 dark:bg-chalkboard-100 rounded-sm shadow-lg border border-solid border-chalkboard-20/50 dark:border-chalkboard-80/50">
        {exportFormats.map(({ format, label }) => (
          <Menu.Item key={format}>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                void exportResults(format, result, finishedAt, fileName)
              }
            >
              {label}
            </button>
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  )
}

function SimulationResults({
  result,
  finishedAt,
  stale,
}: {
  result: SolveFlowsheetResult
  finishedAt: Date
  stale: boolean
}) {
  const { streams, others } = splitResultObjects(result)
  return (
    <div className="flex flex-col gap-4 p-2 text-sm">
      {stale && (
        <p className="m-0 text-xs text-chalkboard-60 dark:text-chalkboard-40">
          The flowsheet changed since this run. Run the simulation again to
          update these results.
        </p>
      )}
      <div className={`flex flex-col gap-4 ${stale ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2">
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
          <ExportMenu result={result} finishedAt={finishedAt} />
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
        <SimulationResults
          result={run.result}
          finishedAt={run.finishedAt}
          stale={isSimulationStale(run)}
        />
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
