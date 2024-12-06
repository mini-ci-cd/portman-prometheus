const newman = require('newman')
const fs = require('fs')
const http = require('../http')
const { logMessage } = require('../utils/logger')

class CollectionRunner {
  constructor() {
    this.runCount = 0
    this.iterationCount = 0
    this.reqCount = 0
    this.resultSummary = {}
    this.collectionName = ''
    this.collectionData = null
    this.envData = null
  }

  getStatus() {
    return {
      runCount: this.runCount,
      iterationCount: this.iterationCount,
      reqCount: this.reqCount,
      resultSummary: this.resultSummary,
      collectionName: this.collectionName
    }
  }

  async fetchConfig(collectionUrl, envUrl, collectionFile, envFile) {
    logMessage('Refreshing remote collection & env files')
    // COLLECTION_URL when set takes priority over COLLECTION_FILE
    if (collectionUrl) {
      logMessage(` - Collection URL will be fetched and used ${collectionUrl}`)
      try {
        const httpClient = new http(collectionUrl, false)
        let resp = await httpClient.get('')
        fs.writeFileSync(`./downloaded-collection.tmp.json`, resp.data)
        // Note. Overwrite the COLLECTION_FILE setting to point to downloaded file
        collectionFile = './downloaded-collection.tmp.json'
      } catch (err) {
        logMessage(` - FATAL! Failed to download collection from URL\n ${JSON.stringify(err, null, 2)}`)
        process.exit(1)
      }
    }

    // ENVIRONMENT_URL when set takes priority over ENVIRONMENT_FILE
    if (envUrl) {
      logMessage(` - Postman env file URL will be fetched and used ${envUrl}`)
      try {
        const httpClient = new http(envUrl, false)
        let resp = await httpClient.get('')
        fs.writeFileSync(`./downloaded-env.tmp.json`, resp.data)
        // Note. Overwrite the ENVIRONMENT_FILE setting to point to downloaded file
        envFile = './downloaded-env.tmp.json'
      } catch (err) {
        logMessage(` - FATAL! Failed to download env from URL\n ${JSON.stringify(err, null, 2)}`)
        process.exit(1)
      }
    }

    if (!fs.existsSync(collectionFile)) {
      logMessage(`FATAL! Collection file '${collectionFile}' not found`)
      process.exit(1)
    }

    return { collectionFile, envFile }
  }

  runCollection(collectionFile, envFile, runIterations, enableBail) {
    logMessage(`-------------------------------------------------------`)
    logMessage(`Starting run of ${collectionFile}`)

    // Special logic to bring all env vars starting with POSTMAN_ into the run
    let postmanEnvVar = []
    for (let envVar in process.env) {
      if (envVar.startsWith('POSTMAN_')) {
        postmanEnvVar.push({
          key: envVar.replace('POSTMAN_', ''),
          value: process.env[envVar],
        })
      }
    }

    // Load and parse collection and envfile each time, as it might have changed
    try {
      const collectionContent = fs.readFileSync(collectionFile)
      this.collectionData = JSON.parse(collectionContent.toString())

      this.envData = {}
      if (envFile) {
        const envContent = fs.readFileSync(envFile)
        this.envData = JSON.parse(envContent.toString())
      }

      // All the real work is done here
      newman.run(
        {
          collection: this.collectionData,
          iterationCount: parseInt(runIterations),
          bail: enableBail == 'true',
          environment: this.envData,
          envVar: postmanEnvVar,
        },
        (err, summary) => this.runComplete(err, summary)
      )
    } catch (err) {
      logMessage(`FATAL! Failed to parse collection or environment file\n ${JSON.stringify(err, null, 2)}`)
      return
    }
  }

  runComplete(err, summary) {
    if (!summary) {
      logMessage(`ERROR! Failed to run collection, no summary was returned!`)
      return
    }

    // This post run loop is for logging of what happened and some data clean up
    for (let e in summary.run.executions) {
      if (summary.run.executions[e].response !== undefined) {
        logMessage(
          ` - Completed request '${summary.run.executions[e].item.name}' in ${summary.run.executions[e].response.responseTime} ms [${summary.run.executions[e].response.headers.reference['request-id']} ]`
        )

        // Junk we don't want in data
        summary.run.executions[e].response.stream = '*REMOVED*'

        for (let a in summary.run.executions[e].assertions) {
          if (summary.run.executions[e].assertions[a].error) {
            logMessage(
              `ERROR! Request '${summary.run.executions[e].item.name}' - assertion failed: ${summary.run.executions[e].assertions[a].error.test}, Reason: ${summary.run.executions[e].assertions[a].error.message}`
            )

            // Junk we don't want in data
            summary.run.executions[e].assertions[a].error.message = '*REMOVED*'
            summary.run.executions[e].assertions[a].error.stack = '*REMOVED*'
          }
        }
      } else {
        logMessage(
          ` - Failed request '${summary.run.executions[e].item.name}' with ${summary.run.executions[e].requestError} `
        )
      }
    }
    fs.writeFileSync('debug.tmp.json', JSON.stringify(summary, null, 2))

    const time = summary.run.timings.completed - summary.run.timings.started
    logMessage(`Run complete, and took ${time}ms`)

    this.runCount++
    this.iterationCount += summary.run.stats.iterations.total
    this.reqCount += summary.run.stats.requests.total

    if (err) {
      logMessage(`ERROR! Failed to run collection ${err}`)
    }
    this.resultSummary = summary
    this.collectionName = summary.collection.name
  }
}

module.exports = new CollectionRunner() 