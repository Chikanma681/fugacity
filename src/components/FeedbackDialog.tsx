import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { ActionButton } from '@src/components/ActionButton'
import { CustomIcon } from '@src/components/CustomIcon'
import type { FeedbackType, FeedbackUser } from '@src/lib/feedback'
import {
  FEEDBACK_TYPE_LABELS,
  getFeedbackWebhookUrl,
  sendFeedbackToDiscord,
} from '@src/lib/feedback'

const FEEDBACK_TYPES = Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]

type FeedbackDialogProps = {
  isOpen: boolean
  user?: FeedbackUser
  onClose: () => void
}

export function FeedbackDialog({ isOpen, user, onClose }: FeedbackDialogProps) {
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const isConfigured = !!getFeedbackWebhookUrl()
  const canSubmit = isConfigured && !isSending && message.trim().length > 0

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setType('bug')
    setMessage('')
  }, [isOpen])

  const submit = async () => {
    setIsSending(true)
    const error = await sendFeedbackToDiscord({
      type,
      message: message.trim(),
      user,
    })
    setIsSending(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Thanks! Your feedback was sent.')
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        open={isOpen}
        onClose={onClose}
        className="fixed inset-0 z-40 overflow-y-auto p-4 grid place-items-center"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-75"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-chalkboard-110/30 dark:bg-chalkboard-110/50" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-75"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Dialog.Panel className="rounded relative mx-auto bg-chalkboard-10 dark:bg-chalkboard-100 border dark:border-chalkboard-70 max-w-lg w-full shadow-lg flex flex-col">
            <div className="p-5 pb-3 flex justify-between items-start gap-4">
              <div>
                <Dialog.Title className="text-2xl font-bold">
                  Send feedback
                </Dialog.Title>
                <p className="mt-1 text-sm text-chalkboard-70 dark:text-chalkboard-40">
                  Report a bug, request a feature, or tell us what bothers you.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-0 m-0 focus:ring-0 focus:outline-none border-none hover:bg-destroy-10 focus:bg-destroy-10 dark:hover:bg-destroy-80/50 dark:focus:bg-destroy-80/50"
                aria-label="Close feedback dialog"
              >
                <CustomIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-4 flex flex-col gap-4">
              {!isConfigured && (
                <div className="rounded border border-destroy-40 bg-destroy-10 px-3 py-2 text-sm text-destroy-80 dark:border-destroy-60 dark:bg-destroy-90/30 dark:text-destroy-20">
                  Feedback is not configured for this build. Set
                  VITE_FUGACITY_FEEDBACK_WEBHOOK_URL to enable it.
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm">
                <span>Type</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as FeedbackType)
                  }
                  className="rounded border border-chalkboard-30 dark:border-chalkboard-70 bg-chalkboard-5 dark:bg-chalkboard-90 px-3 py-2 text-sm outline-none focus:border-primary"
                  data-testid="feedback-type"
                >
                  {FEEDBACK_TYPES.map((feedbackType) => (
                    <option key={feedbackType} value={feedbackType}>
                      {FEEDBACK_TYPE_LABELS[feedbackType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  placeholder="What happened, or what would you like to see?"
                  className="rounded border border-chalkboard-30 dark:border-chalkboard-70 bg-chalkboard-5 dark:bg-chalkboard-90 px-3 py-2 text-sm outline-none focus:border-primary resize-y"
                  data-testid="feedback-message"
                />
              </label>
            </div>

            <div className="px-5 py-4 border-t border-chalkboard-20 dark:border-chalkboard-80 flex justify-end gap-2">
              <ActionButton Element="button" type="button" onClick={onClose}>
                Cancel
              </ActionButton>
              <ActionButton
                Element="button"
                type="button"
                iconStart={{ icon: 'checkmark' }}
                disabled={!canSubmit}
                onClick={() => void submit()}
                data-testid="feedback-submit"
              >
                {isSending ? 'Sending…' : 'Send feedback'}
              </ActionButton>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
