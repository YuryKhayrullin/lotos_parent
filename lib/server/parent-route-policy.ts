const identifier = /^[A-Za-z0-9_-]{1,100}$/

function safeIdentifier(value: string | undefined) {
  return typeof value === 'string' && identifier.test(value)
}

export function isAllowedParentGetPath(paths: readonly string[]) {
  if (paths[0] === 'booking' && paths[1] === 'v2') {
    if (paths.length === 3 && ['catalog', 'availability'].includes(paths[2])) return true
    return paths.length === 5 && paths[2] === 'branches' && safeIdentifier(paths[3]) && paths[4] === 'lessons'
  }
  if (paths.length === 2 && paths[0] === 'booking' && paths[1] === 'catalog') return true
  if (
    paths.length === 4 &&
    paths[0] === 'booking' &&
    paths[1] === 'branches' &&
    safeIdentifier(paths[2]) &&
    paths[3] === 'lessons'
  )
    return true
  if (paths.length === 1 && paths[0] === 'children') return true
  return (
    paths.length === 3 &&
    paths[0] === 'children' &&
    safeIdentifier(paths[1]) &&
    ['overview', 'payments', 'schedule'].includes(paths[2])
  )
}

export function releaseIdentifier(values: Record<string, string | undefined> = process.env) {
  const value = values.VERCEL_GIT_COMMIT_SHA || values.NEXT_PUBLIC_BUILD_SHA || ''
  return /^[0-9a-f]{7,40}$/i.test(value) ? value.slice(0, 12).toLowerCase() : 'local'
}
