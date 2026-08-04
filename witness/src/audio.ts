/**
 * Parallel mic capture while the camera records video.
 * Prefer this over ffmpeg extract in Expo managed / EAS builds.
 * Falls back to null if permission or recorder fails — caller may mark audioPending.
 */
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export type AudioCapture = {
  stop: () => Promise<string | null>;
};

export async function startParallelAudio(): Promise<AudioCapture | null> {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();

    return {
      async stop() {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          if (!uri) return null;
          // Normalize into cache with a stable extension when possible
          const dest = `${FileSystem.cacheDirectory}ctf-audio-${Date.now()}.m4a`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          return dest;
        } catch {
          return null;
        }
      },
    };
  } catch (e) {
    console.warn("Parallel audio capture unavailable:", e);
    return null;
  }
}

/**
 * Optional ffmpeg extract — only when a native ffmpeg module is linked (dev client / bare).
 * Returns null in Expo Go / when module is absent.
 */
export async function extractAudioWithFfmpeg(
  _videoUri: string,
): Promise<string | null> {
  try {
    // Dynamic require so Expo Go does not crash when the native module is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("ffmpeg-kit-react-native");
    if (!mod?.FFmpegKit) return null;
    const out = `${FileSystem.cacheDirectory}ctf-ffmpeg-audio-${Date.now()}.m4a`;
    const session = await mod.FFmpegKit.execute(
      `-y -i "${_videoUri}" -vn -acodec aac "${out}"`,
    );
    const code = await session.getReturnCode();
    if (mod.ReturnCode.isSuccess(code)) {
      const info = await FileSystem.getInfoAsync(out);
      return info.exists ? out : null;
    }
    return null;
  } catch {
    return null;
  }
}
