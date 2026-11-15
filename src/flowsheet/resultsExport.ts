import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import toast from 'react-hot-toast'
import writeXlsxFile from 'write-excel-file/browser'

import {
  getStreamRows,
  splitResultObjects,
  toDisplayValue,
} from '@src/flowsheet/results'
import { EXPORT_TOAST_MESSAGES } from '@src/lib/constants'
import { exportSave } from '@src/lib/exportSave'
import type { SolveFlowsheetResult } from '@src/lib/thermo'

type ResultCell = string | number | null

type ResultsTable = {
  title: string
  headers: string[]
  rows: ResultCell[][]
}

function getResultsTables(result: SolveFlowsheetResult): ResultsTable[] {
  const { streams, others } = splitResultObjects(result)
  const tables: ResultsTable[] = []
  if (streams.length > 0) {
    const compoundIds = Object.keys(streams[0].stream.moleFractions)
    tables.push({
      title: 'Material Streams',
      headers: ['Property', ...streams.map((object) => object.tag), 'Units'],
      rows: getStreamRows(compoundIds).map((row) => [
        row.label,
        ...streams.map(
          (object) =>
            toDisplayValue(row.value(object.stream), row.unit, row.symbol) ??
            null
        ),
        row.symbol ?? null,
      ]),
    })
  }
  if (others.length > 0) {
    tables.push({
      title: 'Unit Operations',
      headers: ['Object', 'Status', 'Heat Flow (kW)', 'Message'],
      rows: others.map((object) => [
        object.tag,
        object.calculated ? 'Calculated' : 'Not calculated',
        toDisplayValue(object.energyFlowW, 'heatflow', 'kW') ?? null,
        object.errorMessage || null,
      ]),
    })
  }
  return tables
}

function getResultsTitle(result: SolveFlowsheetResult, finishedAt: Date) {
  return `${result.solved ? 'Flowsheet solved' : 'Flowsheet did not solve'} · ${finishedAt.toLocaleString()}`
}

async function createExcelBlob(result: SolveFlowsheetResult, finishedAt: Date) {
  const tables = getResultsTables(result)
  return writeXlsxFile(
    tables.map((table) => ({
      sheet: table.title,
      data: [
        [
          {
            value: getResultsTitle(result, finishedAt),
            fontWeight: 'bold' as const,
          },
        ],
        [],
        table.headers.map((value) => ({ value, fontWeight: 'bold' as const })),
        ...table.rows.map((row) =>
          row.map((value) => ({ value: value ?? undefined }))
        ),
      ],
    }))
  ).toBlob()
}

function formatPdfCell(value: ResultCell) {
  if (value === null) {
    return '—'
  }
  return typeof value === 'number'
    ? value.toLocaleString(undefined, { maximumSignificantDigits: 6 })
    : value
}

function createPdfBlob(result: SolveFlowsheetResult, finishedAt: Date) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text('Simulation Results', 14, 16)
  doc.setFontSize(9)
  doc.text(getResultsTitle(result, finishedAt), 14, 22)
  let y = 30
  for (const table of getResultsTables(result)) {
    doc.setFontSize(11)
    doc.text(table.title, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [table.headers],
      body: table.rows.map((row) => row.map(formatPdfCell)),
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      didDrawPage: (data) => {
        y = (data.cursor?.y ?? y) + 10
      },
    })
  }
  return doc.output('blob')
}

export async function exportResults(
  format: 'xlsx' | 'pdf',
  result: SolveFlowsheetResult,
  finishedAt: Date,
  projectName: string
) {
  const toastId = toast.loading(EXPORT_TOAST_MESSAGES.START)
  try {
    const blob =
      format === 'xlsx'
        ? await createExcelBlob(result, finishedAt)
        : createPdfBlob(result, finishedAt)
    const fileName = `${projectName}.${format}`
    await exportSave({
      files: [
        {
          name: fileName,
          contents: Array.from(new Uint8Array(await blob.arrayBuffer())),
        },
      ],
      fileName,
      toastId,
    })
  } catch (error) {
    console.error('results export error', error)
    toast.error(EXPORT_TOAST_MESSAGES.FAILED, { id: toastId })
  }
}
