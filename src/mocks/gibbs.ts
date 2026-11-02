import {
  type ChatTransport,
  generateId,
  getToolName,
  isToolUIPart,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from 'ai'
import type { FlowsheetAgentToolResult } from '@src/flowsheet/agent/tools'
import type {
  GibbsConversation,
  GibbsConversationStore,
  GibbsMode,
} from '@src/lib/gibbs/types'

const CHUNK_DELAY_IN_MS = 40

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
}

function wordChunks(
  type: 'text' | 'reasoning',
  text: string
): UIMessageChunk[] {
  const id = generateId()
  const words = text.match(/\S+\s*/g) ?? []
  return [
    { type: `${type}-start`, id },
    ...words.map(
      (delta): UIMessageChunk => ({ type: `${type}-delta`, id, delta })
    ),
    { type: `${type}-end`, id },
  ]
}

function stepChunks(messageId: string, step: UIMessageChunk[]) {
  return [
    { type: 'start', messageId },
    { type: 'start-step' },
    ...step,
    { type: 'finish-step' },
    { type: 'finish' },
  ] satisfies UIMessageChunk[]
}

function getFlowsheetCall(): UIMessageChunk[] {
  const toolCallId = generateId()
  return [
    ...wordChunks('text', 'Let me read the flowsheet first.'),
    { type: 'tool-input-start', toolCallId, toolName: 'get_flowsheet' },
    {
      type: 'tool-input-available',
      toolCallId,
      toolName: 'get_flowsheet',
      input: {},
    },
  ]
}

function summarizeFlowsheetResult(message: UIMessage) {
  const part = message.parts.findLast(
    (candidate) =>
      isToolUIPart(candidate) && getToolName(candidate) === 'get_flowsheet'
  )
  if (!part || !isToolUIPart(part)) {
    return undefined
  }
  if (part.state === 'output-error') {
    return `Reading the flowsheet failed: ${part.errorText}`
  }
  if (part.state !== 'output-available') {
    return undefined
  }
  const result = part.output as FlowsheetAgentToolResult
  if (!result.ok) {
    return `I couldn't read the flowsheet: ${result.error}`
  }
  const document = result.data as {
    revision: number
    objects: unknown[]
    connections: unknown[]
  }
  return `The flowsheet has ${document.objects.length} objects and ${document.connections.length} connections (revision ${document.revision}).`
}

function replyChunks(messages: UIMessage[], mode: GibbsMode) {
  const last = messages.at(-1)
  if (last?.role === 'assistant') {
    const summary =
      summarizeFlowsheetResult(last) ?? 'Done. Anything else to change?'
    return stepChunks(last.id, wordChunks('text', summary))
  }
  const prompt = last ? textOf(last) : ''
  const reasoning =
    mode === 'thoughtful'
      ? wordChunks(
          'reasoning',
          'This is the mock Gibbs transport, so I am pretending to think about the request.'
        )
      : []
  if (/flowsheet/i.test(prompt)) {
    return stepChunks(generateId(), [...reasoning, ...getFlowsheetCall()])
  }
  return stepChunks(generateId(), [
    ...reasoning,
    ...wordChunks(
      'text',
      `Mock Gibbs here. You said: "${prompt}". Mention the flowsheet to see a tool call.`
    ),
  ])
}

export class MockChatTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]) {
    abortSignal?.throwIfAborted()
    const mode = (body as { mode?: GibbsMode } | undefined)?.mode ?? 'fast'
    const stream = simulateReadableStream({
      chunks: replyChunks(messages, mode),
      initialDelayInMs: 300,
      chunkDelayInMs: CHUNK_DELAY_IN_MS,
    })
    return stream.pipeThrough(new TransformStream<UIMessageChunk>(), {
      signal: abortSignal,
    })
  }

  async reconnectToStream() {
    return null
  }
}

export function createInMemoryConversationStore(): GibbsConversationStore {
  const conversations = new Map<string, GibbsConversation>()
  const create = async (projectId: string) => {
    const conversation: GibbsConversation = { id: generateId(), messages: [] }
    conversations.set(projectId, conversation)
    return conversation
  }
  return {
    load: async (projectId) =>
      conversations.get(projectId) ?? (await create(projectId)),
    create,
  }
}
