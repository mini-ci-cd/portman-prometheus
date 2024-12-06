const express = require('express')
const environment = require('./config/environment')
const metricsRouter = require('./routes/metrics')
const statusRouter = require('./routes/status')
const collectionRunner = require('./services/collectionRunner')
const portmanTransformation = require('./services/portmanTransformation')
const collectionCombiner = require('./services/combineCollections')
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

async function processOpenApiUrls() {
  const { portmanOpenApiUrls, openApiFile } = environment
  
  if (portmanOpenApiUrls.length > 0) {
    logMessage(`Processing ${portmanOpenApiUrls.length} OpenAPI URLs`)
    
    // Process each URL and generate collections
    for (const url of portmanOpenApiUrls) {
      try {
        logMessage(`Processing OpenAPI URL: ${url}`)
        await portmanTransformation.initialize(url)
        await portmanTransformation.generateCollection()
        const tempFile = `./temp-collection-${Date.now()}.json`
        await portmanTransformation.saveCollection(tempFile)
        collectionCombiner.addCollection(tempFile)
      } catch (err) {
        logMessage(`ERROR! Failed to process OpenAPI URL ${url}: ${err.message}`)
      }
    }

    // Combine all collections
    collectionCombiner.combine('Combined API Collection')
    collectionCombiner.saveCollection(environment.collectionFile)
    
    // Reset for next use
    collectionCombiner.reset()
  } else if (openApiFile) {
    // Process single OpenAPI file as before
    await portmanTransformation.initialize(openApiFile)
    await portmanTransformation.generateCollection()
    await portmanTransformation.saveCollection(environment.collectionFile)
  }
}

app.listen(environment.port, async () => {
  try {
    await processOpenApiUrls()

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
      await processOpenApiUrls()
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
  } catch (err) {
    logMessage(`FATAL! Failed to start server: ${err.message}`)
    process.exit(1)
  }
})
