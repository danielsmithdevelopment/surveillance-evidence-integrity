/**
 * Challenge the Footage — Evidence (native)
 *
 * Expo companion: record-first (parallel A/V), full-file SHA-256, secure-device,
 * then blob upload to CTF Worker / R2. Claim on the website afterward.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { CTF_WEB } from "./src/config";
import { sha256File, sha256Text } from "./src/hash";
import {
  extractAudioWithFfmpeg,
  startParallelAudio,
  type AudioCapture,
} from "./src/audio";
import {
  formatEvidenceTranscript,
  getWhisperEngine,
  liveTranscriptBanner,
} from "./src/whisper";
import { probeLink, uploadPlan } from "./src/connectivity";
import { flushQueueItem } from "./src/sync";
import {
  listQueueItems,
  loadQueueItem,
  needsSync,
  saveQueueItem,
  type QueueItem,
} from "./src/queue";
import { gzipTextToBase64 } from "./src/gzip";

const CONSENT_KEY = "ctf_evidence_consent_v1";
const DEVICE_KEY = "ctf_evidence_device_id";

const ALL_PARTY_STATES = new Set([
  "CA",
  "CT",
  "FL",
  "IL",
  "MD",
  "MA",
  "MI",
  "MT",
  "NH",
  "PA",
  "WA",
]);

type Phase = "consent" | "idle" | "recording" | "processing" | "secured";

interface SessionResult {
  sessionId: string;
  status: string;
  claimCode?: string;
  claimUrl?: string;
  verificationId: string;
  uploads?: { transcript?: boolean; audio?: boolean; video?: boolean };
  audioSource?: "parallel" | "ffmpeg" | "pending";
  transcriptEngine?: "stub" | "native";
  linkTier?: "offline" | "constrained" | "ok";
  compressedBytes?: number;
  mediaPending?: boolean;
  localOnly?: boolean;
  localId?: string;
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!deviceId) {
    deviceId = randomId("dev");
    await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [stateCode, setStateCode] = useState("CA");
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const audioRef = useRef<AudioCapture | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SessionResult | null>(null);
  const startedAt = useRef<string | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const whisperEngineId = useRef<"stub" | "native">("stub");
  const manualNotesRef = useRef("");

  useEffect(() => {
    (async () => {
      const consented = await SecureStore.getItemAsync(CONSENT_KEY);
      if (consented) setPhase("idle");
    })();
  }, []);

  // Retry queued rural syncs when the app returns to idle with a link.
  useEffect(() => {
    if (phase !== "idle") return;
    let cancelled = false;
    (async () => {
      try {
        const items = await listQueueItems();
        for (const item of items.filter(needsSync).slice(0, 3)) {
          if (cancelled) return;
          try {
            await flushQueueItem(item);
          } catch (e) {
            console.warn("Queue flush:", e);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const consentNotice = useMemo(() => {
    if (ALL_PARTY_STATES.has(stateCode.toUpperCase())) {
      return (
        `You selected ${stateCode.toUpperCase()}, an all-party consent state. ` +
        `Notify the officer that you are recording before relying on this recording in legal proceedings. ` +
        `This is not legal advice — consult an attorney in your jurisdiction.`
      );
    }
    return (
      `You selected ${stateCode.toUpperCase()}. Rules vary by state. ` +
      `Notify when appropriate and consult an attorney before relying on recordings in court.`
    );
  }, [stateCode]);

  const acceptConsent = async () => {
    await SecureStore.setItemAsync(
      CONSENT_KEY,
      JSON.stringify({
        at: new Date().toISOString(),
        state: stateCode.toUpperCase(),
      }),
    );
    setPhase("idle");
  };

  const ensurePermissions = async () => {
    if (!camPerm?.granted) {
      const r = await requestCamPerm();
      if (!r.granted) throw new Error("Camera permission required");
    }
    if (!micPerm?.granted) {
      const r = await requestMicPerm();
      if (!r.granted) throw new Error("Microphone permission required");
    }
  };

  const startRecording = async () => {
    try {
      await ensurePermissions();
      const { status: locStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locStatus === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        locationRef.current = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      }
      startedAt.current = new Date().toISOString();
      setTranscript("");
      setPhase("recording");
      setRecording(true);
      setStatus("Recording…");

      const engine = await getWhisperEngine();
      whisperEngineId.current = engine.id;
      setTranscript(liveTranscriptBanner(engine.id));
      setStatus(engine.label);

      audioRef.current = await startParallelAudio();

      const cam = cameraRef.current;
      if (!cam) throw new Error("Camera not ready");
      cam
        .recordAsync({ maxDuration: 60 * 30 })
        .then(async (video) => {
          await stopAndProcess(video?.uri);
        })
        .catch((e) => {
          console.warn(e);
          setStatus(String(e.message || e));
          setPhase("idle");
          setRecording(false);
        });
    } catch (e: any) {
      Alert.alert("Cannot start", e.message || String(e));
    }
  };

  const requestStop = () => {
    setStatus("Stopping…");
    cameraRef.current?.stopRecording();
  };

  const stopAndProcess = async (videoUri?: string) => {
    setRecording(false);
    setPhase("processing");
    const endedAt = new Date().toISOString();

    try {
      const deviceId = await ensureDeviceId();
      if (!videoUri) throw new Error("No video captured");

      setStatus("Finalizing audio…");
      let audioUri = audioRef.current ? await audioRef.current.stop() : null;
      audioRef.current = null;
      let audioSource: SessionResult["audioSource"] = audioUri
        ? "parallel"
        : "pending";

      if (!audioUri) {
        setStatus("Trying ffmpeg audio extract…");
        audioUri = await extractAudioWithFfmpeg(videoUri);
        if (audioUri) audioSource = "ffmpeg";
      }

      setStatus("Transcribing…");
      const engine = await getWhisperEngine();
      whisperEngineId.current = engine.id;
      let modelText = "";
      if (audioUri) {
        try {
          const spoken = await engine.transcribeFile(audioUri);
          modelText = spoken.text || "";
          if (modelText) {
            setTranscript((t) => `${liveTranscriptBanner(engine.id)}${modelText}\n`);
          }
        } catch (e: any) {
          console.warn("Whisper transcribe:", e?.message || e);
        }
      }

      // Treat edits in the live box as operator notes (strip our banners).
      const manualNotes = transcript
        .replace(/\[Transcript\][^\n]*\n?/g, "")
        .trim();
      manualNotesRef.current = manualNotes;

      const transcriptText = formatEvidenceTranscript({
        startedAt: startedAt.current!,
        endedAt,
        engine: engine.id,
        modelText,
        manualNotes,
      });
      setTranscript(transcriptText);
      const transcriptPath = `${FileSystem.cacheDirectory}transcript-${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(transcriptPath, transcriptText);

      setStatus("Hashing (full file SHA-256)…");
      const transcriptHash = await sha256Text(transcriptText);
      const videoHash = await sha256File(videoUri);
      let audioHash: string;
      if (audioUri) {
        audioHash = await sha256File(audioUri);
      } else {
        // Honest pending marker — not a fake duplicate of the video hash for court use.
        audioHash = await sha256Text(`AUDIO_PENDING:${videoHash}`);
        audioSource = "pending";
      }

      const localId = randomId("local");
      const queueItem: QueueItem = {
        localId,
        createdAt: new Date().toISOString(),
        deviceId,
        stateCode: stateCode.toUpperCase(),
        startedAt: startedAt.current!,
        endedAt,
        transcriptText,
        transcriptHash,
        audioHash,
        videoHash,
        transcriptPath,
        audioPath: audioUri,
        videoPath: videoUri,
        audioSource,
        transcriptEngine: engine.id,
        location: locationRef.current,
        uploads: {},
        syncAttempts: 0,
      };
      await saveQueueItem(queueItem);

      setStatus("Checking link (rural / 2G aware)…");
      const link = await probeLink();
      const plan = uploadPlan(link.tier);
      setStatus(link.detail);

      let secured: SessionResult = {
        sessionId: localId,
        status: "local_only",
        verificationId: localId,
        uploads: {},
        audioSource,
        transcriptEngine: engine.id,
        linkTier: link.tier,
        mediaPending: true,
        localOnly: true,
        localId,
      };

      if (plan.syncLite) {
        try {
          setStatus(
            link.tier === "constrained"
              ? "2G/slow link — syncing compressed transcript…"
              : "Syncing transcript…",
          );
          const gzInfo = gzipTextToBase64(transcriptText);
          const flushed = await flushQueueItem(queueItem, { tier: link.tier });
          secured = {
            sessionId: flushed.sessionId || localId,
            status: flushed.status || "secured",
            claimCode: flushed.claimCode,
            claimUrl: flushed.claimUrl,
            verificationId: flushed.verificationId || flushed.sessionId || localId,
            uploads: flushed.uploads,
            audioSource,
            transcriptEngine: engine.id,
            linkTier: link.tier,
            mediaPending: !(flushed.uploads.audio && flushed.uploads.video),
            localOnly: !flushed.sessionId,
            localId,
            compressedBytes: gzInfo.gzipBytes,
          };
          if (link.tier === "constrained") {
            setStatus(
              "Transcript synced over slow link. Video stays on device until signal improves.",
            );
          }
        } catch (syncErr: any) {
          console.warn("Sync failed — kept on device:", syncErr);
          Alert.alert(
            "Saved on device",
            `${syncErr.message || syncErr}\n\nHashes and transcript are stored locally. Open the app again when you have signal — we will sync the compressed transcript first.`,
          );
        }
      } else {
        Alert.alert(
          "Saved on device",
          "No data connection. On-device transcript and hashes are safe. We will sync a compressed transcript as soon as you get even a weak (2G) signal — video waits for a better link.",
        );
      }

      setResult(secured);
      setPhase("secured");
      setStatus(
        secured.localOnly
          ? "Evidence saved on device (waiting for signal)."
          : secured.mediaPending
            ? "Transcript secured. Media pending better link."
            : "Evidence secured.",
      );
    } catch (e: any) {
      console.error(e);
      setStatus(e.message || String(e));
      Alert.alert("Processing failed", e.message || String(e));
      setPhase("idle");
    }
  };

  const openClaimOnWeb = useCallback(() => {
    if (!result || result.localOnly || !result.claimCode) {
      Alert.alert(
        "Not synced yet",
        "Need at least a brief data signal to register the compressed transcript and get a claim link. Tap Retry sync when you have bars.",
      );
      return;
    }
    const url =
      result.claimUrl ||
      `${CTF_WEB}/evidence.html?claim=${encodeURIComponent(result.sessionId)}${
        result.claimCode ? `&code=${encodeURIComponent(result.claimCode)}` : ""
      }`;
    Linking.openURL(url);
  }, [result]);

  const retrySync = useCallback(async () => {
    if (!result?.localId) return;
    setStatus("Retrying sync…");
    try {
      const item = await loadQueueItem(result.localId);
      if (!item) {
        Alert.alert("Nothing queued", "Local package not found on device.");
        return;
      }
      const flushed = await flushQueueItem(item);
      const gz = gzipTextToBase64(item.transcriptText);
      setResult({
        sessionId: flushed.sessionId || result.sessionId,
        status: flushed.status || result.status,
        claimCode: flushed.claimCode,
        claimUrl: flushed.claimUrl,
        verificationId: flushed.verificationId || flushed.sessionId || result.verificationId,
        uploads: flushed.uploads,
        audioSource: result.audioSource,
        transcriptEngine: result.transcriptEngine,
        linkTier: (await probeLink()).tier,
        mediaPending: !(flushed.uploads.audio && flushed.uploads.video),
        localOnly: !flushed.sessionId,
        localId: result.localId,
        compressedBytes: gz.gzipBytes,
      });
      setStatus(
        flushed.sessionId
          ? flushed.uploads.video
            ? "Evidence secured."
            : "Transcript synced. Media pending better link."
          : "Still offline — kept on device.",
      );
    } catch (e: any) {
      Alert.alert("Sync failed", e.message || String(e));
      setStatus(e.message || String(e));
    }
  }, [result]);

  const openDocs = useCallback(() => {
    if (!result) return;
    Linking.openURL(
      `${CTF_WEB}/?witnessSession=${encodeURIComponent(result.sessionId)}`,
    );
  }, [result]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>Challenge the Footage</Text>
        <Text style={styles.tagline}>
          Evidence · record first, account later
        </Text>
      </View>

      {phase === "consent" && (
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>Before you record</Text>
          <Text style={styles.body}>
            This app is part of Challenge the Footage. You can record without
            signing in — link the evidence to your account on the website
            afterward. Pay for document packs with a normal card. No crypto
            wallet.
          </Text>
          <Text style={styles.label}>State code</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="characters"
            maxLength={2}
            value={stateCode}
            onChangeText={setStateCode}
            placeholder="CA"
          />
          <Text style={styles.notice}>{consentNotice}</Text>
          <Pressable style={styles.btn} onPress={acceptConsent}>
            <Text style={styles.btnText}>I understand — continue</Text>
          </Pressable>
        </ScrollView>
      )}

      {phase === "idle" && (
        <View style={styles.panel}>
          <Text style={styles.h2}>Ready</Text>
          <Text style={styles.body}>
            Tap to start recording. Video and audio are captured together,
            hashed with full-file SHA-256, then secured to Challenge the
            Footage.
          </Text>
          <Pressable
            style={[styles.btn, styles.recordBtn]}
            onPress={startRecording}
          >
            <Text style={styles.btnText}>Start recording</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`${CTF_WEB}/evidence.html`)}
          >
            <Text style={styles.link}>Open evidence on the website</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await SecureStore.deleteItemAsync(CONSENT_KEY);
              setPhase("consent");
            }}
          >
            <Text style={styles.link}>Review consent notice</Text>
          </Pressable>
        </View>
      )}

      {(phase === "recording" || phase === "processing") && (
        <View style={styles.recordWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="video"
            mute={false}
          />
          <View style={styles.overlay}>
            <Text style={styles.status}>{status}</Text>
            <ScrollView style={styles.transcriptBox}>
              <Text style={styles.transcript}>{transcript}</Text>
            </ScrollView>
            {phase === "recording" ? (
              <Pressable
                style={[styles.btn, styles.stopBtn]}
                onPress={requestStop}
              >
                <Text style={styles.btnText}>
                  {recording ? "Stop & secure" : "Stopping…"}
                </Text>
              </Pressable>
            ) : (
              <ActivityIndicator color="#0b6e6e" size="large" />
            )}
          </View>
        </View>
      )}

      {phase === "secured" && result && (
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>Evidence secured</Text>
          <Text style={styles.body}>
            Verification ID{"\n"}
            <Text style={styles.monoInline}>{result.verificationId}</Text>
          </Text>
          <Text style={styles.body}>
            Audio:{" "}
            {result.audioSource === "pending"
              ? "pending extract"
              : result.audioSource}
            {" · "}
            Transcript:{" "}
            {result.transcriptEngine === "native"
              ? "on-device Whisper"
              : "pending (audio authoritative)"}
            {" · "}
            Link: {result.linkTier || "unknown"}
            {typeof result.compressedBytes === "number"
              ? ` · gzip ${result.compressedBytes}B`
              : ""}
            {" · "}
            Uploads:{" "}
            {[
              result.uploads?.transcript && "transcript",
              result.uploads?.audio && "audio",
              result.uploads?.video && "video",
            ]
              .filter(Boolean)
              .join(", ") ||
              (result.localOnly ? "none yet (on device)" : "hashes only")}
          </Text>
          {result.mediaPending || result.localOnly ? (
            <Text style={styles.body}>
              {result.localOnly
                ? "Package is on this phone. Even a weak 2G signal is enough to push the compressed transcript; video waits for a better link."
                : "Transcript is on the server. Audio/video will upload when connectivity improves — tap Retry sync on Wi‑Fi or stronger cell."}
            </Text>
          ) : null}
          {(result.localOnly || result.mediaPending) && (
            <Pressable style={styles.btn} onPress={retrySync}>
              <Text style={styles.btnText}>Retry sync</Text>
            </Pressable>
          )}
          <Pressable style={styles.btn} onPress={openClaimOnWeb}>
            <Text style={styles.btnText}>
              Link to my account on the website
            </Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.recordBtn]} onPress={openDocs}>
            <Text style={styles.btnText}>Prepare documents</Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={async () => {
              await Clipboard.setStringAsync(result.verificationId);
              Alert.alert("Copied", "Verification ID copied");
            }}
          >
            <Text style={styles.link}>Copy verification ID</Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={() => {
              setResult(null);
              setPhase("idle");
            }}
          >
            <Text style={styles.link}>New recording</Text>
          </Pressable>
          <Text style={styles.fine}>
            Free to record. Document packs on challengethefootage.com are $9 via
            card (free for public defenders).
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8eef2" },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#142028",
    letterSpacing: -0.5,
  },
  tagline: { color: "#3d4f5c", marginTop: 4 },
  panel: { padding: 20, gap: 12 },
  h2: { fontSize: 22, fontWeight: "700", color: "#142028" },
  body: { color: "#3d4f5c", lineHeight: 22 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3d4f5c",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(20,32,40,0.12)",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 18,
  },
  notice: {
    backgroundColor: "rgba(11,110,110,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#142028",
    lineHeight: 22,
  },
  btn: {
    backgroundColor: "#0b6e6e",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnGhost: { paddingVertical: 12, alignItems: "center" },
  recordBtn: { backgroundColor: "#142028" },
  stopBtn: { backgroundColor: "#9f1239" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: {
    color: "#085555",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  recordWrap: { flex: 1 },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(10,16,20,0.25)",
    gap: 10,
  },
  status: { color: "#fff", fontWeight: "600" },
  transcriptBox: {
    maxHeight: 140,
    backgroundColor: "rgba(15,23,28,0.75)",
    borderRadius: 10,
    padding: 10,
  },
  transcript: {
    color: "#e7eef2",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  monoInline: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#142028",
  },
  fine: { color: "#3d4f5c", fontSize: 12, marginTop: 8 },
});
