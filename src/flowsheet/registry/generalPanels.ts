import type { PanelRow } from './types'

export const generalPanels: PanelRow[] = [
  { type: 'label', label: 'Object Property Editor' },
  {
    type: 'description',
    label:
      "Property values are updated/stored as they are changed/edited. There's no need to press ENTER to commit the changes.",
  },
  { type: 'label', label: 'Object Details' },
  { type: 'readonly', label: 'Type', property: 'GetDisplayName()' },
  {
    type: 'readonly',
    label: 'Status',
    property: 'GraphicObject.Active',
    displayValues: { true: 'Active', false: 'Inactive' },
  },
  { type: 'string', label: 'Name', property: 'GraphicObject.Tag' },
  {
    type: 'group',
    label: 'Property Package',
    visibleWhen: {
      property: 'flowsheet.PropertyPackages',
      operator: 'notEmpty',
    },
    rows: [
      {
        type: 'dropdown',
        label: 'Property Package',
        property: 'PropertyPackage',
        options: {
          source: 'propertyPackages',
          labelProperty: 'Tag',
          valueProperty: 'Tag',
        },
      },
    ],
  },
  { type: 'label', label: 'Object Properties' },
]
