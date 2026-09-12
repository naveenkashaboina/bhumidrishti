// Mirrors server/src/config/constants.js ROLES — kept in sync manually
// since the backend has no shared-package boundary with the client.
export const ROLES = {
  DEO: 'DEO',
  VERIFIER: 'VERIFIER',
  DISTRICT_OFFICER: 'DISTRICT_OFFICER',
  STATE_ADMIN: 'STATE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ALL_ROLES = Object.values(ROLES);

/**
 * Where a role lands immediately after login, per the product spec:
 * DEO -> DEO dashboard, Verifier -> verification workspace,
 * District/State/Super -> analytics.
 */
export function roleHomePath(role) {
  switch (role) {
    case ROLES.DEO:
      return '/deo-dashboard';
    case ROLES.VERIFIER:
      return '/verification-workspace';
    case ROLES.DISTRICT_OFFICER:
    case ROLES.STATE_ADMIN:
    case ROLES.SUPER_ADMIN:
      return '/analytics';
    default:
      return '/login';
  }
}
