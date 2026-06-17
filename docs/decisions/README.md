# Architecture Decision Records

This directory holds the Architecture Decision Records (ADRs) for Nova ID — short, immutable
documents that capture a significant architectural decision, its context, and its consequences.

We write an ADR when a decision changes the shape of the system (a boundary, a contract, a
source-of-truth ruling) and would otherwise be re-litigated later from memory.

## Conventions

- Filename: `NNNN-kebab-title.md` (zero-padded sequential number).
- Status lifecycle: `Proposed` → `Accepted` → (`Superseded by ADR-XXXX` | `Deprecated`).
- ADRs are append-only. To change a decision, write a new ADR that supersedes the old one;
  do not edit the original beyond updating its `Status` line to point at the successor.
- Each ADR cites the concrete `file:line` references it is grounded in.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-idp-vs-demo-app-boundary.md) | Separate the demo-app backend from the IdP BFF via a hard internal module boundary | Accepted |
| [0002](0002-idp-does-not-mint-approle.md) | The IdP does not mint the `appRole` claim; the demo app owns its app-level roles | Accepted |
| [0003](0003-three-layer-authorization-model.md) | Three-layer authorization model (Keto for platform & per-app access; each app's DB for domain roles) | Accepted |
| [0004](0004-per-app-access-enforcement-dual-mode.md) | Enforce per-app access in two coexisting modes, with Keto as the single source of truth | Accepted |
| [0005](0005-generated-api-client-and-workspace.md) | Generate a typed, tags-split TanStack Query client and distribute it as a pnpm workspace package | Accepted |

## Related decision records (pre-ADR)

Earlier decisions live inline in topic docs and predate this directory:

- **3-layer roles model** — originally captured inline in `../AUDIT_FINDINGS.md` ("Roles model") and
  `../PLAN_BUCKET_A.md` (lines 12–15); now formalized as **[ADR-0003](0003-three-layer-authorization-model.md)**.
  ADR-0001 and ADR-0002 refine where the boundary between those layers sits in the codebase.
