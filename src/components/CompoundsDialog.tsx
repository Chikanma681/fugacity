import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useMemo, useState } from 'react'

import { ActionButton } from '@src/components/ActionButton'
import { CustomIcon } from '@src/components/CustomIcon'

export type CompoundOption = {
  id: string
  name: string
  formula: string
  category: string
}

type CompoundsDialogProps = {
  isOpen: boolean
  selectedCompoundIds: string[]
  compounds: CompoundOption[]
  onClose: () => void
  onSave: (compoundIds: string[]) => void
}

export function CompoundsDialog({
  isOpen,
  selectedCompoundIds,
  compounds,
  onClose,
  onSave,
}: CompoundsDialogProps) {
  const [draftCompoundIds, setDraftCompoundIds] =
    useState<string[]>(selectedCompoundIds)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraftCompoundIds(selectedCompoundIds)
    setQuery('')
  }, [isOpen, selectedCompoundIds])

  const filteredCompounds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return compounds
    }

    return compounds.filter((compound) => {
      const haystack = `${compound.name} ${compound.formula} ${compound.category}`
      return haystack.toLowerCase().includes(normalizedQuery)
    })
  }, [compounds, query])

  const selectedCount = draftCompoundIds.length

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
          <Dialog.Panel className="rounded relative mx-auto bg-chalkboard-10 dark:bg-chalkboard-100 border dark:border-chalkboard-70 max-w-3xl w-full max-h-[70vh] shadow-lg flex flex-col">
            <div className="p-5 pb-3 flex justify-between items-start gap-4">
              <div>
                <Dialog.Title className="text-2xl font-bold">
                  Compounds
                </Dialog.Title>
                <p className="mt-1 text-sm text-chalkboard-70 dark:text-chalkboard-40">
                  Select the compounds available to the process simulation.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-0 m-0 focus:ring-0 focus:outline-none border-none hover:bg-destroy-10 focus:bg-destroy-10 dark:hover:bg-destroy-80/50 dark:focus:bg-destroy-80/50"
                aria-label="Close compounds dialog"
              >
                <CustomIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-4 flex flex-col gap-4 overflow-hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex-1">
                  <span className="sr-only">Search compounds</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, formula, or category"
                    className="w-full rounded border border-chalkboard-30 dark:border-chalkboard-70 bg-chalkboard-5 dark:bg-chalkboard-90 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <div className="text-sm text-chalkboard-70 dark:text-chalkboard-40">
                  {selectedCount} selected
                </div>
              </div>

              <div className="overflow-y-auto border border-chalkboard-20 dark:border-chalkboard-80 rounded">
                <ul className="divide-y divide-chalkboard-20 dark:divide-chalkboard-80">
                  {filteredCompounds.map((compound) => {
                    const checked = draftCompoundIds.includes(compound.id)

                    return (
                      <li key={compound.id}>
                        <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-chalkboard-5 dark:hover:bg-chalkboard-90/60">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setDraftCompoundIds((current) =>
                                checked
                                  ? current.filter((id) => id !== compound.id)
                                  : [...current, compound.id]
                              )
                            }}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-medium">
                                {compound.name}
                              </span>
                              <span className="text-xs uppercase tracking-wide text-chalkboard-70 dark:text-chalkboard-40">
                                {compound.formula}
                              </span>
                            </div>
                            <p className="text-sm text-chalkboard-70 dark:text-chalkboard-40">
                              {compound.category}
                            </p>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                  {filteredCompounds.length === 0 && (
                    <li className="px-4 py-6 text-sm text-chalkboard-70 dark:text-chalkboard-40">
                      No compounds match the current search.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-chalkboard-20 dark:border-chalkboard-80 flex justify-end gap-2">
              <ActionButton Element="button" type="button" onClick={onClose}>
                Cancel
              </ActionButton>
              <ActionButton
                Element="button"
                type="button"
                iconStart={{ icon: 'checkmark' }}
                onClick={() => onSave(draftCompoundIds)}
              >
                Apply compounds
              </ActionButton>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
