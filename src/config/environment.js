/**
 * Environment configuration module
 * Loads and provides access to environment variables with defaults
 */

const environment = {
  // Collection configuration
  openApiFile: process.env.OPENAPI_FILE || './openapi.json',
  portmanConfigFile: process.env.PORTMAN_CONFIG_FILE || './portman.json',
  collectionFile: process.env.COLLECTION_FILE || './collection.json',
  envFile: process.env.ENVIRONMENT_FILE || '',
  collectionUrl: process.env.COLLECTION_URL || '',
  envUrl: process.env.ENVIRONMENT_URL || '',

  // Server configuration
  port: process.env.PORT || '8080',
  metricsUrlPath: process.env.METRICS_URL_PATH || '/metrics',
  statusEnabled: process.env.STATUS_ENABLED || 'true',

  // Runner configuration
  refreshInterval: process.env.REFRESH_INTERVAL || '120',
  runInterval: process.env.RUN_INTERVAL || '30',
  runIterations: process.env.RUN_ITERATIONS || '1',
  enableBail: process.env.ENABLE_BAIL || 'false',
  requestMetrics: process.env.ENABLE_REQUEST_METRICS || 'true'
}

module.exports = environment 