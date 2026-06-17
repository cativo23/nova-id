import type { UiNodeLike, UiNodeMessageLike } from '../utils/uiNodes'

// Permissive Kratos self-service flow shape. The views read many fields that
// span the LoginFlow / RegistrationFlow / RecoveryFlow / etc. unions plus
// Kratos error bodies (error, error_id, use_flow_id, continue_with, …), and
// they also stash transient client-only fields (e.g. _adminRecoveryCode).
//
// No index signatures: the generated @ory/client flow types are closed object
// types, so assigning them to a type WITH an index signature fails. Instead we
// declare every field the views actually touch as optional. Concrete Ory flows
// (LoginFlow, RecoveryFlow, …) are then structurally assignable to FlowLike.
export interface UiContainerLike {
  action?: string
  method?: string
  nodes?: UiNodeLike[]
  messages?: UiNodeMessageLike[]
}

export interface FlowLike {
  id?: string
  state?: string
  return_to?: string
  ui?: UiContainerLike
  error?: Record<string, unknown>
  error_id?: string
  details?: Record<string, unknown>
  continue_with?: ContinueWithLike[]
  session?: unknown
  session_token?: unknown
  use_flow_id?: string
  // Client-only transient field used by Recovery.vue to auto-fill admin codes.
  _adminRecoveryCode?: string
}

export interface ContinueWithLike {
  action?: string
  flow?: { id?: string } | string
}

/** Narrow helper for the `error.response.{status,data}` shape thrown by axios/@ory. */
export interface HttpErrorLike {
  response?: { status?: number; data?: FlowLike }
  body?: FlowLike
  message?: string
}
