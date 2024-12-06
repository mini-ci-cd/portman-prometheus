const { Portman } = require('@apideck/portman')
const fs = require('fs')
const { logMessage } = require('../utils/logger')
const { portmanConfigFile } = require('../config/environment')

class PortmanTransformation {
  constructor() {
    this.portman = null
    this.openApiSpec = null
    this.postmanCollection = null
  }

  /**
   * Initialize Portman with OpenAPI specification
   * @param {string} openApiPath - Path to OpenAPI specification file
   * @param {Object} options - Portman configuration options
   */
  async initialize() {
    try {

      // Initialize Portman with default options
      const defaultOptions = {
        output: './collection.json',
        portmanConfigFile: './public-api-portman.conf',
        envFile: './.env',
        oaLocal: './public-api-openapi.json'
      }

      this.portman = new Portman(defaultOptions)
      await this.portman.run()
      logMessage('Portman initialized successfully')
    } catch (err) {
      logMessage(`ERROR! Failed to initialize Portman: ${err.message}`)
      throw err
    }
  }

  /**
   * Generate Postman collection from OpenAPI spec
   * @returns {Object} Generated Postman collection
   */
  async generateCollection() {
    try {
      if (!this.portman) {
        throw new Error('Portman not initialized. Call initialize() first')
      }

      // Convert OpenAPI to Postman collection
      await this.portman.parseOpenApiSpec()
      
      // Generate test suites
      //await this.portman.generateTestSuites()
      
      // Get the modified collection
      //this.postmanCollection = await this.portman.getCollection()

      logMessage('Successfully generated Postman collection from OpenAPI spec')
      return this.postmanCollection
    } catch (err) {
      logMessage(`ERROR! Failed to generate collection: ${err.message}`)
      throw err
    }
  }

  /**
   * Save generated collection to file
   * @param {string} outputPath - Path to save the collection
   */
  async saveCollection(outputPath) {
    try {
      if (!this.postmanCollection) {
        throw new Error('No collection generated. Call generateCollection() first')
      }

      fs.writeFileSync(outputPath, JSON.stringify(this.postmanCollection, null, 2))
      logMessage(`Collection saved to ${outputPath}`)
    } catch (err) {
      logMessage(`ERROR! Failed to save collection: ${err.message}`)
      throw err
    }
  }

}

module.exports = new PortmanTransformation()