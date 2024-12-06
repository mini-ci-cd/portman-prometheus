const express = require('express')
const router = express.Router()
const collectionRunner = require('../services/collectionRunner')
const environment = require('../config/environment')
function addMetric(metrics, name, value, type = 'gauge', labels = []) {
    metrics += `# TYPE postman_${name} ${type}\n`

    let labelsClone = [...labels]
    labelsClone.push({ collection: collectionRunner.collectionName })

    let labelStr = ''
    for (let label of labelsClone) {
        let key = Object.keys(label)[0]
        let value = Object.values(label)[0]
        labelStr += `${key}="${value}",`
    }
    labelStr = labelStr.replace(/,\s*$/, '')

    metrics += `postman_${name}{${labelStr}} ${value}\n\n`
    return metrics
}

router.get('/', (req, res) => {
    res.setHeader('content-type', 'text/plain; charset=utf-8; version=0.0.4')

    let metricString = ''
    try {
        const { runCount, iterationCount, reqCount, resultSummary } = collectionRunner.getStatus()

        metricString = addMetric(metricString, 'lifetime_runs_total', runCount, 'counter')
        metricString = addMetric(metricString, 'lifetime_iterations_total', iterationCount, 'counter')
        metricString = addMetric(metricString, 'lifetime_requests_total', reqCount, 'counter')
        metricString = addMetric(metricString, 'stats_iterations_total', resultSummary.run.stats.iterations.total)
        metricString = addMetric(metricString, 'stats_iterations_failed', resultSummary.run.stats.iterations.failed)
        metricString = addMetric(metricString, 'stats_requests_total', resultSummary.run.stats.requests.total)
        metricString = addMetric(metricString, 'stats_requests_failed', resultSummary.run.stats.requests.failed)
        metricString = addMetric(metricString, 'stats_tests_total', resultSummary.run.stats.tests.total)
        metricString = addMetric(metricString, 'stats_tests_failed', resultSummary.run.stats.tests.failed)
        metricString = addMetric(metricString, 'stats_test_scripts_total', resultSummary.run.stats.testScripts.total)
        metricString = addMetric(metricString, 'stats_test_scripts_failed', resultSummary.run.stats.testScripts.failed)
        metricString = addMetric(metricString, 'stats_assertions_total', resultSummary.run.stats.assertions.total)
        metricString = addMetric(metricString, 'stats_assertions_failed', resultSummary.run.stats.assertions.failed)
        metricString = addMetric(metricString, 'stats_transfered_bytes_total', resultSummary.run.transfers.responseTotal)
        metricString = addMetric(metricString, 'stats_resp_avg', resultSummary.run.timings.responseAverage)
        metricString = addMetric(metricString, 'stats_resp_min', resultSummary.run.timings.responseMin)
        metricString = addMetric(metricString, 'stats_resp_max', resultSummary.run.timings.responseMax)

        if (environment.requestMetrics == 'true') {
            for (let execution of resultSummary.run.executions) {
                if (!execution.response) {
                    continue
                }
                const labels = [
                    {
                        // eslint-disable-next-line camelcase
                        request_name: execution.item.name,
                    },
                    {
                        iteration: execution.cursor.iteration,
                    },
                ]
                if (execution.response.code) {
                    metricString = addMetric(metricString, 'request_status_code', execution.response.code, 'gauge', labels)
                }
                if (execution.response.responseTime) {
                    metricString = addMetric(metricString, 'request_resp_time', execution.response.responseTime, 'gauge', labels)
                }
                if (execution.response.responseSize) {
                    metricString = addMetric(metricString, 'request_resp_size', execution.response.responseSize, 'gauge', labels)
                }
                if (execution.response.status) {
                    const statusOK = execution.response.status == 'OK' ? 1 : 0
                    metricString = addMetric(metricString, 'request_status_ok', statusOK, 'gauge', labels)
                }

                let failedAssertions = 0
                let totalAssertions = 0
                // Include per request assertion metrics
                if (execution.assertions) {
                    for (let a in execution.assertions) {
                        totalAssertions++
                        if (execution.assertions[a].error) {
                            failedAssertions++
                        }
                    }
                }
                metricString = addMetric(metricString, 'request_failed_assertions', failedAssertions, 'gauge', labels)
                metricString = addMetric(metricString, 'request_total_assertions', totalAssertions, 'gauge', labels)
            }
        }

        res.send(metricString)
    } catch (err) {
        res.status(500).send('No result data to show, maybe the collection has not run yet')
    }
})

module.exports = router 