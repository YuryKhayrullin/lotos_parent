import './load-env'
import { configuration, ConfigurationError } from '../lib/server/config'
import { crmReady } from '../lib/server/crm-api'
import { ApiError } from '../lib/server/errors'

try {
  configuration()
  if (!(await crmReady())) {
    console.error(
      'CRM parent API is not ready. Check the deployed CRM version and matching gateway settings. Database migration alone does not deploy the API.',
    )
    process.exitCode = 1
  } else {
    console.log('PARENT_CRM_API_OK')
  }
} catch (error) {
  console.error(
    error instanceof ConfigurationError || error instanceof ApiError
      ? error.message
      : 'CRM connection check failed. Check the CRM deployment and network.',
  )
  process.exitCode = 1
}
