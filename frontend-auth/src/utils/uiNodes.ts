// Permissive shape for Kratos UI nodes. The views consume `flow.ui.nodes`
// from @ory/client but also mutate `attributes.value`, so we keep a loose,
// mutable interface rather than the readonly generated UiNode union.
// No index signatures here: the Ory `UiNode` union (whose anchor/input/etc.
// attribute variants are closed object types) must be structurally assignable
// to these shapes when we read `flow.ui.nodes`. All fields are optional so any
// concrete Ory node variant satisfies the interface.
export interface UiNodeAttributesLike {
  name?: string
  type?: string
  value?: unknown
  placeholder?: string
  required?: boolean
  id?: string
  href?: string
  options?: Array<{ value?: string; label?: string }>
}

export interface UiNodeMessageLike {
  type?: string
  text?: string
  id?: number
}

export interface UiNodeLike {
  type?: string
  group?: string
  id?: number
  attributes?: UiNodeAttributesLike
  meta?: { label?: { text?: string } }
  messages?: UiNodeMessageLike[]
}

// Overloads: with no/`undefined` default → always returns a string (templates bind
// it to :value, which rejects null); with an explicit default → returns it as-is
// (Registration/Settings use a null sentinel to detect "unset").
export function getNodeValue(node: UiNodeLike): string
export function getNodeValue<T>(node: UiNodeLike, defaultValue: T): string | T
export function getNodeValue(node: UiNodeLike, defaultValue: unknown = ''): unknown {
  if (node.attributes?.value !== undefined && node.attributes?.value !== null && node.attributes?.value !== '') {
    return String(node.attributes.value)
  }
  return defaultValue
}

export function getNodeName(node: UiNodeLike): string {
  return node.attributes?.name || ''
}

export function getNodeType(node: UiNodeLike): string {
  return node.attributes?.type || 'text'
}

export function getNodeLabel(node: UiNodeLike): string {
  return node.meta?.label?.text || node.attributes?.name || ''
}

export function getNodePlaceholder(node: UiNodeLike): string {
  return node.attributes?.placeholder || ''
}

export function isNodeRequired(node: UiNodeLike): boolean {
  return node.attributes?.required === true
}

export function getNodeErrors(node: UiNodeLike): UiNodeMessageLike[] {
  return node.messages?.filter((m) => m.type === 'error') || []
}

export function hasNodeErrors(node: UiNodeLike): boolean {
  return getNodeErrors(node).length > 0
}
