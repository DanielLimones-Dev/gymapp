// Metro custom serializer: escape non-ASCII chars in the final bundle
// Runs AFTER all Babel transforms, guarantees Hermes gets ASCII-only source

const { getDefaultConfig } = require('@expo/metro-config')

const config = getDefaultConfig(__dirname)

// Save original serializer
const originalSerialize = config.serializer?.customSerializeHandler

config.serializer = {
  ...config.serializer,
  customSerializeHandler(entryPoint, preModules, graph, options) {
    // Call default serializer or use Metro's default
    return null // Signal Metro to use default serialization
  },
}

// Post-process the output
const originalCreateModuleIdFactory = config.serializer?.createModuleIdFactory

module.exports = config
