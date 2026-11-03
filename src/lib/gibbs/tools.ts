import {
  type DynamicToolUIPart,
  getToolName,
  isToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from 'ai'
import type { FlowsheetAgentTool } from '@src/flowsheet/agent/tools'
import type { GibbsToolSpec } from '@src/lib/gibbs/types'

export type GibbsToolPart = ToolUIPart | DynamicToolUIPart

export function toToolSpecs(tools: FlowsheetAgentTool[]): GibbsToolSpec[] {
  return tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }))
}

function isPendingToolPart(
  part: UIMessage['parts'][number]
): part is GibbsToolPart {
  return isToolUIPart(part) && part.state === 'input-available'
}

export function hasPendingToolCalls(message: UIMessage | undefined) {
  return message?.role === 'assistant' && message.parts.some(isPendingToolPart)
}

function withToolError(part: GibbsToolPart, errorText: string) {
  return { ...part, state: 'output-error', errorText } as GibbsToolPart
}

export function cancelUnfinishedToolCalls(
  message: UIMessage,
  reason: string
): UIMessage {
  return {
    ...message,
    parts: message.parts.map((part) =>
      isToolUIPart(part) &&
      (part.state === 'input-streaming' || part.state === 'input-available')
        ? withToolError(part, reason)
        : part
    ),
  }
}

async function runToolPart(
  part: GibbsToolPart,
  tools: FlowsheetAgentTool[]
): Promise<GibbsToolPart> {
  const name = getToolName(part)
  const tool = tools.find((candidate) => candidate.name === name)
  if (!tool) {
    return withToolError(part, `Unknown tool: ${name}`)
  }
  try {
    const output = await tool.execute(part.input)
    return { ...part, state: 'output-available', output } as GibbsToolPart
  } catch (error) {
    return withToolError(
      part,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export async function runPendingToolCalls(
  message: UIMessage,
  tools: FlowsheetAgentTool[]
): Promise<UIMessage> {
  const parts: UIMessage['parts'] = []
  for (const part of message.parts) {
    parts.push(isPendingToolPart(part) ? await runToolPart(part, tools) : part)
  }
  return { ...message, parts }
}
