import type {
  AxisDirectionPair,
  OutputFormat3d,
  UnitLength,
} from '@kittycad/lib'

import type { HoleBody, HoleBottom, HoleType } from '@src/lang/modifyAst/faces'
import type { SweepRelativeTo } from '@src/lang/modifyAst/sweeps'
import type { PathToNode } from '@src/lang/wasm'
import type { KclCommandValue } from '@src/lib/commandTypes'
import type {
  KclPreludeBodyType,
  KclPreludeExtrudeMethod,
} from '@src/lib/constants'
import type { Selections, SketchTool } from '@src/machines/modelingSharedTypes'

type OutputFormat = OutputFormat3d
type OutputTypeKey = OutputFormat['type']
type ExtractStorageTypes<T> = T extends { storage: infer U } ? U : never
type StorageUnion = ExtractStorageTypes<OutputFormat>

export type HelixModes = 'Axis' | 'Edge' | 'Cylinder'

export type ModelingCommandSchema = {
  'Enter sketch': { forceNewSketch?: boolean }
  Export: {
    type: OutputTypeKey
    storage?: StorageUnion
    up?: AxisDirectionPair['axis']
    scale?: UnitLength
  }
  Extrude: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments
    sketches: Selections
    length?: KclCommandValue
    to?: Selections
    symmetric?: boolean
    bidirectionalLength?: KclCommandValue
    tagStart?: string
    tagEnd?: string
    twistAngle?: KclCommandValue
    twistAngleStep?: KclCommandValue
    twistCenter?: KclCommandValue
    // TODO: figure out if we should expose `tolerance` or not
    // @pierremtb: I don't even think it should be in KCL
    method?: KclPreludeExtrudeMethod
    hideSeams?: boolean
    bodyType?: KclPreludeBodyType
  }
  Sweep: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments
    sketches: Selections
    path: Selections
    sectional?: boolean
    // TODO: figure out if we should expose `tolerance` or not
    relativeTo?: SweepRelativeTo
    tagStart?: string
    tagEnd?: string
    bodyType?: KclPreludeBodyType
  }
  Loft: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments
    sketches: Selections
    vDegree?: KclCommandValue
    bezApproximateRational?: boolean
    baseCurveIndex?: KclCommandValue
    // TODO: figure out if we should expose `tolerance` or not
    tagStart?: string
    tagEnd?: string
    bodyType?: KclPreludeBodyType
  }
  Revolve: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // Flow arg
    axisOrEdge: 'Axis' | 'Edge'
    // KCL stdlib arguments
    sketches: Selections
    axis: string | undefined
    edge: Selections | undefined
    angle: KclCommandValue
    // TODO: figure out if we should expose `tolerance` or not
    tagStart?: string
    tagEnd?: string
    symmetric?: boolean
    bidirectionalAngle?: KclCommandValue
    bodyType?: KclPreludeBodyType
  }
  Shell: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments, note that we'll be inferring solids from faces here
    faces: Selections
    thickness: KclCommandValue
  }
  Hole: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments, note that we'll be inferring solids from faces here
    face: Selections
    cutAt: KclCommandValue
    holeBody: HoleBody
    blindDepth?: KclCommandValue
    blindDiameter?: KclCommandValue
    holeType: HoleType
    counterboreDepth?: KclCommandValue
    counterboreDiameter?: KclCommandValue
    countersinkAngle?: KclCommandValue
    countersinkDiameter?: KclCommandValue
    holeBottom: HoleBottom
    drillPointAngle?: KclCommandValue
  }
  Fillet: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments
    selection: Selections // this is named 'tags' in the stdlib
    radius: KclCommandValue
    tag?: string
  }
  Chamfer: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // KCL stdlib arguments
    selection: Selections // this is named 'tags' in the stdlib
    length: KclCommandValue
    secondLength?: KclCommandValue
    angle?: KclCommandValue
    tag?: string
  }
  'Offset plane': {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    plane: Selections
    offset: KclCommandValue
  }
  Helix: {
    // Enables editing workflow
    nodeToEdit?: PathToNode
    // Flow arg
    mode: HelixModes
    // Three different arguments depending on mode
    axis?: string
    edge?: Selections
    cylinder?: Selections
    // KCL stdlib arguments
    revolutions: KclCommandValue
    angleStart: KclCommandValue
    radius?: KclCommandValue // axis or edge modes only
    length?: KclCommandValue // axis or edge modes only
    ccw?: boolean // optional boolean argument, default value to false
  }
  'change tool': {
    tool: SketchTool
  }
  'Constrain length': {
    selection: Selections
    length: KclCommandValue
  }
  'Constrain with named value': {
    currentValue: {
      valueText: string
      pathToNode: PathToNode
      variableName: string
    }
    namedValue: KclCommandValue
  }
  'Prompt-to-edit': {
    prompt: string
    selection: Selections
  }
  // TODO: {} means any non-nullish value. This is probably not what we want.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  'Delete selection': {}
  Appearance: {
    nodeToEdit?: PathToNode
    objects: Selections
    color: string
    metalness?: KclCommandValue
    roughness?: KclCommandValue
    opacity?: KclCommandValue
  }
  Translate: {
    nodeToEdit?: PathToNode
    objects: Selections
    x?: KclCommandValue
    y?: KclCommandValue
    z?: KclCommandValue
    global?: boolean
  }
  Rotate: {
    nodeToEdit?: PathToNode
    objects: Selections
    roll?: KclCommandValue
    pitch?: KclCommandValue
    yaw?: KclCommandValue
    global?: boolean
  }
  Scale: {
    nodeToEdit?: PathToNode
    objects: Selections
    x?: KclCommandValue
    y?: KclCommandValue
    z?: KclCommandValue
    factor?: KclCommandValue
    global?: boolean
  }
  Clone: {
    nodeToEdit?: PathToNode
    objects: Selections
    variableName: string
  }
  'Pattern Circular 3D': {
    nodeToEdit?: PathToNode
    solids: Selections
    instances: KclCommandValue
    axis: string
    center: KclCommandValue
    arcDegrees?: KclCommandValue
    rotateDuplicates?: boolean
    useOriginal?: boolean
  }
  'Pattern Linear 3D': {
    nodeToEdit?: PathToNode
    solids: Selections
    instances: KclCommandValue
    distance: KclCommandValue
    axis: string
    useOriginal?: boolean
  }
  'GDT Flatness': {
    nodeToEdit?: PathToNode
    faces: Selections
    tolerance: KclCommandValue
    precision?: KclCommandValue
    framePosition?: KclCommandValue
    framePlane?: string
    leaderScale?: KclCommandValue
    fontPointSize?: KclCommandValue
    fontScale?: KclCommandValue
  }
  'GDT Datum': {
    nodeToEdit?: PathToNode
    faces: Selections
    name: string
    framePosition?: KclCommandValue
    framePlane?: string
    leaderScale?: KclCommandValue
    fontPointSize?: KclCommandValue
    fontScale?: KclCommandValue
  }
  'Boolean Subtract': {
    solids: Selections
    tools: Selections
  }
  'Boolean Union': {
    solids: Selections
  }
  'Boolean Intersect': {
    solids: Selections
  }
  'Flip Surface': {
    surface: Selections
  }
  'Delete Face': {
    faces: Selections
  }
  'Boolean Split': {
    nodeToEdit?: PathToNode
    targets: Selections
    tools?: Selections
    merge?: boolean
    keepTools?: boolean
  }
  Blend: {
    edges: Selections
  }
}
