import nodemailer from 'nodemailer'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

export function inspect(values) {
  const password = values.OPS_SMTP_PASSWORD?.trim() || ''
  const configured =
    values.OPS_SMTP_HOST === 'smtp.yandex.ru' &&
    ['465', '587'].includes(values.OPS_SMTP_PORT) &&
    ['lotos.crm', 'lotos.crm@yandex.ru'].includes(values.OPS_SMTP_USER?.trim()) &&
    values.OPS_SMTP_FROM === 'lotos.crm@yandex.ru' &&
    values.OPS_EMAIL_TO === 'lotos.crm@yandex.ru'
  return {
    configured,
    emptyPassword: !password,
    internalWhitespace: /\s/.test(password),
    nonAscii: /[^\x20-\x7e]/.test(password),
    quoted: /^["']|["']$/.test(password),
  }
}
export function reason(error) {
  const response = String(error?.response || '')
  if (/application.?specific password|application password|парол.*приложени/i.test(response))
    return 'APP_PASSWORD_REQUIRED'
  if (/ip.{0,30}(block|denied|restrict)|address.{0,30}(block|denied)/i.test(response)) return 'IP_RESTRICTED'
  if (/disabled|suspend|locked|not allowed|отключ|заблок/i.test(response)) return 'ACCOUNT_RESTRICTED'
  if (/authentication failed|invalid.{0,30}(user|password|credential)|wrong password/i.test(response))
    return 'AUTH_REJECTED'
  return 'UNCLASSIFIED'
}
async function run(values = process.env) {
  if (
    values.GITHUB_REPOSITORY !== 'YuryKhayrullin/lotos_parent' ||
    values.GITHUB_REF !== 'refs/heads/main' ||
    values.GITHUB_EVENT_NAME !== 'workflow_dispatch'
  )
    throw Error('TRUSTED_DIAGNOSIS_REQUIRED')
  const report = {
    at: new Date().toISOString(),
    format: inspect(values),
    attempts: [],
    acceptedVariant: null,
    emailsSent: 0,
  }
  if (!report.format.configured || report.format.emptyPassword) throw Error('DIAGNOSIS_CONFIGURATION')
  if (values.OPS_SMTP_NOT_BEFORE && Date.now() < Date.parse(values.OPS_SMTP_NOT_BEFORE)) {
    console.log('SMTP_ACTIVATION_WAIT; no authentication attempted')
    return
  }
  const password = values.OPS_SMTP_PASSWORD.trim()
  const variants = [
    { name: 'configured-default-auth', user: values.OPS_SMTP_USER.trim() },
    { name: 'full-address-default-auth', user: 'lotos.crm@yandex.ru' },
    { name: 'configured-login-auth', user: values.OPS_SMTP_USER.trim(), authMethod: 'LOGIN' },
  ]
  // Three bounded authentication checks, no SMTP DATA or email recipients.
  for (const variant of variants) {
    const transport = nodemailer.createTransport({
      host: 'smtp.yandex.ru',
      port: Number(values.OPS_SMTP_PORT),
      secure: values.OPS_SMTP_PORT === '465',
      requireTLS: true,
      auth: { user: variant.user, pass: password },
      ...(variant.authMethod ? { authMethod: variant.authMethod } : {}),
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      dnsTimeout: 4000,
      logger: false,
      debug: false,
    })
    try {
      await transport.verify()
      report.acceptedVariant = variant.name
      report.attempts.push({ variant: variant.name, accepted: true })
      break
    } catch (error) {
      const code = ['EAUTH', 'ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ETLS'].includes(error?.code)
        ? error.code
        : 'SMTP_FAILED'
      report.attempts.push({
        variant: variant.name,
        accepted: false,
        code,
        reason: reason(error),
        smtp: Number.isInteger(error?.responseCode) ? error.responseCode : null,
      })
      if (code !== 'EAUTH') break
    } finally {
      transport.close()
    }
  }
  fs.mkdirSync('.artifacts/smtp-diagnosis', { recursive: true })
  fs.writeFileSync('.artifacts/smtp-diagnosis/report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  if (!report.acceptedVariant) process.exitCode = 1
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => {
    console.error('SMTP_DIAGNOSIS_FAILED; no credentials logged')
    process.exitCode = 1
  })
}
