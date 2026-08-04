/**
 * Dynamic Expo config — EAS profiles inject EXPO_PUBLIC_* via eas.json env.
 */
const fs = require("fs");
const path = require("path");

const whisperBin = path.join(__dirname, "assets/models/ggml-tiny.en.bin");
const whisperBundled = fs.existsSync(whisperBin);

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: "Challenge the Footage",
  slug: "challenge-the-footage-evidence",
  version: "0.2.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: "challengethefootage",
  assetBundlePatterns: ["assets/**/*"],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "replace-with-eas-project-id",
    },
    whisperBundled,
    whisperModelName: whisperBundled ? "ggml-tiny.en.bin" : null,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.challengethefootage.evidence",
    infoPlist: {
      NSCameraUsageDescription:
        "Challenge the Footage records video of encounters for your own evidence.",
      NSMicrophoneUsageDescription:
        "Challenge the Footage records audio for your own evidence.",
      NSLocationWhenInUseUsageDescription:
        "Optional location is attached to the evidence package.",
      UIBackgroundModes: ["audio"],
    },
  },
  android: {
    package: "com.challengethefootage.evidence",
    permissions: ["CAMERA", "RECORD_AUDIO", "ACCESS_FINE_LOCATION", "ACCESS_NETWORK_STATE"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "challengethefootage" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "Allow Challenge the Footage to record video evidence.",
        microphonePermission: "Allow Challenge the Footage to record audio evidence.",
        recordAudioAndroid: true,
      },
    ],
    "expo-secure-store",
  ],
});
