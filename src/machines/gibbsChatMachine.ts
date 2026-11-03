import {
  type ChatTransport,
  type FileUIPart,
  generateId,
  readUIMessageStream,
  type UIMessage,
} from 'ai'
import { createActorContext } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import { and, assign, fromCallback, fromPromise, setup } from 'xstate'
import { flowsheetAgentTools } from '@src/flowsheet/agent/tools'
import { DEFAULT_GIBBS_MODE } from '@src/lib/constants'
import {
  cancelUnfinishedToolCalls,
  hasPendingToolCalls,
  runPendingToolCalls,
  toToolSpecs,
} from '@src/lib/gibbs/tools'
import type {
  GibbsConversation,
  GibbsConversationStore,
  GibbsMode,
} from '@src/lib/gibbs/types'
import { S } from '@src/machines/utils'

const DEFAULT_MAX_STEPS = 8

export enum GibbsChatStates {
  Loading = 'loading',
  LoadFailed = 'load-failed',
  Creating = 'creating',
  Ready = 'ready',
  Idle = 'idle',
  Streaming = 'streaming',
  RunningTools = 'running-tools',
}

export enum GibbsChatTransitions {
  Load = 'load',
  MessageSend = 'message-send',
  ResponseReceive = 'response-receive',
  ResponseEnd = 'response-end',
  ResponseError = 'response-error',
  Cancel = 'cancel',
  Interrupt = 'interrupt',
  Retry = 'retry',
  ConversationClose = 'conversation-close',
}

export type GibbsChatEvents =
  | { type: GibbsChatTransitions.Load; projectId: string }
  | {
      type: GibbsChatTransitions.MessageSend
      text: string
      mode: GibbsMode
      attachments?: FileUIPart[]
    }
  | { type: GibbsChatTransitions.ResponseReceive; message: UIMessage }
  | { type: GibbsChatTransitions.ResponseEnd }
  | { type: GibbsChatTransitions.ResponseError; error: string }
  | { type: GibbsChatTransitions.Cancel }
  | { type: GibbsChatTransitions.Interrupt }
  | { type: GibbsChatTransitions.Retry }
  | { type: GibbsChatTransitions.ConversationClose }

export type GibbsChatInput = {
  transport: ChatTransport<UIMessage>
  conversations: GibbsConversationStore
  maxSteps?: number
}

export type GibbsChatContext = {
  transport: ChatTransport<UIMessage>
  conversations: GibbsConversationStore
  projectId?: string
  conversationId?: string
  messages: UIMessage[]
  mode: GibbsMode
  error?: string
  steps: number
  maxSteps: number
}

type StreamResponseInput = {
  transport: ChatTransport<UIMessage>
  conversationId: string
  messages: UIMessage[]
  mode: GibbsMode
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function upsertMessage(messages: UIMessage[], message: UIMessage) {
  const index = messages.findIndex((existing) => existing.id === message.id)
  return index === -1
    ? [...messages, message]
    : messages.map((existing, i) => (i === index ? message : existing))
}

function withoutLastTurnResponse(messages: UIMessage[]) {
  const lastUserIndex = messages.findLastIndex(
    (message) => message.role === 'user'
  )
  return messages.slice(0, lastUserIndex + 1)
}

function withLastMessageCancelled(messages: UIMessage[], reason: string) {
  const last = messages.at(-1)
  if (last?.role !== 'assistant') {
    return messages
  }
  const cancelled = cancelUnfinishedToolCalls(last, reason)
  return cancelled.parts.length > 0
    ? [...messages.slice(0, -1), cancelled]
    : messages.slice(0, -1)
}

const streamResponse = fromCallback<GibbsChatEvents, StreamResponseInput>(
  ({ input, sendBack }) => {
    const controller = new AbortController()
    const sendUnlessAborted = (event: GibbsChatEvents) => {
      if (!controller.signal.aborted) {
        sendBack(event)
      }
    }
    const fallbackMessageId = generateId()
    const run = async () => {
      const stream = await input.transport.sendMessages({
        trigger: 'submit-message',
        chatId: input.conversationId,
        messageId: undefined,
        messages: input.messages,
        abortSignal: controller.signal,
        body: { mode: input.mode, tools: toToolSpecs(flowsheetAgentTools) },
      })
      const last = input.messages.at(-1)
      const snapshots = readUIMessageStream<UIMessage>({
        stream,
        message: last?.role === 'assistant' ? structuredClone(last) : undefined,
        terminateOnError: true,
      })
      for await (const message of snapshots) {
        sendUnlessAborted({
          type: GibbsChatTransitions.ResponseReceive,
          message: message.id ? message : { ...message, id: fallbackMessageId },
        })
      }
      sendUnlessAborted({ type: GibbsChatTransitions.ResponseEnd })
    }
    run().catch((error: unknown) =>
      sendUnlessAborted({
        type: GibbsChatTransitions.ResponseError,
        error: toErrorMessage(error),
      })
    )
    return () => controller.abort()
  }
)

export const gibbsChatMachine = setup({
  types: {
    context: {} as GibbsChatContext,
    input: {} as GibbsChatInput,
    events: {} as GibbsChatEvents,
  },
  actors: {
    loadConversation: fromPromise(
      async ({
        input,
      }: {
        input: { conversations: GibbsConversationStore; projectId: string }
      }): Promise<GibbsConversation> =>
        input.conversations.load(input.projectId)
    ),
    createConversation: fromPromise(
      async ({
        input,
      }: {
        input: { conversations: GibbsConversationStore; projectId: string }
      }): Promise<GibbsConversation> =>
        input.conversations.create(input.projectId)
    ),
    streamResponse,
    runTools: fromPromise(
      async ({ input }: { input: { message: UIMessage } }) =>
        runPendingToolCalls(input.message, flowsheetAgentTools)
    ),
  },
  guards: {
    hasPendingToolCalls: ({ context }) =>
      hasPendingToolCalls(context.messages.at(-1)),
    canTakeAnotherStep: ({ context }) => context.steps < context.maxSteps,
    hasUnansweredMessage: ({ context }) =>
      context.messages.some((message) => message.role === 'user'),
  },
  actions: {
    cancelResponse: assign({
      messages: ({ context }) =>
        withLastMessageCancelled(context.messages, 'Cancelled by the user.'),
    }),
    stopAtStepLimit: assign(({ context }) => ({
      messages: withLastMessageCancelled(
        context.messages,
        `Stopped after ${context.maxSteps} steps.`
      ),
      error: `Gibbs stopped after ${context.maxSteps} steps.`,
    })),
  },
}).createMachine({
  initial: S.Await,
  context: ({ input }) => ({
    transport: input.transport,
    conversations: input.conversations,
    messages: [],
    mode: DEFAULT_GIBBS_MODE,
    steps: 0,
    maxSteps: input.maxSteps ?? DEFAULT_MAX_STEPS,
  }),
  on: {
    [GibbsChatTransitions.Load]: {
      target: `.${GibbsChatStates.Loading}`,
      actions: assign(({ event }) => ({
        projectId: event.projectId,
        conversationId: undefined,
        messages: [],
        error: undefined,
      })),
    },
  },
  states: {
    [S.Await]: {},
    [GibbsChatStates.Loading]: {
      invoke: {
        src: 'loadConversation',
        input: ({ context }) => ({
          conversations: context.conversations,
          projectId: context.projectId ?? '',
        }),
        onDone: {
          target: GibbsChatStates.Ready,
          actions: assign(({ event }) => ({
            conversationId: event.output.id,
            messages: event.output.messages.map((message) =>
              cancelUnfinishedToolCalls(message, 'Interrupted.')
            ),
          })),
        },
        onError: {
          target: GibbsChatStates.LoadFailed,
          actions: assign(({ event }) => ({
            error: toErrorMessage(event.error),
          })),
        },
      },
    },
    [GibbsChatStates.LoadFailed]: {
      on: {
        [GibbsChatTransitions.Retry]: {
          target: GibbsChatStates.Loading,
          actions: assign({ error: undefined }),
        },
      },
    },
    [GibbsChatStates.Creating]: {
      invoke: {
        src: 'createConversation',
        input: ({ context }) => ({
          conversations: context.conversations,
          projectId: context.projectId ?? '',
        }),
        onDone: {
          target: GibbsChatStates.Ready,
          actions: assign(({ event }) => ({
            conversationId: event.output.id,
            messages: event.output.messages,
          })),
        },
        onError: {
          target: GibbsChatStates.Ready,
          actions: assign(({ event }) => ({
            error: toErrorMessage(event.error),
          })),
        },
      },
    },
    [GibbsChatStates.Ready]: {
      initial: GibbsChatStates.Idle,
      on: {
        [GibbsChatTransitions.ConversationClose]: {
          target: GibbsChatStates.Creating,
          actions: assign({ messages: [], error: undefined, steps: 0 }),
        },
      },
      states: {
        [GibbsChatStates.Idle]: {
          on: {
            [GibbsChatTransitions.MessageSend]: {
              target: GibbsChatStates.Streaming,
              actions: assign(({ context, event }) => ({
                messages: [
                  ...context.messages,
                  {
                    id: generateId(),
                    role: 'user' as const,
                    parts: [
                      ...(event.attachments ?? []),
                      { type: 'text' as const, text: event.text },
                    ],
                  },
                ],
                mode: event.mode,
                error: undefined,
                steps: 0,
              })),
            },
            [GibbsChatTransitions.Retry]: {
              guard: 'hasUnansweredMessage',
              target: GibbsChatStates.Streaming,
              actions: assign(({ context }) => ({
                messages: withoutLastTurnResponse(context.messages),
                error: undefined,
                steps: 0,
              })),
            },
          },
        },
        [GibbsChatStates.Streaming]: {
          entry: assign({ steps: ({ context }) => context.steps + 1 }),
          invoke: {
            src: 'streamResponse',
            input: ({ context }) => ({
              transport: context.transport,
              conversationId: context.conversationId ?? '',
              messages: context.messages,
              mode: context.mode,
            }),
          },
          on: {
            [GibbsChatTransitions.ResponseReceive]: {
              actions: assign({
                messages: ({ context, event }) =>
                  upsertMessage(context.messages, event.message),
              }),
            },
            [GibbsChatTransitions.ResponseEnd]: [
              {
                guard: and(['hasPendingToolCalls', 'canTakeAnotherStep']),
                target: GibbsChatStates.RunningTools,
              },
              {
                guard: 'hasPendingToolCalls',
                target: GibbsChatStates.Idle,
                actions: 'stopAtStepLimit',
              },
              { target: GibbsChatStates.Idle },
            ],
            [GibbsChatTransitions.ResponseError]: {
              target: GibbsChatStates.Idle,
              actions: [
                'cancelResponse',
                assign(({ event }) => ({ error: event.error })),
              ],
            },
            [GibbsChatTransitions.Cancel]: {
              target: GibbsChatStates.Idle,
              actions: 'cancelResponse',
            },
            [GibbsChatTransitions.Interrupt]: {
              target: GibbsChatStates.Idle,
              actions: 'cancelResponse',
            },
          },
        },
        [GibbsChatStates.RunningTools]: {
          invoke: {
            src: 'runTools',
            input: ({ context }) => ({
              message: context.messages[context.messages.length - 1],
            }),
            onDone: {
              target: GibbsChatStates.Streaming,
              actions: assign({
                messages: ({ context, event }) =>
                  upsertMessage(context.messages, event.output),
              }),
            },
            onError: {
              target: GibbsChatStates.Idle,
              actions: [
                'cancelResponse',
                assign(({ event }) => ({
                  error: toErrorMessage(event.error),
                })),
              ],
            },
          },
          on: {
            [GibbsChatTransitions.Cancel]: {
              target: GibbsChatStates.Idle,
              actions: 'cancelResponse',
            },
            [GibbsChatTransitions.Interrupt]: {
              target: GibbsChatStates.Idle,
              actions: 'cancelResponse',
            },
          },
        },
      },
    },
  },
})

export type GibbsChatActor = ActorRefFrom<typeof gibbsChatMachine>
export const GibbsChatReactContext = createActorContext(gibbsChatMachine)
