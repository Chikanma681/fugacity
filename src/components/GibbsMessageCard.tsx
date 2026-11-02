import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { CustomIcon } from '@src/components/CustomIcon'
import { MarkdownText } from '@src/components/MarkdownText'
import { PlaceholderLine } from '@src/components/PlaceholderLine'
import Tooltip from '@src/components/Tooltip'
import type { FlowsheetAgentToolResult } from '@src/flowsheet/agent/tools'
import type { GibbsToolPart } from '@src/lib/gibbs/tools'
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import toast from 'react-hot-toast'

export type GibbsMessageCardProps = {
  message: UIMessage
  userAvatar?: string
  isLastMessage: boolean
  isStreaming: boolean
  onClickClearChat: () => void
}

export interface IButtonCopyProps {
  content: string
}

export const ButtonCopy = (props: IButtonCopyProps) => (
  <button
    type="button"
    onClick={() => {
      if (!props.content) {
        return
      }
      navigator.clipboard.writeText(props.content).then(
        () => {
          toast.success('Copied response to clipboard')
        },
        () => {
          toast.error('Failed to copy response to clipboard')
        }
      )
    }}
    className="pt-1 pb-1"
  >
    <CustomIcon name="clipboard" className="w-4 h-4" />
    <Tooltip
      position="right"
      hoverOnly={true}
      contentClassName="text-sm max-w-none flex items-center gap-5"
    >
      <span>Copy to clipboard</span>
    </Tooltip>
  </button>
)

export const ButtonClearChat = (props: ComponentProps<'button'>) => (
  <button {...props} className="pt-1 pb-1">
    <span className="flex flex-row gap-1">
      <CustomIcon name="trash" className="w-4 h-4" />
      <span>Clear chat</span>
    </span>
  </button>
)

export const AvatarUser = (props: { src?: string }) => {
  return (
    <div className="avatar h-7 w-7">
      {props.src ? (
        <img
          src={props.src || ''}
          className="h-7 w-7 rounded-sm"
          referrerPolicy="no-referrer"
          alt="user avatar"
        />
      ) : (
        <CustomIcon
          name="person"
          className="w-7 h-7 text-chalkboard-70 dark:text-chalkboard-40 bg-chalkboard-20 dark:bg-chalkboard-80"
        />
      )}
    </div>
  )
}

const hasVisibleChildren = (children: ReactNode) => {
  return (
    (children instanceof Array && children.length > 0) ||
    (typeof children === 'string' && children !== '')
  )
}

export const ChatBubble = (props: {
  side: 'left' | 'right'
  userAvatar?: ReactNode
  wfull?: true
  children: ReactNode
  dataTestId?: string
  placeholderTestId?: string
  className?: string
}) => {
  const cssRequest =
    `${props.wfull ? 'w-full ' : ''} select-text whitespace-pre-line hyphens-auto shadow-sm ${props.side === 'left' ? '' : 'border b-4'} bg-2 text-default rounded-t-md pl-4 pr-4 ${props.className} ` +
    (props.side === 'left' ? 'rounded-br-md' : 'rounded-bl-md')

  return (
    <div
      className={`flex justify-end items-end gap-2 w-full ${props.side === 'right' ? 'flex-row' : 'flex-row-reverse'}`}
      data-testid={props.dataTestId}
    >
      <div className="flex flex-col items-end gap-2 w-full">
        <div style={{ wordBreak: 'break-word' }} className={cssRequest}>
          {hasVisibleChildren(props.children) ? (
            props.children
          ) : (
            <PlaceholderLine data-testid={props.placeholderTestId} />
          )}
        </div>
      </div>
      <div className="w-fit-content">{props.userAvatar}</div>
    </div>
  )
}

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n')
}

const TOOL_STEP_LABELS: Record<
  string,
  { running: string; done: (input: unknown) => string }
> = {
  get_flowsheet: {
    running: 'Reading flowsheet…',
    done: () => 'Read flowsheet',
  },
  list_object_types: {
    running: 'Listing object types…',
    done: () => 'Listed object types',
  },
  apply_operations: {
    running: 'Applying operations…',
    done: (input) => {
      const operations = (input as { operations?: unknown[] } | undefined)
        ?.operations
      return `Applied ${operations?.length ?? 0} operations`
    },
  },
}

function toolStepError(part: GibbsToolPart) {
  if (part.state === 'output-error') {
    return part.errorText
  }
  if (part.state === 'output-available') {
    const result = part.output as FlowsheetAgentToolResult | undefined
    return result?.ok === false ? result.error : undefined
  }
  return undefined
}

const ToolStep = (props: { part: GibbsToolPart }) => {
  const name = getToolName(props.part)
  const labels = TOOL_STEP_LABELS[name] ?? {
    running: `Running ${name}…`,
    done: () => `Ran ${name}`,
  }
  const error = toolStepError(props.part)
  const isDone =
    props.part.state === 'output-available' ||
    props.part.state === 'output-error'

  return (
    <div
      className="flex flex-row items-start gap-1 text-xs text-2"
      data-testid="gibbs-tool-step"
    >
      <CustomIcon
        name={error ? 'triangleExclamation' : isDone ? 'checkmark' : 'ellipse1'}
        className={`w-4 h-4 shrink-0 ${error ? 'text-rose-400' : ''}`}
      />
      <div className="flex flex-col min-w-0">
        <span className={isDone ? '' : 'animate-shimmer'}>
          {isDone ? labels.done(props.part.input) : labels.running}
        </span>
        {error && <span className="text-rose-400">{error}</span>}
      </div>
    </div>
  )
}

const UserMessage = (props: { message: UIMessage; userAvatar?: string }) => (
  <ChatBubble
    side="right"
    userAvatar={<AvatarUser src={props.userAvatar} />}
    dataTestId="ml-request-chat-bubble"
    className="pt-2 pb-2"
  >
    {props.message.parts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={index}>{part.text}</span>
      }
      if (part.type === 'file') {
        return (
          <span
            key={index}
            className="flex items-center gap-1 text-xs text-2"
            title={part.filename}
          >
            <CustomIcon name="file" className="w-4 h-4" />
            {part.filename ?? part.mediaType}
          </span>
        )
      }
      return null
    })}
  </ChatBubble>
)

const Reasoning = (props: { texts: string[]; isStreaming: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    if (!props.isStreaming) {
      setIsExpanded(false)
    }
  }, [props.isStreaming])

  return (
    <>
      {isExpanded && (
        <div
          data-testid="ml-response-thinking-view"
          role="region"
          style={{ maxHeight: '20lh' }}
          className="relative select-text overflow-auto text-2 text-xs bg-1 b-4 rounded-md px-2 py-4 border shadow-md flex flex-col gap-2"
        >
          {props.texts.map((text, index) => (
            <MarkdownText key={index} text={text} />
          ))}
        </div>
      )}
      <div
        tabIndex={0}
        role="button"
        className="pl-8 flex flex-row items-center cursor-pointer justify-start gap-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex justify-center items-center flex-none pt-1 pb-1">
          {isExpanded ? (
            <>
              Collapse <CustomIcon name="collapse" className="w-5 h-5" />
            </>
          ) : (
            <>See reasoning</>
          )}
        </button>
        {props.isStreaming && !isExpanded && (
          <span className="text-chalkboard-70 animate-shimmer">
            Thinking...
          </span>
        )}
      </div>
    </>
  )
}

const AssistantMessage = (props: GibbsMessageCardProps) => {
  const reasoningTexts = props.message.parts.flatMap((part) =>
    part.type === 'reasoning' && part.text ? [part.text] : []
  )
  const text = messageText(props.message)

  const children = useMemo(
    () =>
      props.message.parts.flatMap((part, index) => {
        if (part.type === 'text' && part.text) {
          return [
            <MarkdownText
              key={index}
              text={part.text}
              className="whitespace-normal"
            />,
          ]
        }
        if (isToolUIPart(part)) {
          return [<ToolStep key={index} part={part} />]
        }
        return []
      }),
    [props.message.parts]
  )

  return (
    <>
      {reasoningTexts.length > 0 && (
        <Reasoning texts={reasoningTexts} isStreaming={props.isStreaming} />
      )}
      <ChatBubble
        side="left"
        wfull={true}
        userAvatar={<div className="h-7 w-7 avatar bg-img-mel" />}
        dataTestId="ml-response-chat-bubble"
        placeholderTestId="ml-response-chat-bubble-thinking"
        className="py-4 flex flex-col gap-2"
      >
        {children}
      </ChatBubble>
      <div className="pl-9 flex flex-row justify-between">
        {!props.isStreaming && text ? <ButtonCopy content={text} /> : <div />}
        {props.isLastMessage && (
          <ButtonClearChat onClick={props.onClickClearChat} />
        )}
      </div>
    </>
  )
}

export const GibbsMessageCard = (props: GibbsMessageCardProps) => {
  return (
    <div className="flex flex-col px-4 py-2 gap-2 justify-between overflow-hidden text-sm">
      {props.message.role === 'user' ? (
        <UserMessage message={props.message} userAvatar={props.userAvatar} />
      ) : (
        <AssistantMessage {...props} />
      )}
    </div>
  )
}
