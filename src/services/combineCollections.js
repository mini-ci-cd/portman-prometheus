const fs = require('fs')
const { logMessage } = require('../utils/logger')

class CollectionCombiner {
  constructor() {
    this.collections = []
    this.combinedCollection = null
  }

  /**
   * Add a collection to be combined
   * @param {string} collectionPath - Path to collection file
   */
  addCollection(baseURLforFilename) {
    try {
      const collectionPath = `${baseURLforFilename.replace(/[^a-zA-Z0-9]/g, '_')}-collection.json`

      if (!fs.existsSync(collectionPath)) {
        throw new Error(`Collection file not found at ${collectionPath}`)
      }

      const collectionContent = fs.readFileSync(collectionPath, 'utf8')
      const collection = JSON.parse(collectionContent)
      this.collections.push(collection)
      logMessage(`Added collection: ${collection.info?.name || 'Unnamed collection'}`)
    } catch (err) {
      logMessage(`ERROR! Failed to add collection: ${err.message}`)
      throw err
    }
  }

  /**
   * Combine all added collections into one
   * @param {string} newCollectionName - Name for the combined collection
   * @returns {Object} Combined collection
   */
  combine(newCollectionName) {
    try {
      if (this.collections.length === 0) {
        throw new Error('No collections added to combine')
      }

      // Use the first collection as base
      this.combinedCollection = { ...this.collections[0] }

      // Update collection name if provided
      if (newCollectionName) {
        this.combinedCollection.info.name = newCollectionName
      }

      // Combine items from other collections
      for (let i = 1; i < this.collections.length; i++) {
        const collection = this.collections[i]
        if (collection.item && Array.isArray(collection.item)) {
          this.combinedCollection.item = [
            ...this.combinedCollection.item,
            ...collection.item
          ]
        }
      }

      logMessage(`Successfully combined ${this.collections.length} collections`)
      return this.combinedCollection
    } catch (err) {
      logMessage(`ERROR! Failed to combine collections: ${err.message}`)
      throw err
    }
  }

  /**
   * Save combined collection to file
   * @param {string} outputPath - Path to save the combined collection
   */
  saveCollection(outputPath) {
    try {
      if (!this.combinedCollection) {
        throw new Error('No combined collection available. Call combine() first')
      }

      fs.writeFileSync(outputPath, JSON.stringify(this.combinedCollection, null, 2))
      logMessage(`Combined collection saved to ${outputPath}`)
    } catch (err) {
      logMessage(`ERROR! Failed to save combined collection: ${err.message}`)
      throw err
    }
  }

  /**
   * Get the combined collection object
   * @returns {Object|null} Combined collection or null if not combined yet
   */
  getCombinedCollection() {
    return this.combinedCollection
  }

  /**
   * Clear all collections and reset the combiner
   */
  reset() {
    this.collections = []
    this.combinedCollection = null
    logMessage('Collection combiner reset')
  }
}

module.exports = new CollectionCombiner() 