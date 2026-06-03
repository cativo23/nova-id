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
    administer: (ctx: Context): boolean =>
      this.related.admins.includes(ctx.subject),
  }
}
