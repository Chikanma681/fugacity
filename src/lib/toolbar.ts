import type { EventFrom, StateFrom } from 'xstate'
import { useMemo } from 'react'

import type { CustomIconName } from '@src/components/CustomIcon'
import { createLiteral } from '@src/lang/create'
import { isDesktop } from '@src/lib/isDesktop'
import { isPlaywright } from '@src/lib/isPlaywright'
import { useApp } from '@src/lib/boot'
import { withSiteBaseURL } from '@src/lib/withBaseURL'
import type { modelingMachine } from '@src/machines/modelingMachine'
import {
  isEditingExistingSketch,
  pipeHasCircle,
} from '@src/machines/modelingMachine'
import { isSketchBlockSelected } from '@src/machines/sketchSolve/sketchSolveImpl'
import { getSelectedTangentConstraintInput } from '@src/machines/sketchSolve/constraints/constraintUtils'
import type { ModuleType } from '@src/lib/wasm_lib_wrapper'
import { IS_STAGING_OR_DEBUG } from '@src/routes/utils'

export type ToolbarModeName = 'modeling' | 'sketching' | 'sketchSolve'

type ToolbarMode = {
  items: (ToolbarItem | ToolbarDropdown | 'break')[]
}

export type ToolbarDropdown = {
  id: string
  array: ToolbarItem[]
}

export interface ToolbarItemCallbackProps {
  modelingState: StateFrom<typeof modelingMachine>
  modelingSend: (event: EventFrom<typeof modelingMachine>) => void
  sketchPathId: string | false
  editorHasFocus: boolean | undefined
  isActive: boolean
}

export type ToolbarItem = {
  id: string
  onClick: (props: ToolbarItemCallbackProps) => void
  icon?: CustomIconName
  iconColor?: string
  alwaysDark?: true
  status: 'available' | 'unavailable' | 'kcl-only' | 'experimental'
  disabled?: (
    state: StateFrom<typeof modelingMachine>,
    wasmInstance: ModuleType
  ) => boolean
  disableHotkey?: (state: StateFrom<typeof modelingMachine>) => boolean
  title: string | ((props: ToolbarItemCallbackProps) => string)
  showTitle?: boolean
  hotkey?:
  | string
  | ((state: StateFrom<typeof modelingMachine>) => string | string[])
  description: string
  extraNote?: string
  links: { label: string; url: string }[]
  isActive?: (state: StateFrom<typeof modelingMachine>) => boolean
  disabledReason?:
  | string
  | ((state: StateFrom<typeof modelingMachine>) => string | undefined)
}

export type ToolbarItemResolved = Omit<
  ToolbarItem,
  'disabled' | 'disableHotkey' | 'hotkey' | 'isActive' | 'title'
> & {
  title: string
  disabled?: boolean
  disableHotkey?: boolean
  hotkey?: string | string[]
  isActive?: boolean
  callbackProps: ToolbarItemCallbackProps
}

export type ToolbarItemResolvedDropdown = {
  id: string
  array: ToolbarItemResolved[]
}

export const isToolbarItemResolvedDropdown = (
  item: ToolbarItemResolved | ToolbarItemResolvedDropdown
): item is ToolbarItemResolvedDropdown => {
  return (item as ToolbarItemResolvedDropdown).array !== undefined
}

export const useToolbarConfig = () => {
  const { commands } = useApp()
  return useMemo<Record<ToolbarModeName, ToolbarMode>>(
    () => ({
      modeling: {
        check: (state) =>
          !(
            state.matches('Sketch') ||
            state.matches('Sketch no face') ||
            state.matches('animating to existing sketch') ||
            state.matches('animating to plane') ||
            state.matches('sketchSolveMode')
          ),
        items: [
          {
            id: 'property-packages',
            array: [
              {
                id: 'property-package-selector',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'Property Package',
                showTitle: true,
                description:
                  'Choose the thermodynamic property package for the process simulation model.',
                extraNote:
                  'Thermodynamics commands are not implemented yet, so package selection is currently a placeholder for the simulator workflow.',
                links: [],
              },
              {
                id: 'property-package-peng-robinson',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'Peng-Robinson',
                description:
                  'Cubic equation of state commonly used for hydrocarbons and high-pressure vapor-liquid equilibrium.',
                links: [],
              },
              {
                id: 'property-package-srk',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'Soave-Redlich-Kwong',
                description:
                  'Cubic equation of state often used for gas processing and light hydrocarbon systems.',
                links: [],
              },
              {
                id: 'property-package-nrtl',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'NRTL',
                description:
                  'Activity-coefficient model suited to strongly non-ideal liquid mixtures.',
                links: [],
              },
              {
                id: 'property-package-unifac',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'UNIFAC',
                description:
                  'Group-contribution activity-coefficient model for estimating non-ideal liquid behavior.',
                links: [],
              },
              {
                id: 'property-package-ideal',
                onClick: () => { },
                icon: 'beaker',
                status: 'unavailable',
                title: 'Ideal',
                description:
                  'Ideal-mixture approximation for simple cases and baseline studies.',
                links: [],
              },
            ],
          },
          'break',
          {
            id: 'sketch',
            onClick: ({
              modelingSend,
              modelingState,
              sketchPathId,
              editorHasFocus,
            }) => {
              const isSketchBlock = isSketchBlockSelected(
                modelingState.context.selectionRanges
              )

              // Don't force new sketch if we're in a sketch block or have a sketchBlock selected
              if ((editorHasFocus && sketchPathId) || isSketchBlock) {
                modelingSend({ type: 'Enter sketch' })
              } else {
                // No sketch context - start new sketch
                modelingSend({
                  type: 'Enter sketch',
                  data: { forceNewSketch: true },
                })
              }
            },
            icon: 'sketch',
            status: 'available',
            title: ({ editorHasFocus, sketchPathId, modelingState }) => {
              const isSketchBlock = isSketchBlockSelected(
                modelingState.context.selectionRanges
              )

              if ((editorHasFocus && sketchPathId) || isSketchBlock) {
                return 'Edit Sketch'
              } else {
                return 'Start Sketch'
              }
            },
            showTitle: true,
            hotkey: 'S',
            description: 'Start drawing a 2D sketch.',
            links: [
              {
                label: 'KCL docs',
                url: withSiteBaseURL(
                  '/docs/kcl-std/functions/std-sketch-startSketchOn'
                ),
              },
            ],
          },
        ],
      },
      sketching: {
        check: (state) =>
          state.matches('Sketch') ||
          state.matches('Sketch no face') ||
          state.matches('animating to existing sketch') ||
          state.matches('animating to plane'),
        items: [
          {
            id: 'sketch-exit',
            onClick: ({ modelingSend }) =>
              modelingSend({
                type: 'Cancel',
              }),
            disableHotkey: (state) =>
              !(
                state.matches({ Sketch: 'SketchIdle' }) ||
                state.matches('Sketch no face')
              ),
            icon: 'arrowShortLeft',
            status: 'available',
            title: 'Exit sketch',
            showTitle: true,
            hotkey: 'Esc',
            description: 'Exit the current sketch',
            links: [],
          },
          'break',
          {
            id: 'line',
            onClick: ({ modelingState, modelingSend }) => {
              modelingSend({
                type: 'change tool',
                data: {
                  tool: !modelingState.matches({ Sketch: 'Line tool' })
                    ? 'line'
                    : 'none',
                },
              })
            },
            icon: 'line',
            status: 'available',
            disabled: (state) => state.matches('Sketch no face'),
            title: 'Line',
            hotkey: (state) =>
              state.matches({ Sketch: 'Line tool' }) ? ['Esc', 'L'] : 'L',
            description: 'Start drawing straight lines',
            links: [],
            isActive: (state) => state.matches({ Sketch: 'Line tool' }),
          },
          {
            id: 'arcs',
            array: [
              {
                id: 'three-point-arc',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({
                        Sketch: 'Arc three point tool',
                      })
                        ? 'arcThreePoint'
                        : 'none',
                    },
                  }),
                icon: 'arc',
                status: 'available',
                title: 'Three-point Arc',
                hotkey: (state) =>
                  state.matches({ Sketch: 'Arc three point tool' })
                    ? ['Esc', 'T']
                    : 'T',
                showTitle: false,
                description: 'Draw a circular arc defined by three points',
                links: [
                  {
                    label: 'GitHub issue',
                    url: 'https://github.com/KittyCAD/modeling-app/issues/1659',
                  },
                ],
                isActive: (state) =>
                  state.matches({ Sketch: 'Arc three point tool' }),
              },
              {
                id: 'tangential-arc',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({
                        Sketch: 'Tangential arc to',
                      })
                        ? 'tangentialArc'
                        : 'none',
                    },
                  }),
                icon: 'arc',
                status: 'available',
                disabled: (state) => {
                  return (
                    (!isEditingExistingSketch({
                      sketchDetails: state.context.sketchDetails,
                      kclManager: state.context.kclManager,
                      wasmInstance: state.context.wasmInstance,
                    }) &&
                      !state.matches({ Sketch: 'Tangential arc to' })) ||
                    pipeHasCircle({
                      sketchDetails: state.context.sketchDetails,
                      kclManager: state.context.kclManager,
                      wasmInstance: state.context.wasmInstance,
                    })
                  )
                },
                disabledReason: (state) => {
                  return !isEditingExistingSketch({
                    sketchDetails: state.context.sketchDetails,
                    kclManager: state.context.kclManager,
                    wasmInstance: state.context.wasmInstance,
                  }) && !state.matches({ Sketch: 'Tangential arc to' })
                    ? "Cannot start a tangential arc because there's no previous line to be tangential to.  Try drawing a line first or selecting an existing sketch to edit."
                    : undefined
                },
                title: 'Tangential Arc',
                hotkey: (state) =>
                  state.matches({ Sketch: 'Tangential arc to' })
                    ? ['Esc', 'A']
                    : 'A',
                description:
                  'Start drawing an arc tangent to the current segment',
                links: [],
                isActive: (state) =>
                  state.matches({ Sketch: 'Tangential arc to' }),
              },
            ],
          },
          'break',
          {
            id: 'circles',
            array: [
              {
                id: 'circle-center',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({ Sketch: 'Circle tool' })
                        ? 'circle'
                        : 'none',
                    },
                  }),
                icon: 'circle',
                status: 'available',
                title: 'Center circle',
                disabled: (state) => state.matches('Sketch no face'),
                isActive: (state) => state.matches({ Sketch: 'Circle tool' }),
                hotkey: (state) =>
                  state.matches({ Sketch: 'Circle tool' }) ? ['Esc', 'C'] : 'C',
                showTitle: false,
                description: 'Start drawing a circle from its center',
                links: [],
              },
              {
                id: 'circle-three-points',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({
                        Sketch: 'Circle three point tool',
                      })
                        ? 'circleThreePoint'
                        : 'none',
                    },
                  }),
                icon: 'circle',
                status: 'available',
                title: '3-point circle',
                isActive: (state) =>
                  state.matches({ Sketch: 'Circle three point tool' }),
                hotkey: (state) =>
                  state.matches({ Sketch: 'Circle three point tool' })
                    ? ['Alt+C', 'Esc']
                    : 'Alt+C',
                showTitle: false,
                description: 'Draw a circle defined by three points',
                links: [],
              },
            ],
          },
          {
            id: 'rectangles',
            array: [
              {
                id: 'corner-rectangle',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({ Sketch: 'Rectangle tool' })
                        ? 'rectangle'
                        : 'none',
                    },
                  }),
                icon: 'rectangle',
                status: 'available',
                disabled: (state) => state.matches('Sketch no face'),
                title: 'Corner rectangle',
                hotkey: (state) =>
                  state.matches({ Sketch: 'Rectangle tool' })
                    ? ['Esc', 'R']
                    : 'R',
                description: 'Start drawing a rectangle',
                links: [],
                isActive: (state) =>
                  state.matches({ Sketch: 'Rectangle tool' }),
              },
              {
                id: 'center-rectangle',
                onClick: ({ modelingState, modelingSend }) =>
                  modelingSend({
                    type: 'change tool',
                    data: {
                      tool: !modelingState.matches({
                        Sketch: 'Center Rectangle tool',
                      })
                        ? 'center rectangle'
                        : 'none',
                    },
                  }),
                icon: 'rectangle',
                status: 'available',
                disabled: (state) => state.matches('Sketch no face'),
                title: 'Center rectangle',
                description: 'Start drawing a rectangle from its center',
                links: [],
                hotkey: (state) =>
                  state.matches({ Sketch: 'Center Rectangle tool' })
                    ? ['Alt+R', 'Esc']
                    : 'Alt+R',
                isActive: (state) =>
                  state.matches({ Sketch: 'Center Rectangle tool' }),
              },
            ],
          },
          {
            id: 'polygon',
            onClick: () => console.error('Polygon not yet implemented'),
            icon: 'polygon',
            status: 'kcl-only',
            title: 'Polygon',
            showTitle: false,
            description: 'Draw a polygon with a specified number of sides',
            links: [
              {
                label: 'KCL docs',
                url: withSiteBaseURL(
                  '/docs/kcl-std/functions/std-sketch-polygon'
                ),
              },
            ],
          },
          'break',
          {
            id: 'mirror',
            onClick: () => console.error('Mirror not yet implemented'),
            icon: 'mirror',
            status: 'kcl-only',
            title: 'Mirror',
            showTitle: false,
            description: 'Mirror sketch entities about a line or axis',
            links: [
              {
                label: 'KCL docs',
                url: withSiteBaseURL(
                  '/docs/kcl-std/functions/std-transform-mirror2d'
                ),
              },
            ],
          },
          {
            id: 'constraints',
            array: [
              {
                id: 'constraint-length',
                disabled: (state, wasmInstance) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({
                      type: 'Constrain length',
                      data: {
                        selection: state.context.selectionRanges,
                        // dummy data is okay for checking if the constrain is possible
                        length: {
                          valueAst: createLiteral(1, wasmInstance),
                          valueText: '1',
                          valueCalculated: '1',
                        },
                      },
                    })
                  ),
                onClick: () =>
                  commands.send({
                    type: 'Find and select command',
                    data: {
                      name: 'Constrain length',
                      groupId: 'modeling',
                    },
                  }),
                icon: 'dimension',
                status: 'available',
                title: 'Length',
                showTitle: false,
                description: 'Constrain the length of a straight segment',
                links: [],
              },
              {
                id: 'constraint-angle',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain angle' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain angle' }),
                status: 'available',
                title: 'Angle',
                showTitle: false,
                description: 'Constrain the angle between two segments',
                links: [],
              },
              {
                id: 'constraint-vertical',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Make segment vertical' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Make segment vertical' }),
                status: 'available',
                title: 'Vertical',
                showTitle: false,
                description:
                  'Constrain a straight segment to be vertical relative to the sketch',
                links: [],
              },
              {
                id: 'constraint-horizontal',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Make segment horizontal' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Make segment horizontal' }),
                status: 'available',
                title: 'Horizontal',
                showTitle: false,
                description:
                  'Constrain a straight segment to be horizontal relative to the sketch',
                links: [],
              },
              {
                id: 'constraint-parallel',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain parallel' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain parallel' }),
                status: 'available',
                title: 'Parallel',
                showTitle: false,
                description: 'Constrain two segments to be parallel',
                links: [],
              },
              {
                id: 'constraint-equal-length',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain equal length' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain equal length' }),
                status: 'available',
                title: 'Equal length',
                showTitle: false,
                description:
                  'Constrain two or more segments to have equal length',
                links: [],
              },
              {
                id: 'constraint-horizontal-distance',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain horizontal distance' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain horizontal distance' }),
                status: 'available',
                title: 'Horizontal distance',
                showTitle: false,
                description:
                  'Constrain the horizontal distance between two points',
                links: [],
              },
              {
                id: 'constraint-vertical-distance',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain vertical distance' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain vertical distance' }),
                status: 'available',
                title: 'Vertical distance',
                showTitle: false,
                description:
                  'Constrain the vertical distance between two points',
                links: [],
              },
              {
                id: 'constraint-absolute-x',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain ABS X' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain ABS X' }),
                status: 'available',
                title: 'Absolute X',
                showTitle: false,
                description: 'Constrain the x-coordinate of a point',
                links: [],
              },
              {
                id: 'constraint-absolute-y',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain ABS Y' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain ABS Y' }),
                status: 'available',
                title: 'Absolute Y',
                showTitle: false,
                description: 'Constrain the y-coordinate of a point',
                links: [],
              },
              {
                id: 'constraint-perpendicular-distance',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain perpendicular distance' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain perpendicular distance' }),
                status: 'available',
                title: 'Perpendicular distance',
                showTitle: false,
                description:
                  'Constrain the perpendicular distance between two segments',
                links: [],
              },
              {
                id: 'constraint-align-horizontal',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain horizontally align' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain horizontally align' }),
                status: 'available',
                title: 'Horizontally align',
                showTitle: false,
                description:
                  'Align the ends of two or more segments horizontally',
                links: [],
              },
              {
                id: 'constraint-align-vertical',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain vertically align' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain vertically align' }),
                status: 'available',
                title: 'Vertically align',
                showTitle: false,
                description:
                  'Align the ends of two or more segments vertically',
                links: [],
              },
              {
                id: 'snap-to-x',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain snap to X' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain snap to X' }),
                status: 'available',
                title: 'Snap to X',
                showTitle: false,
                description: 'Snap a point to an x-coordinate',
                links: [],
              },
              {
                id: 'snap-to-y',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain snap to Y' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain snap to Y' }),
                status: 'available',
                title: 'Snap to Y',
                showTitle: false,
                description: 'Snap a point to a y-coordinate',
                links: [],
              },
              {
                id: 'constraint-remove',
                disabled: (state) =>
                  !(
                    state.matches({ Sketch: 'SketchIdle' }) &&
                    state.can({ type: 'Constrain remove constraints' })
                  ),
                onClick: ({ modelingSend }) =>
                  modelingSend({ type: 'Constrain remove constraints' }),
                status: 'available',
                title: 'Remove constraints',
                showTitle: false,
                description: 'Remove all constraints from the segment',
                links: [],
              },
            ],
          },
        ],
      },
      sketchSolve: {
        check: (state) => state.matches('sketchSolveMode'),
        items: [
          {
            id: 'sketch-exit',
            onClick: ({ modelingSend }) =>
              modelingSend({
                type: 'Exit sketch',
              }),
            icon: 'arrowShortLeft',
            status: 'available',
            title: 'Exit sketch',
            showTitle: true,
            description: 'Exit the current sketch',
            links: [],
          },
          'break',
          {
            id: 'line',
            onClick: ({ modelingSend, isActive }) =>
              isActive
                ? modelingSend({
                  type: 'unequip tool',
                })
                : modelingSend({
                  type: 'equip tool',
                  data: { tool: 'lineTool' },
                }),
            icon: 'line',
            status: 'available',
            title: 'Line',
            hotkey: 'L',
            description: 'Start drawing straight lines',
            links: [],
            isActive: (state) =>
              state.matches('sketchSolveMode') &&
              state.context.sketchSolveToolName === 'lineTool',
          },
          {
            id: 'point',
            onClick: ({ modelingSend, isActive }) =>
              isActive
                ? modelingSend({
                  type: 'unequip tool',
                })
                : modelingSend({
                  type: 'equip tool',
                  data: { tool: 'pointTool' },
                }),
            icon: 'oneDot',
            status: 'available',
            title: 'Point',
            hotkey: 'P',
            description: 'Start drawing straight points',
            links: [],
            isActive: (state) =>
              state.matches('sketchSolveMode') &&
              state.context.sketchSolveToolName === 'pointTool',
          },
          {
            id: 'arcs',
            array: [
              {
                id: 'center-arc',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'centerArcTool' },
                    }),
                icon: 'arcCenter',
                status: 'available',
                title: 'Center Arc',
                hotkey: 'A',
                description: 'Draw an arc by center and two endpoints',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'centerArcTool',
              },
              {
                id: 'three-point-arc',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'threePointArcTool' },
                    }),
                icon: 'arc',
                status: 'available',
                title: '3-Point Arc',
                description: 'Draw an arc from start, end, and a third point',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'threePointArcTool',
              },
              {
                id: 'tangential-arc',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'tangentialArcTool' },
                    }),
                icon: 'tangent',
                status: 'available',
                title: 'Tangential Arc',
                hotkey: 'Shift+A',
                description: 'Draw an arc tangent to an existing line endpoint',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'tangentialArcTool',
              },
            ],
          },
          {
            id: 'trim',
            onClick: ({ modelingSend, isActive }) =>
              isActive
                ? modelingSend({ type: 'unequip tool' })
                : modelingSend({
                  type: 'equip tool',
                  data: { tool: 'trimTool' },
                }),
            icon: 'trimTool',
            status: 'experimental',
            title: 'Trim',
            hotkey: 'T',
            description:
              'Draw a trimming line through parts of segments to be removed',
            links: [],
            isActive: (state) =>
              state.matches('sketchSolveMode') &&
              state.context.sketchSolveToolName === 'trimTool',
          },
          {
            id: 'rectangles',
            array: [
              {
                id: 'corner-rectangle',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'cornerRectTool' },
                    }),
                icon: 'rectangle',
                status: 'available',
                title: 'Corner Rectangle',
                hotkey: 'Shift+R',
                description: 'Start drawing a rectangle',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'cornerRectTool',
              },
              {
                id: 'center-rectangle',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'centerRectTool' },
                    }),
                icon: 'rectangleCenter',
                status: 'available',
                title: 'Center Rectangle',
                hotkey: 'Alt+R',
                description: 'Start drawing a rectangle from its center',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'centerRectTool',
              },
              {
                id: 'angled-rectangle',
                onClick: ({ modelingSend, isActive }) =>
                  isActive
                    ? modelingSend({
                      type: 'unequip tool',
                    })
                    : modelingSend({
                      type: 'equip tool',
                      data: { tool: 'angledRectTool' },
                    }),
                icon: 'rectangleAngled',
                status: 'available',
                title: 'Angled Rectangle',
                description: 'Draw a rotated rectangle with three clicks',
                links: [],
                isActive: (state) =>
                  state.matches('sketchSolveMode') &&
                  state.context.sketchSolveToolName === 'angledRectTool',
              },
            ],
          },
          'break',
          {
            id: 'coincident',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'coincident',
              }),
            icon: 'coincident',
            status: 'available',
            title: 'Coincident',
            hotkey: 'C',
            description: 'Constrain points or curves to be coincident',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'Tangent',
            onClick: ({ modelingSend }) =>
              modelingSend({
                type: 'Tangent',
              }),
            icon: 'tangent',
            status: 'available',
            disabled: (state) =>
              getSelectedTangentConstraintInput(state) === null,
            disabledReason: (state) =>
              getSelectedTangentConstraintInput(state) === null
                ? 'Select a line and an arc, or two arcs, to add a tangent constraint.'
                : undefined,
            title: 'Tangent',
            hotkey: 'Shift+T',
            description:
              'Constrain a selected line and arc, or two arcs, to be tangent at their shared contact.',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'Parallel',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'Parallel',
              }),
            icon: 'parallel',
            status: 'available',
            title: 'Parallel',
            hotkey: 'Shift+P',
            description: 'Constrain lines or curves to be parallel',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'Perpendicular',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'Perpendicular',
              }),
            icon: 'perpendicular',
            status: 'available',
            title: 'Perpendicular',
            hotkey: 'R',
            description: 'Constrain lines or curves to be perpendicular',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'equalLength',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'LinesEqualLength',
              }),
            icon: 'equal',
            status: 'available',
            title: 'Equal Length',
            hotkey: 'E',
            description: 'Constrain lines to have equal length',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'vertical',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'Vertical',
              }),
            icon: 'vertical',
            status: 'available',
            title: 'Vertical',
            hotkey: 'V',
            description: 'Constrain lines to be vertical',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'Horizontal',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'Horizontal',
              }),
            icon: 'horizontal',
            status: 'available',
            title: 'Horizontal',
            hotkey: 'H',
            description: 'Constrain lines to be horizontal',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'Dimension',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'Dimension',
              }),
            icon: 'dimension',
            status: 'available',
            title: 'Dimension',
            hotkey: 'D',
            description:
              'Constrain distance between points, length of lines, or radius of arcs',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'HorizontalDistance',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'HorizontalDistance',
              }),
            icon: 'horizontalDimension',
            status: 'available',
            title: 'Horizontal Distance',
            hotkey: 'Shift+D',
            description: 'Constrain horizontal distance between two points',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'VerticalDistance',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'VerticalDistance',
              }),
            icon: 'verticalDimension',
            status: 'available',
            title: 'Vertical Distance',
            hotkey: 'Shift+V',
            description: 'Constrain vertical distance between two points',
            links: [],
            isActive: (state) => false,
          },
          {
            id: 'construction',
            onClick: ({ modelingSend, isActive }) =>
              modelingSend({
                type: 'construction',
              }),
            icon: 'construction',
            status: 'available',
            title: 'Construction',
            description: 'Toggle construction geometry on selected segments',
            links: [],
            isActive: (state) => false,
          },
        ],
      },
    }),
    [commands]
  )
}

/**
 * Derives a map of sketchSolve tool names to their icon names from the toolbar config.
 * This ensures a single source of truth for tool-to-icon mappings.
 * Extracts tool names by parsing the isActive function which references state.context.sketchSolveToolName.
 */
export function getSketchSolveToolIconMap(
  toolbarConfig: Record<ToolbarModeName, ToolbarMode>
): Record<string, CustomIconName> {
  const map: Record<string, CustomIconName> = {}
  const items = toolbarConfig.sketchSolve.items
  collectItems(items, map)
  return map
}

function collectItems(
  items: ToolbarMode['items'],
  map: Record<string, CustomIconName>
) {
  for (const item of items) {
    // Skip 'break' strings
    if (typeof item === 'string') continue

    // dropdowns, eg. rectangles
    if ('array' in item) {
      collectItems(item.array, map)
      continue
    }

    // Now TypeScript knows item is ToolbarItem
    // Only process items that have an icon and an isActive function (which indicates it's a tool)
    if (item.icon && item.isActive) {
      // Extract tool name from isActive function string representation
      // The isActive function references the tool name like: state.context.sketchSolveToolName === 'toolName'
      const isActiveStr = item.isActive.toString()
      const toolNameMatch = isActiveStr.match(
        /sketchSolveToolName\s*===\s*['"]([^'"]+)['"]/
      )
      if (toolNameMatch && toolNameMatch[1]) {
        map[toolNameMatch[1]] = item.icon
      }
    }
  }
}
