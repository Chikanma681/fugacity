import type { UIMessage } from 'ai'
import Loading from '@src/components/Loading'
import { Popover } from '@headlessui/react'
import { CustomIcon } from '@src/components/CustomIcon'
import { ChatBubble, GibbsMessageCard } from '@src/components/GibbsMessageCard'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_GIBBS_MODE } from '@src/lib/constants'
import type { GibbsMode } from '@src/lib/gibbs/types'
import Tooltip from '@src/components/Tooltip'
import { isExternalFileDrag } from '@src/components/Explorer/utils'

const noop = () => {}

export interface QueuedMessage {
  id: string
  text: string
  mode: GibbsMode
  attachments: File[]
}

export interface GibbsConversationProps {
  isLoading: boolean
  messages: UIMessage[]
  error?: string
  onRetry: () => void
  onProcess: (request: string, mode: GibbsMode, attachments: File[]) => void
  onCancel: () => void
  onClickClearChat: () => void
  disabled?: boolean
  userAvatarSrc?: string
  defaultPrompt?: string
  initialGibbsMode?: GibbsMode // resolved from project settings
  onGibbsModeChange?: (mode: GibbsMode) => void
  isProcessing: boolean
  queue: QueuedMessage[]
  onRemoveFromQueue: (id: string) => void
  onSteer: (id: string) => void
}

const GIBBS_MODE_META = Object.freeze({
  fast: {
    pretty: 'Fast',
    description:
      'Lighter reasoning. Best for quick edits like adding a stream or changing an input.',
    icon: (props: { className: string }) => (
      <CustomIcon name="stopwatch" className={props.className} />
    ),
  },
  thoughtful: {
    pretty: 'Thoughtful',
    description:
      'More thorough reasoning. Best for building or troubleshooting whole flowsheets.',
    icon: (props: { className: string }) => (
      <CustomIcon name="brain" className={props.className} />
    ),
  },
} as const)

const GIBBS_MODES: Readonly<GibbsMode[]> = Object.freeze(['fast', 'thoughtful'])

export interface GibbsModesProps {
  onClick: (mode: GibbsMode) => void
  children: ReactNode
  current: GibbsMode
}

const GibbsModes = (props: GibbsModesProps) => {
  return (
    <>
      <Popover className="relative">
        <Popover.Button
          data-testid="ml-copilot-efforts-button"
          className="h-7 bg-default flex flex-row items-center gap-1 m-0 pl-1 pr-2 rounded-sm"
        >
          {props.children}
          <CustomIcon name="caretUp" className="w-5 h-5 ui-open:rotate-180" />
        </Popover.Button>

        <Popover.Panel className="absolute bottom-full left-0 z-20 flex flex-col gap-2 bg-default mb-1 p-2 border border-chalkboard-70 text-xs rounded-md min-w-[240px]">
          {({ close }) => (
            <>
              {GIBBS_MODES.map((mode) => (
                <div
                  tabIndex={0}
                  role="button"
                  key={mode}
                  onClick={() => {
                    close()
                    props.onClick(mode)
                  }}
                  className={`flex flex-row items-start gap-2 cursor-pointer hover:bg-3 p-2 pr-4 rounded-md border ${props.current === mode ? 'border-primary' : ''}`}
                  data-testid={`ml-copilot-effort-button-${mode}`}
                >
                  {GIBBS_MODE_META[mode].icon({
                    className: 'w-5 h-5 shrink-0 mt-0.5',
                  })}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium">
                      {GIBBS_MODE_META[mode].pretty}
                    </span>
                    <span className="text-chalkboard-70 text-[11px] leading-tight">
                      {GIBBS_MODE_META[mode].description}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </Popover.Panel>
      </Popover>
    </>
  )
}

export interface GibbsExtraInputsProps {
  mode: GibbsMode
  onSetMode: (mode: GibbsMode) => void
  onAttachFiles: () => void
  attachmentsDisabled?: boolean
}

export const GibbsExtraInputs = (props: GibbsExtraInputsProps) => {
  return (
    <div className="flex-1 flex min-w-0 items-end">
      <div className="flex flex-row w-fit-content items-end gap-1">
        <GibbsModes onClick={props.onSetMode} current={props.mode}>
          {GIBBS_MODE_META[props.mode].icon({
            className: 'w-5 h-5',
          })}
          {GIBBS_MODE_META[props.mode].pretty}
        </GibbsModes>
        <button
          type="button"
          data-testid="ml-ephant-attachments-button"
          onClick={props.onAttachFiles}
          disabled={props.attachmentsDisabled}
          className="h-7 w-7 bg-default flex items-center justify-center rounded-sm m-0 p-0 flex-none disabled:opacity-60"
          aria-label="Attach files"
        >
          <CustomIcon name="paperclip" className="w-5 h-5" />
          <Tooltip position="top" hoverOnly={true}>
            <span>Attach files</span>
          </Tooltip>
        </button>
      </div>
    </div>
  )
}

interface GibbsConversationInputProps {
  onProcess: GibbsConversationProps['onProcess']
  onCancel: GibbsConversationProps['onCancel']
  onRetry: GibbsConversationProps['onRetry']
  error?: string
  disabled?: boolean
  defaultPrompt?: string
  hasAlreadySentPrompts: boolean
  initialGibbsMode?: GibbsMode
  onGibbsModeChange?: (mode: GibbsMode) => void
  isProcessing: boolean
}

export const GibbsConversationInput = (props: GibbsConversationInputProps) => {
  const refDiv = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState<string>('')
  const [mode, setMode] = useState<GibbsMode>(
    props.initialGibbsMode ?? DEFAULT_GIBBS_MODE
  )
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Without this the cursor ends up at the start of the text
  useEffect(() => setValue(props.defaultPrompt || ''), [props.defaultPrompt])

  useEffect(() => {
    setMode(props.initialGibbsMode ?? DEFAULT_GIBBS_MODE)
  }, [props.initialGibbsMode])

  const onClick = () => {
    if (props.disabled) return

    if (!value && attachments.length === 0) return
    if (!refDiv.current) return

    props.onProcess(value, mode, attachments)
    setValue('')
    setAttachments([])
  }

  const appendAttachments = (files: File[]) => {
    if (!files.length) return
    setAttachments((current) => {
      const next = [...current]
      for (const file of files) {
        const exists = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            (existing.lastModified === file.lastModified ||
              existing.lastModified === 0 ||
              file.lastModified === 0)
        )
        if (!exists) {
          next.push(file)
        }
      }
      return next
    })
  }

  const onAttachFiles = () => {
    if (props.disabled) return
    fileInputRef.current?.click()
  }

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    appendAttachments(files)

    event.target.value = ''
  }

  const onRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (props.disabled) return
    if (isExternalFileDrag(e)) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the container (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (props.disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return

    appendAttachments(files)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files)
    if (!files.length) return
    if (props.disabled) return

    // Prevent default only if we have files to handle
    e.preventDefault()

    appendAttachments(files)
  }

  return (
    <div className="flex flex-col p-4 gap-2">
      <div
        className={`p-2 border b-4 focus-within:b-default flex flex-col gap-2 relative ${isDraggingOver ? 'border-ml-green border-dashed' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-ml-green/10 flex items-center justify-center pointer-events-none z-10 rounded">
            <span className="text-sm text-ml-green font-medium">
              Drop files to attach
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileInputChange}
          className="hidden"
        />
        <textarea
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          data-testid="ml-ephant-conversation-input"
          onChange={(e) => setValue(e.target.value)}
          value={value}
          ref={refDiv}
          placeholder={
            props.isProcessing
              ? 'Type a follow-up to queue...'
              : props.hasAlreadySentPrompts
                ? ''
                : 'Create a three-phase separator with one input and three outputs'
          }
          onKeyDown={(e) => {
            const isOnlyEnter =
              e.key === 'Enter' && !(e.shiftKey || e.metaKey || e.ctrlKey)
            if (isOnlyEnter) {
              e.preventDefault()
              onClick()
            }
          }}
          onPaste={handlePaste}
          className="bg-transparent outline-none w-full text-sm overflow-auto"
          style={{ height: '3lh' }}
        ></textarea>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${file.size}`}
                className="flex items-center gap-1 rounded bg-chalkboard-10 dark:bg-chalkboard-90 border border-chalkboard-20 dark:border-chalkboard-80 px-2 py-1 text-xs"
                title={file.name}
              >
                <CustomIcon name="file" className="w-4 h-4" />
                <span className="max-w-[160px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(index)}
                  className="ml-1 text-chalkboard-70 hover:text-chalkboard-100 dark:hover:text-chalkboard-20"
                  aria-label={`Remove ${file.name}`}
                >
                  <CustomIcon name="close" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end">
          <GibbsExtraInputs
            mode={mode}
            onSetMode={(m) => {
              setMode(m)
              props.onGibbsModeChange?.(m)
            }}
            onAttachFiles={onAttachFiles}
            attachmentsDisabled={props.disabled}
          />
          <div className="flex flex-row gap-1">
            {props.error && (
              <div className="flex flex-col w-fit items-end">
                <div
                  className="pr-1 text-xs text-red-500 flex flex-row items-center h-5"
                  title={props.error}
                >
                  <CustomIcon name="close" className="w-7 h-7" />{' '}
                  <span>Something went wrong</span>
                </div>
                <button onClick={props.onRetry}>Retry</button>
              </div>
            )}
            {props.isProcessing && (
              <button
                data-testid="ml-ephant-conversation-cancel-button"
                onClick={props.onCancel}
                className="m-0 p-1 rounded-sm border-none bg-destroy-10 text-destroy-80 dark:bg-destroy-80 dark:text-destroy-10 group-hover:brightness-110"
              >
                <CustomIcon name="close" className="w-5 h-5" />
                <Tooltip position="top" hoverOnly={true}>
                  <span>Cancel</span>
                </Tooltip>
              </button>
            )}
            <button
              data-testid="ml-ephant-conversation-input-button"
              disabled={props.disabled}
              onClick={onClick}
              className="m-0 p-1 rounded-sm border-none bg-ml-green hover:bg-ml-green text-chalkboard-100"
            >
              <CustomIcon name="arrowShortUp" className="w-5 h-5" />
              <Tooltip position="top" hoverOnly={true}>
                <span>{props.isProcessing ? 'Queue' : 'Send'}</span>
              </Tooltip>
            </button>
          </div>
        </div>
      </div>
      <div className="text-3 text-xs">
        Gibbs can make mistakes. Always verify information.
      </div>
    </div>
  )
}

const StarterCard = ({ text }: { text: string }) => (
  <div className="flex flex-col px-4 py-2 text-sm">
    <ChatBubble
      side="left"
      wfull={true}
      userAvatar={<div className="h-7 w-7 avatar bg-img-mel" />}
      className="py-4"
    >
      {text}
    </ChatBubble>
  </div>
)

const PENDING_RESPONSE: UIMessage = {
  id: 'gibbs-pending-response',
  role: 'assistant',
  parts: [],
}

export const GibbsConversation = (props: GibbsConversationProps) => {
  const refScroll = useRef<HTMLDivElement>(null)
  const lastMessage = props.messages.at(-1)
  const messages =
    props.isProcessing && lastMessage?.role === 'user'
      ? [...props.messages, PENDING_RESPONSE]
      : props.messages

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      refScroll.current?.scrollTo({
        top: refScroll.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }

  // Autoscroll: right after sending a prompt when the new message is added
  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages.length])

  // Autoscroll: right after Gibbs completes its turn.
  useEffect(() => {
    if (!props.isProcessing) scrollToBottom()
  }, [props.isProcessing])

  const messageCards = messages.map((message, index) => {
    const isLastMessage = index === messages.length - 1
    return (
      <GibbsMessageCard
        key={message.id}
        message={message}
        userAvatar={props.userAvatarSrc}
        isLastMessage={isLastMessage}
        isStreaming={isLastMessage && props.isProcessing}
        onClickClearChat={isLastMessage ? props.onClickClearChat : noop}
      />
    )
  })

  return (
    <div className="relative">
      <div className="absolute inset-0">
        <div className="flex flex-col h-full">
          <div className="h-full flex flex-col justify-end overflow-auto relative">
            <div className="overflow-auto" ref={refScroll}>
              {props.isLoading === false ? (
                messageCards.length > 0 ? (
                  <>
                    {messageCards}
                    {props.isProcessing && (
                      <div className="absolute z-10 bottom-0 h-[1px] bg-ml-green animate-shimmer w-full" />
                    )}
                  </>
                ) : (
                  <StarterCard text="Ask Gibbs to build or edit your flowsheet, or ask a process engineering question." />
                )
              ) : (
                <div className="text-center p-4">
                  <Loading isDummy={true} className="!text-ml-green"></Loading>
                </div>
              )}
            </div>
          </div>
          {props.queue.length > 0 && (
            <div className="border-t b-4 px-4 py-2 flex flex-col gap-1">
              <span className="text-xs text-3">Queued</span>
              {props.queue.map((msg, index) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-2 rounded bg-chalkboard-10 dark:bg-chalkboard-90 border border-chalkboard-20 dark:border-chalkboard-80 px-2 py-0.5 text-xs"
                >
                  <span className="text-3 shrink-0">{index + 1}.</span>
                  <span className="truncate min-w-0 flex-1">{msg.text}</span>
                  {msg.attachments.length > 0 && (
                    <span className="text-3 shrink-0 flex items-center gap-0.5">
                      <CustomIcon name="paperclip" className="w-3 h-3" />
                      {msg.attachments.length}
                    </span>
                  )}
                  <span className="text-3 shrink-0">
                    {GIBBS_MODE_META[msg.mode].pretty}
                  </span>
                  <button
                    type="button"
                    onClick={() => props.onSteer(msg.id)}
                    className="shrink-0 flex gap-0.5 items-center pl-0.5 pr-2 py-0.5 m-0 rounded border border-chalkboard-30 dark:border-chalkboard-70 bg-transparent hover:bg-chalkboard-20 dark:hover:bg-chalkboard-80 text-xs"
                    aria-label={`Send queued message ${index + 1} now`}
                  >
                    <CustomIcon name="arrowShortUp" className="w-4 h-4" />
                    Steer
                    <Tooltip position="top" hoverOnly={true}>
                      <span>Interrupt and send this prompt</span>
                    </Tooltip>
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onRemoveFromQueue(msg.id)}
                    className="shrink-0 text-3 hover:text-chalkboard-100 dark:hover:text-chalkboard-20 p-1 m-0 border-none bg-transparent"
                    aria-label={`Remove queued message ${index + 1}`}
                  >
                    <CustomIcon name="close" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t b-4">
            <GibbsConversationInput
              disabled={props.disabled || props.isLoading}
              error={props.error}
              onRetry={props.onRetry}
              onProcess={props.onProcess}
              initialGibbsMode={props.initialGibbsMode}
              onGibbsModeChange={props.onGibbsModeChange}
              onCancel={props.onCancel}
              defaultPrompt={props.defaultPrompt}
              hasAlreadySentPrompts={messageCards.length > 0}
              isProcessing={props.isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
