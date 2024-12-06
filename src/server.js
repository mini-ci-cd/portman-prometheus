const express = require('express')
const environment = require('./config/environment')
const metricsRouter = require('./routes/metrics')
const statusRouter = require('./routes/status')
const collectionRunner = require('./services/collectionRunner')
const portmanTrasformation = require('./services/portmanTransformation')
const { logMessage } = require('./utils/logger')

const app = express()

// Routes
app.use(environment.metricsUrlPath, metricsRouter)
if (environment.statusEnabled === 'true') {
  app.use('/status', statusRouter)
}

// Root path handler
app.get('/', (req, res) => {
  res.setHeader('content-type', 'text/plain')
  res.status(404).send(`Nothing here, try ${environment.metricsUrlPath}`)
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.setHeader('content-type', 'text/plain')
  res.status(200).send('OK')
})

app.listen(environment.port, async () => {
  await portmanTrasformation.initialize(
    environment.openApiFile
  )

  await portmanTrasformation.generateCollection()
  //await portmanTrasformation.saveCollection('./collection.json')

  const { collectionFile, envFile } = await collectionRunner.fetchConfig(
    environment.collectionUrl,
    environment.envUrl,
    environment.collectionFile,
    environment.envFile
  )

  logMessage(`Newman runner started & listening on ${environment.port}`)
  logMessage(` - Metrics available for scraping at: http://0.0.0.0:${environment.port}${environment.metricsUrlPath}`)
  if (environment.statusEnabled === 'true') {
    logMessage(` - Status API endpoint: http://0.0.0.0:${environment.port}/status`)
  }
  logMessage(` - Collection will be run every ${environment.runInterval} seconds`)
  logMessage(` - Config refresh will be run every ${environment.refreshInterval} seconds`)

  collectionRunner.runCollection(collectionFile, envFile, environment.runIterations, environment.enableBail)

  // Set up repeating timers
  setInterval(async () => {
    await collectionRunner.fetchConfig(
      environment.collectionUrl,
      environment.envUrl,
      environment.collectionFile,
      environment.envFile
    )
  }, parseInt(environment.refreshInterval * 1000))

  setInterval(() => {
    collectionRunner.runCollection(collectionFile, envFile, environment.runIterations, environment.enableBail)
  }, parseInt(environment.runInterval * 1000))
})
