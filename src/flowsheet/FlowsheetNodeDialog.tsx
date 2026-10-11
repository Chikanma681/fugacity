import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { CustomIcon } from '@src/components/CustomIcon'
import type { FlowNode } from '@src/flowsheet/types'

export function FlowsheetNodeDialog({
  node,
  open,
  onClose,
}: {
  node: FlowNode
  open: boolean
  onClose: () => void
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
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
          <Dialog.Panel
            data-testid="flowsheet-node-dialog-panel"
            className="rounded relative mx-auto bg-chalkboard-10 dark:bg-chalkboard-100 border dark:border-chalkboard-70 max-w-3xl w-full max-h-[66vh] shadow-lg flex flex-col gap-8"
          >
            <div className="p-5 pb-0 flex justify-between items-center gap-4">
              <Dialog.Title as="h1" className="text-2xl font-bold">
                {node.tag}
              </Dialog.Title>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close node dialog"
                className="p-0 m-0 focus:ring-0 focus:outline-none border-none hover:bg-destroy-10 focus:bg-destroy-10 dark:hover:bg-destroy-80/50 dark:focus:bg-destroy-80/50"
                data-testid="flowsheet-node-close-button"
              >
                <CustomIcon name="close" className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pb-5 overflow-y-auto">
              <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
                <dt className="font-semibold">Tag</dt>
                <dd>{node.tag}</dd>
                <dt className="font-semibold">Type</dt>
                <dd>{node.label}</dd>
              </dl>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
