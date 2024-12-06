const express = require('express')
const router = express.Router()
const collectionRunner = require('../services/collectionRunner')
const environment = require('../config/environment')

router.get('/', (req, res) => {
  res.setHeader('content-type', 'application/json')

  // Get a simple summary of the loaded collection
  let monitoredRequests = []
  if (collectionRunner.collectionData && collectionRunner.collectionData.item) {
    for (let item of collectionRunner.collectionData.item) {
      monitoredRequests.push({
        name: item.name,
        url: item.request.url.raw,
        method: item.request.method,
      })
    }
  }

  // Return a status summary object
  const status = {
    version: require('../package.json').version,
    config: {
      runInterval: parseInt(environment.runInterval),
      refreshInterval: parseInt(environment.refreshInterval),
      enableBail: environment.enableBail === 'true',
      collectionSource: environment.collectionUrl ? environment.collectionUrl : environment.collectionFile,
      envSource: environment.envUrl ? environment.envUrl : environment.envFile,
      requestMetrics: environment.requestMetrics === 'true',
      collectionName: collectionRunner.collectionName,
    },
    runtimeCounters: {
      runCount: collectionRunner.runCount,
      iterationCount: collectionRunner.iterationCount,
      reqCount: collectionRunner.reqCount,
    },
    monitoredRequests,
  }
  
  res.status(200).send(JSON.stringify(status))
})

module.exports = router