/**
 * Simple logging utility
 * Provides consistent log message formatting
 */

function logMessage(msg) {
  console.log(`### ${new Date().toISOString().replace('T', ' ').substr(0, 16)} ${msg}`)
}

module.exports = { logMessage }
