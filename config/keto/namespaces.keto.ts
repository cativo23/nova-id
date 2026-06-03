import { Namespace, Context, SubjectSet } from "@ory/keto-namespace-types"

// A human identity (Kratos identity id). No relations of its own.
class User implements Namespace {}

// The IdP control plane. Object id is always "nova".
//   Platform:nova#admins@user:<id>  => that user is a platform_admin.
class Platform implements Namespace {
  related: {
    admins: User[]
  }

  permits = {
    // Operate the IdP (admin dashboard, app onboarding, Keto/Hydra admin).
    administer: (ctx: Context): boolean =>
      this.related.admins.includes(ctx.subject),

    // Manage Kratos identities (create/edit/delete/recovery) across apps.
    manage_users: (ctx: Context): boolean =>
      this.related.admins.includes(ctx.subject),
  }
}

// One per registered app (object id = the app's Hydra client_id / appId).
//   App:<appId>#members@user:<id>  => may consume the app.
//   App:<appId>#admins@user:<id>   => admin of the app (also a member).
//
// A0 design decision: Platform:nova#admins membership does NOT automatically
// grant App#administer on any app. App admin is a separate, per-app tuple
// (App:<appId>#admins@user:<id>) written via the Platform-gated keto-write path.
// Per-app domain roles are out of scope for A0 and will be introduced in A1
// (app-onboarding milestone), which provisions App tuples on client registration.
// This is intentional: a platform admin who also needs app-admin access must be
// explicitly granted it through the keto-write endpoint.
class App implements Namespace {
  related: {
    admins: User[]
    // App admins are members too (admin ⊇ member), so include the admins userset.
    members: (User | SubjectSet<App, "admins">)[]
  }

  permits = {
    // May reach/consume the app (first-party: Oathkeeper gates per request;
    // third-party: consent app checks at token issuance).
    access: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject),

    // May administer this app's users.
    // Note: this checks only App#admins — Platform:nova#admins is NOT evaluated
    // here. A Platform admin is NOT an implicit App admin (see A0 design decision above).
    administer: (ctx: Context): boolean =>
      this.related.admins.includes(ctx.subject),
  }
}
