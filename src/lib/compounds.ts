import type { CompoundOption } from '@src/components/CompoundsDialog'

export const COMPOUNDS_STORAGE_KEY = 'fugacity-selected-compounds'

export const DEFAULT_COMPOUNDS: CompoundOption[] = [
  { id: 'water', name: 'Water', formula: 'H2O', category: 'Utility' },
  { id: 'methane', name: 'Methane', formula: 'CH4', category: 'Hydrocarbon' },
  { id: 'ethane', name: 'Ethane', formula: 'C2H6', category: 'Hydrocarbon' },
  { id: 'propane', name: 'Propane', formula: 'C3H8', category: 'Hydrocarbon' },
  {
    id: 'n-butane',
    name: 'n-Butane',
    formula: 'C4H10',
    category: 'Hydrocarbon',
  },
  { id: 'nitrogen', name: 'Nitrogen', formula: 'N2', category: 'Inert gas' },
  { id: 'oxygen', name: 'Oxygen', formula: 'O2', category: 'Inert gas' },
  {
    id: 'carbon-dioxide',
    name: 'Carbon Dioxide',
    formula: 'CO2',
    category: 'Acid gas',
  },
  {
    id: 'hydrogen-sulfide',
    name: 'Hydrogen Sulfide',
    formula: 'H2S',
    category: 'Acid gas',
  },
  { id: 'hydrogen', name: 'Hydrogen', formula: 'H2', category: 'Light gas' },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH3',
    category: 'Polar compound',
  },
  { id: 'benzene', name: 'Benzene', formula: 'C6H6', category: 'Aromatic' },
]
