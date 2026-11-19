import { Dialog, RadioGroup, Transition } from '@headlessui/react'
import { Fragment, useEffect, useMemo, useState } from 'react'

import { ActionButton } from '@src/components/ActionButton'
import { CustomIcon } from '@src/components/CustomIcon'
import { SettingsTabButton } from '@src/components/Settings/SettingsTabButton'

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
  error?: string | null
  onClose: () => void
  onSave: (compoundIds: string[]) => void
}

type CompoundTab = 'all' | 'selected'

function getMatchRank(compound: CompoundOption, query: string) {
  const name = compound.name.toLowerCase()
  const formula = compound.formula.toLowerCase()
  return [
    name.startsWith(query),
    formula.startsWith(query),
    name.includes(query),
    `${formula} ${compound.category.toLowerCase()}`.includes(query),
  ].indexOf(true)
}

function searchCompounds(compounds: CompoundOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return compounds
  }
  const rank = (compound: CompoundOption) =>
    getMatchRank(compound, normalizedQuery)
  return compounds
    .filter((compound) => rank(compound) >= 0)
    .sort((a, b) => rank(a) - rank(b) || a.name.length - b.name.length)
}

function CompoundRow({
  compound,
  checked,
  onToggle,
}: {
  compound: CompoundOption
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-chalkboard-5 dark:hover:bg-chalkboard-90/60">
        <input
          type="checkbox"
          aria-label={`Select ${compound.name}`}
          checked={checked}
          onChange={onToggle}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{compound.name}</span>
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
}

function getEmptyMessage(
  tab: CompoundTab,
  query: string,
  error: string | null
) {
  if (error) {
    return 'DWSIM compounds are unavailable.'
  }
  if (query.trim()) {
    return 'No compounds match the current search.'
  }
  return tab === 'selected' ? 'No compounds selected.' : 'No compounds found.'
}

export function CompoundsDialog({
  isOpen,
  selectedCompoundIds,
  compounds,
  error = null,
  onClose,
  onSave,
}: CompoundsDialogProps) {
  const [draftCompoundIds, setDraftCompoundIds] =
    useState<string[]>(selectedCompoundIds)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<CompoundTab>('all')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraftCompoundIds(selectedCompoundIds)
    setQuery('')
    setTab('all')
  }, [isOpen, selectedCompoundIds])

  const selectedCompounds = useMemo(() => {
    const compoundsById = new Map(
      compounds.map((compound) => [compound.id, compound])
    )
    return draftCompoundIds.map(
      (id) =>
        compoundsById.get(id) ?? { id, name: id, formula: '', category: '' }
    )
  }, [compounds, draftCompoundIds])

  const visibleCompounds = useMemo(
    () => searchCompounds(tab === 'all' ? compounds : selectedCompounds, query),
    [compounds, selectedCompounds, tab, query]
  )

  const toggleCompound = (compoundId: string) => {
    setDraftCompoundIds((current) =>
      current.includes(compoundId)
        ? current.filter((id) => id !== compoundId)
        : [...current, compoundId]
    )
  }

  const tabs: { value: CompoundTab; label: string }[] = [
    { value: 'all', label: 'All compounds' },
    { value: 'selected', label: `Selected (${draftCompoundIds.length})` },
  ]

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
              {error && (
                <div className="rounded border border-destroy-40 bg-destroy-10 px-3 py-2 text-sm text-destroy-80 dark:border-destroy-60 dark:bg-destroy-90/30 dark:text-destroy-20">
                  {error}
                </div>
              )}
              <RadioGroup
                aria-label="Compound lists"
                aria-orientation="horizontal"
                value={tab}
                onChange={setTab}
                className="flex shrink-0 gap-5 overflow-x-auto border-0 border-b border-chalkboard-20 dark:border-chalkboard-90"
              >
                {tabs.map((item) => (
                  <RadioGroup.Option
                    key={item.value}
                    value={item.value}
                    className={({ checked }) =>
                      `whitespace-nowrap rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${checked ? 'text-primary' : ''}`
                    }
                  >
                    {({ checked }) => (
                      <SettingsTabButton checked={checked} text={item.label} />
                    )}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
              <label>
                <span className="sr-only">Search compounds</span>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, formula, or category"
                  className="w-full rounded border border-chalkboard-30 dark:border-chalkboard-70 bg-chalkboard-5 dark:bg-chalkboard-90 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="overflow-y-auto border border-chalkboard-20 dark:border-chalkboard-80 rounded">
                <ul className="divide-y divide-chalkboard-20 dark:divide-chalkboard-80">
                  {visibleCompounds.map((compound) => (
                    <CompoundRow
                      key={compound.id}
                      compound={compound}
                      checked={draftCompoundIds.includes(compound.id)}
                      onToggle={() => toggleCompound(compound.id)}
                    />
                  ))}
                  {visibleCompounds.length === 0 && (
                    <li className="px-4 py-6 text-sm text-chalkboard-70 dark:text-chalkboard-40">
                      {getEmptyMessage(tab, query, error)}
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
                disabled={!!error || compounds.length === 0}
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
