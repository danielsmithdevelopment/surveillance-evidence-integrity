const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow bundling ggml Whisper weights as assets.
if (!config.resolver.assetExts.includes("bin")) {
  config.resolver.assetExts.push("bin");
}

module.exports = config;
