import nodemailer from 'nodemailer'

try {
  if (
    process.env.GITHUB_REPOSITORY !== 'YuryKhayrullin/lotos_parent' ||
    process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.OPS_EMAIL_TO !== 'lotos.crm@yandex.ru'
  )
    throw Error('TRUSTED_TEST_WORKFLOW_REQUIRED')
  const required = ['OPS_SMTP_HOST', 'OPS_SMTP_PORT', 'OPS_SMTP_USER', 'OPS_SMTP_PASSWORD', 'OPS_SMTP_FROM']
  if (required.some((key) => !process.env[key]) || !['465', '587'].includes(process.env.OPS_SMTP_PORT)) {
    throw Error('MAIL_NOT_CONFIGURED')
  }
  const transport = nodemailer.createTransport({
    host: process.env.OPS_SMTP_HOST,
    port: Number(process.env.OPS_SMTP_PORT),
    secure: process.env.OPS_SMTP_PORT === '465',
    requireTLS: true,
    auth: { user: process.env.OPS_SMTP_USER, pass: process.env.OPS_SMTP_PASSWORD },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { rejectUnauthorized: true },
    logger: false,
    debug: false,
  })
  try {
    const result = await transport.sendMail({
      from: process.env.OPS_SMTP_FROM,
      to: process.env.OPS_EMAIL_TO,
      subject: 'LOTOS — проверка мониторинга',
      text: [
        'Это одно контрольное письмо для проверки почтовых уведомлений LOTOS.',
        'Это не сообщение о реальном сбое.',
        'После включения монитор будет сообщать о двух последовательных неуспешных проверках и последующем восстановлении.',
        'Проверки выполняются из GitHub Actions и не подтверждают доступность из каждой сети тренеров.',
      ].join('\n'),
    })
    if (result.accepted.length !== 1 || result.rejected.length) throw Error('MAIL_NOT_ACCEPTED')
    console.log('OPERATIONS_TEST_EMAIL_ACCEPTED')
  } finally {
    transport.close()
  }
} catch {
  console.error('OPERATIONS_TEST_EMAIL_FAILED: check SMTP configuration; no credentials logged')
  process.exitCode = 1
}
