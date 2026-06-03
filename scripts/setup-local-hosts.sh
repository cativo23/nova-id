#!/usr/bin/env bash
#
# setup-local-hosts.sh — map the nova-id *.ory.localhost hostnames to 127.0.0.1
# so the local stack is reachable in a browser through Oathkeeper (the local
# front door). Run with sudo. Idempotent + reversible.
#
#   sudo ./scripts/setup-local-hosts.sh          # add the entries
#   sudo ./scripts/setup-local-hosts.sh --remove # undo (remove the block)
#
set -euo pipefail

HOSTS_FILE="/etc/hosts"
MARKER_BEGIN="# >>> nova-id local (managed) >>>"
MARKER_END="# <<< nova-id local (managed) <<<"
HOSTNAMES="auth.ory.localhost admin.ory.localhost app.ory.localhost api.ory.localhost"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script edits ${HOSTS_FILE} and must run as root. Re-run: sudo $0 $*" >&2
  exit 1
fi

# Strip any existing managed block (so re-running is clean / --remove works).
strip_block() {
  if grep -qF "${MARKER_BEGIN}" "${HOSTS_FILE}"; then
    # delete everything between the markers, inclusive
    sed -i "/${MARKER_BEGIN}/,/${MARKER_END}/d" "${HOSTS_FILE}"
    # collapse a trailing blank line left behind, if any
    sed -i -e :a -e '/^\n*$/{$d;N;ba}' "${HOSTS_FILE}" 2>/dev/null || true
  fi
}

# Always back up first.
BACKUP="${HOSTS_FILE}.nova-id.bak.$(date +%s 2>/dev/null || echo backup)"
cp "${HOSTS_FILE}" "${BACKUP}"
echo "Backed up ${HOSTS_FILE} -> ${BACKUP}"

if [[ "${1:-}" == "--remove" ]]; then
  strip_block
  echo "Removed nova-id host entries."
  echo "Current ory.localhost lines:"
  grep -i 'ory.localhost' "${HOSTS_FILE}" || echo "  (none)"
  exit 0
fi

# Add (replace) the managed block.
strip_block
{
  echo ""
  echo "${MARKER_BEGIN}"
  echo "127.0.0.1 ${HOSTNAMES}"
  echo "${MARKER_END}"
} >> "${HOSTS_FILE}"

echo "Added to ${HOSTS_FILE}:"
echo "  127.0.0.1 ${HOSTNAMES}"
echo ""
echo "Verify:"
for h in ${HOSTNAMES}; do
  ip="$(getent hosts "${h}" 2>/dev/null | awk '{print $1}' | head -1)"
  echo "  ${h} -> ${ip:-<unresolved>}"
done
