// Disabled unless the repository's explicit worker enable flag is true.
const secret = process.env.PARENT_EMAIL_JOB_SECRET
if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw Error('INVITATION_WORKER_NOT_CONFIGURED')
try {
  const response = await fetch('https://lotos-crm-staging.vercel.app/api/jobs/parent-invitations', {
    headers: { authorization: 'Bearer ' + secret },
    redirect: 'error',
    signal: AbortSignal.timeout(55000),
  })
  if (!response.ok) throw Error('INVITATION_WORKER_HTTP_' + response.status)
  const result = await response.json()
  if (!['configured', 'ready'].includes(result.configuration)) throw Error('INVITATION_MAIL_NOT_READY')
  if (!Number.isSafeInteger(result.processed) || result.processed < 0 || result.processed > 25)
    throw Error('INVITATION_WORKER_INVALID_RESPONSE')
  console.log(JSON.stringify({ processed: result.processed, outcomes: result.outcomes }))
} catch (error) {
  console.error(
    /^INVITATION_[A-Z_0-9]+$/.test(error?.message) ? error.message : 'INVITATION_WORKER_UNAVAILABLE',
  )
  process.exitCode = 1
}
