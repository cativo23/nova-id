/**
 * dependency-cruiser configuration — enforces the ADR-0001 internal module boundary.
 *
 * ADR-0001 ("Separate the demo-app backend from the IdP BFF via a hard internal
 * module boundary") mandates a ONE-WAY dependency arrow: DemoModule -> IdP, never
 * IdP -> DemoModule. The IdP modules (admin/, me/, ory/, auth/) must not import any
 * symbol from the quarantined demo code under src/demo/.
 *
 * This rule is the mechanical enforcement the ADR calls for ("to enforce architecture
 * we should use the computer as much as possible and treat code-review as the last
 * line of defense"). It fails the build the moment an IdP module imports demo code,
 * making the violation impossible to merge rather than merely discouraged.
 *
 * Run via `npm run boundary:check` (depcruise src --config .dependency-cruiser.js),
 * from the api/ directory, so module paths are rooted at `src/`.
 */
module.exports = {
  forbidden: [
    {
      name: 'idp-must-not-import-demo',
      comment:
        'ADR-0001: IdP modules (admin/me/ory/auth) must not depend on the demo app ' +
        '(src/demo). The dependency arrow is one-way: DemoModule -> IdP only.',
      severity: 'error',
      from: { path: '^src/(admin|me|ory|auth)/' },
      to: { path: '^src/demo/' },
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the module graph impossible to reason about.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
