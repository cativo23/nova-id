export function getNodeValue(node, defaultValue = null) {
  if (node.attributes?.value !== undefined && node.attributes?.value !== null && node.attributes?.value !== '') {
    return node.attributes.value
  }
  return defaultValue
}

export function getNodeName(node) {
  return node.attributes?.name || ''
}

export function getNodeType(node) {
  return node.attributes?.type || 'text'
}

export function getNodeLabel(node) {
  return node.meta?.label?.text || node.attributes?.name || ''
}

export function getNodePlaceholder(node) {
  return node.attributes?.placeholder || ''
}

export function isNodeRequired(node) {
  return node.attributes?.required === true
}

export function getNodeErrors(node) {
  return node.messages?.filter(m => m.type === 'error') || []
}

export function hasNodeErrors(node) {
  return getNodeErrors(node).length > 0
}
