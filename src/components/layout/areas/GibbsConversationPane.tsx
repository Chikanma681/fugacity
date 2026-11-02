import { reportRejection } from '@src/lib/trap'
import { NIL as uuidNIL } from 'uuid'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  GibbsConversation,
  type QueuedMessage,
} from '@src/components/GibbsConversation'
import {
  type GibbsChatActor,
  GibbsChatStates,
  GibbsChatTransitions,
} from '@src/machines/gibbsChatMachine'
import { filesToFileParts } from '@src/lib/gibbs/attachments'
import type { GibbsMode } from '@src/lib/gibbs/types'
import { S } from '@src/machines/utils'
import { useSelector } from '@xstate/react'
import { useSearchParams } from 'react-router-dom'
import { SEARCH_PARAM_ML_PROMPT_KEY } from '@src/lib/constants'
import type { SnapshotFrom } from 'xstate'

type GibbsChatSnapshot = SnapshotFrom<GibbsChatActor>

// Defined outside of React to prevent rerenders
const isBusySelector = (snapshot: GibbsChatSnapshot) =>
  snapshot.matches(GibbsChatStates.Ready) &&
  !snapshot.matches({ [GibbsChatStates.Ready]: GibbsChatStates.Idle })
const isLoadingSelector = (snapshot: GibbsChatSnapshot) =>
  snapshot.matches(S.Await) ||
  snapshot.matches(GibbsChatStates.Loading) ||
  snapshot.matches(GibbsChatStates.Creating)
const hasLoadFailedSelector = (snapshot: GibbsChatSnapshot) =>
  snapshot.matches(GibbsChatStates.LoadFailed)
const messagesSelector = (snapshot: GibbsChatSnapshot) =>
  snapshot.context.messages
const errorSelector = (snapshot: GibbsChatSnapshot) => snapshot.context.error

export const GibbsConversationPane = (props: {
  gibbsChatActor: GibbsChatActor
  projectId: string | undefined
  userAvatar?: string
  gibbsMode: GibbsMode
  onGibbsModeChange?: (mode: GibbsMode) => void
}) => {
  const { gibbsChatActor, projectId } = props
  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const isSubmittingFromQueue = useRef(false)
  const steeredId = useRef<string | null>(null)

  const messages = useSelector(gibbsChatActor, messagesSelector)
  const error = useSelector(gibbsChatActor, errorSelector)
  const isBusy = useSelector(gibbsChatActor, isBusySelector)
  const isLoading = useSelector(gibbsChatActor, isLoadingSelector)
  const hasLoadFailed = useSelector(gibbsChatActor, hasLoadFailedSelector)

  useEffect(() => {
    if (!projectId || projectId === uuidNIL) return
    steeredId.current = null
    setQueue([])
    if (gibbsChatActor.getSnapshot().context.projectId === projectId) return
    gibbsChatActor.send({ type: GibbsChatTransitions.Load, projectId })
  }, [gibbsChatActor, projectId])

  const onProcess = async (
    text: string,
    mode: GibbsMode,
    attachments: File[]
  ) => {
    gibbsChatActor.send({
      type: GibbsChatTransitions.MessageSend,
      text,
      mode,
      attachments: await filesToFileParts(attachments),
    })
  }

  const onCancel = () => {
    gibbsChatActor.send({ type: GibbsChatTransitions.Cancel })
  }

  const onRetry = () => {
    gibbsChatActor.send({ type: GibbsChatTransitions.Retry })
  }

  const onProcessOrQueue = (
    request: string,
    mode: GibbsMode,
    attachments: File[]
  ) => {
    if (isBusy || isSubmittingFromQueue.current) {
      setQueue((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: request,
          mode,
          attachments,
        },
      ])
      return
    }
    onProcess(request, mode, attachments).catch(reportRejection)
  }

  const onRemoveFromQueue = useCallback((id: string) => {
    if (steeredId.current === id) {
      steeredId.current = null
    }
    setQueue((prev) => prev.filter((msg) => msg.id !== id))
  }, [])

  const onSteer = useCallback(
    (id: string) => {
      // Mark the message to be processed next without reordering the queue.
      // The auto-submit effect picks it up once the interrupted turn stops.
      steeredId.current = id
      gibbsChatActor.send({ type: GibbsChatTransitions.Interrupt })
    },
    [gibbsChatActor]
  )

  // Auto-submit the next queued message when current processing completes.
  // If a message was steered, it takes priority over the default FIFO order.
  useEffect(() => {
    if (
      !isBusy &&
      !isLoading &&
      queue.length > 0 &&
      !isSubmittingFromQueue.current
    ) {
      isSubmittingFromQueue.current = true
      let next: QueuedMessage
      if (steeredId.current !== null) {
        const id = steeredId.current
        steeredId.current = null
        const index = queue.findIndex((msg) => msg.id === id)
        if (index !== -1) {
          next = queue[index]
          setQueue((prev) => prev.filter((msg) => msg.id !== id))
        } else {
          // Steered message was removed from queue; fall back to FIFO
          next = queue[0]
          setQueue((prev) => prev.slice(1))
        }
      } else {
        next = queue[0]
        setQueue((prev) => prev.slice(1))
      }
      onProcess(next.text, next.mode, next.attachments)
        .catch(reportRejection)
        .finally(() => {
          isSubmittingFromQueue.current = false
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy, isLoading, queue])

  const onClickClearChat = () => {
    steeredId.current = null
    setQueue([])
    gibbsChatActor.send({ type: GibbsChatTransitions.ConversationClose })
  }

  // We watch the URL for a query parameter to set the defaultPrompt
  // for the conversation.
  useEffect(() => {
    const promptParam = searchParams.get(SEARCH_PARAM_ML_PROMPT_KEY)
    if (promptParam) {
      setDefaultPrompt(promptParam)

      // Now clear that param
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete(SEARCH_PARAM_ML_PROMPT_KEY)
      setSearchParams(newSearchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <GibbsConversation
      isLoading={isLoading}
      messages={messages}
      error={error}
      onRetry={onRetry}
      onProcess={onProcessOrQueue}
      onClickClearChat={onClickClearChat}
      onCancel={onCancel}
      disabled={hasLoadFailed}
      isProcessing={isBusy}
      queue={queue}
      onRemoveFromQueue={onRemoveFromQueue}
      onSteer={onSteer}
      userAvatarSrc={props.userAvatar}
      defaultPrompt={defaultPrompt}
      initialGibbsMode={props.gibbsMode}
      onGibbsModeChange={props.onGibbsModeChange}
    />
  )
}
