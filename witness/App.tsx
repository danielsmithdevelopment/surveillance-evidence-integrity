/**
 * Witness — civilian encounter recording
 *
 * Phases:
 *  1. consent   — first-run two-party / all-party consent notice by state
 *  2. idle      — ready; activate via tap (Siri/Google shortcut / shake TBD)
 *  3. recording — video + audio + on-device Whisper transcript
 *  4. processing — hash, sign, upload transcript → audio → video, Merkle root
 *  5. secured   — Arweave anchor + handoff to challengethefootage.com
 *
 * Incomplete (documented):
 *  - Audio extraction from video needs ffmpeg-kit-react-native (placeholder in stopAndProcess)
 *  - R2 presigned PUT URLs need AWS4 signing in worker handleUploadUrl
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";

const API_BASE = process.env.EXPO_PUBLIC_WITNESS_API || "https://witness.challengethefootage.com";
const CHALLENGE_URL = "https://challengethefootage.com";
const CONSENT_KEY = "witness_consent_v1";
const DEVICE_KEY = "witness_device_id";
const KEYPAIR_PUB = "witness_device_pub";
const KEYPAIR_PRIV = "witness_device_priv";

/** Eleven all-party consent states (notify before relying on recordings). */
const ALL_PARTY_STATES = new Set([
  "CA", "CT", "FL", "IL", "MD", "MA", "MI", "MT", "NH", "PA", "WA",
]);

type Phase = "consent" | "idle" | "recording" | "processing" | "secured";

type ArtifactKind = "transcript" | "audio" | "video";

interface SessionResult {
  sessionId: string;
  merkleRoot: string;
  arweaveTxId: string | null;
  transcriptHash: string;
  audioHash: string;
  videoHash: string;
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256File(uri: string): Promise<string> {
  // expo-crypto hashes strings; for large files prefer streaming native hash when available.
  // MVP: read as base64 in chunks is heavy — hash the URI + size + partial for local integrity marker,
  // and replace with native SHA-256 of file bytes before production.
  const info = await FileSystem.getInfoAsync(uri);
  const size = info.exists && "size" in info ? info.size : 0;
  const head = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    length: Math.min(64 * 1024, Number(size) || 64 * 1024),
    position: 0,
  }).catch(() => "");
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${uri}|${size}|${head}`
  );
}

async function sha256Text(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

/** Placeholder device key: persist a random secret; production should use secure-enclave / Keychain. */
async function ensureDeviceKeys(): Promise<{ deviceId: string; publicKey: string; privateKey: string }> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
  let publicKey = await SecureStore.getItemAsync(KEYPAIR_PUB);
  let privateKey = await SecureStore.getItemAsync(KEYPAIR_PRIV);
  if (!deviceId || !publicKey || !privateKey) {
    deviceId = randomId("dev");
    privateKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${deviceId}-${Date.now()}-${Math.random()}`
    );
    publicKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `pub:${privateKey}`
    );
    await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
    await SecureStore.setItemAsync(KEYPAIR_PUB, publicKey);
    await SecureStore.setItemAsync(KEYPAIR_PRIV, privateKey);
  }
  return { deviceId, publicKey, privateKey };
}

async function signPayload(privateKey: string, payload: string): Promise<string> {
  // Placeholder HMAC-style signature until WebCrypto / expo-standard-web-crypto Ed25519 lands.
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${privateKey}:${payload}`
  );
}

async function apiJson(path: string, init?: RequestInit & { deviceId?: string }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.deviceId) headers["X-Device-Id"] = init.deviceId;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [stateCode, setStateCode] = useState("CA");
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SessionResult | null>(null);
  const startedAt = useRef<string | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const consented = await SecureStore.getItemAsync(CONSENT_KEY);
      if (consented) setPhase("idle");
    })();
  }, []);

  const consentNotice = useMemo(() => {
    if (ALL_PARTY_STATES.has(stateCode.toUpperCase())) {
      return (
        `You selected ${stateCode.toUpperCase()}, an all-party consent state. ` +
        `Notify the officer that you are recording before relying on this recording in legal proceedings. ` +
        `This app does not give legal advice — consult an attorney in your jurisdiction.`
      );
    }
    return (
      `You selected ${stateCode.toUpperCase()}. Many one-party consent states allow you to record conversations you are part of, ` +
      `but rules vary. Notify when appropriate and consult an attorney before relying on Witness recordings in court.`
    );
  }, [stateCode]);

  const acceptConsent = async () => {
    await SecureStore.setItemAsync(
      CONSENT_KEY,
      JSON.stringify({ at: new Date().toISOString(), state: stateCode.toUpperCase() })
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
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
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
      setStatus("Recording… Whisper on-device transcription runs while you record.");

      // Start camera recording
      const cam = cameraRef.current;
      if (!cam) throw new Error("Camera not ready");
      // Fire-and-forget recordAsync; stop via stopRecording
      cam.recordAsync({ maxDuration: 60 * 30 }).then(async (video) => {
        await stopAndProcess(video?.uri);
      }).catch((e) => {
        console.warn(e);
        setStatus(String(e.message || e));
        setPhase("idle");
        setRecording(false);
      });

      // Placeholder: react-native-whisper realtime loop would append to transcript here.
      setTranscript((t) => t || "[Live transcript placeholder — wire react-native-whisper in production]\n");
    } catch (e: any) {
      Alert.alert("Cannot start", e.message || String(e));
    }
  };

  const requestStop = () => {
    setStatus("Stopping…");
    cameraRef.current?.stopRecording();
  };

  const uploadArtifact = async (
    sessionId: string,
    deviceId: string,
    privateKey: string,
    kind: ArtifactKind,
    uri: string,
    mimeType: string,
    hash: string
  ) => {
    const signature = await signPayload(privateKey, `${sessionId}:${kind}:${hash}`);
    const { uploadUrl, publicUrl } = await apiJson("/api/upload-url", {
      method: "POST",
      deviceId,
      body: JSON.stringify({
        sessionId,
        artifactType: kind,
        hash,
        mimeType,
        deviceId,
        signature,
      }),
    });

    // Production: PUT file bytes to R2 presigned URL.
    // Current worker returns a placeholder publicUrl — attempt PUT; ignore failure in MVP.
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: base64,
      });
    } catch (e) {
      console.warn("Upload PUT failed (presign incomplete):", e);
    }
    return publicUrl as string;
  };

  const stopAndProcess = async (videoUri?: string) => {
    setRecording(false);
    setPhase("processing");
    const sessionId = randomId("wit");
    const endedAt = new Date().toISOString();

    try {
      const keys = await ensureDeviceKeys();
      setStatus("Writing transcript…");

      const transcriptText =
        transcript ||
        `[Witness transcript — ${startedAt.current} → ${endedAt}]\nOn-device Whisper output will appear here.`;
      const transcriptPath = `${FileSystem.cacheDirectory}${sessionId}-transcript.txt`;
      await FileSystem.writeAsStringAsync(transcriptPath, transcriptText);

      // INCOMPLETE: extract audio from video via ffmpeg-kit-react-native
      // Placeholder: copy video path as "audio" marker file for pipeline continuity
      setStatus("Audio extraction placeholder (ffmpeg-kit-react-native not wired)…");
      const audioPath = `${FileSystem.cacheDirectory}${sessionId}-audio.placeholder.txt`;
      await FileSystem.writeAsStringAsync(
        audioPath,
        `AUDIO_EXTRACTION_PENDING\nsourceVideo=${videoUri || "none"}\nInstall ffmpeg-kit-react-native and extract AAC/WAV here.`
      );

      if (!videoUri) throw new Error("No video captured");

      setStatus("Hashing artifacts…");
      const transcriptHash = await sha256Text(transcriptText);
      const audioHash = await sha256File(audioPath);
      const videoHash = await sha256File(videoUri);
      const merkleRoot = await sha256Text(`${transcriptHash}:${audioHash}:${videoHash}`);
      const deviceSignature = await signPayload(
        keys.privateKey,
        `${sessionId}:${merkleRoot}`
      );

      // Priority upload: transcript → audio → video
      setStatus("Uploading transcript…");
      const transcriptUrl = await uploadArtifact(
        sessionId, keys.deviceId, keys.privateKey, "transcript", transcriptPath, "text/plain", transcriptHash
      );
      setStatus("Uploading audio…");
      const audioUrl = await uploadArtifact(
        sessionId, keys.deviceId, keys.privateKey, "audio", audioPath, "text/plain", audioHash
      );
      setStatus("Uploading video…");
      const videoUrl = await uploadArtifact(
        sessionId, keys.deviceId, keys.privateKey, "video", videoUri, "video/mp4", videoHash
      );

      setStatus("Anchoring Merkle root to Arweave…");
      const anchor = await apiJson("/api/anchor", {
        method: "POST",
        deviceId: keys.deviceId,
        body: JSON.stringify({
          sessionId,
          deviceId: keys.deviceId,
          merkleRoot,
          deviceSignature,
          transcriptHash,
          audioHash,
          videoHash,
          transcriptUrl,
          audioUrl,
          videoUrl,
          startedAt: startedAt.current,
          endedAt,
          location: locationRef.current,
        }),
      });

      setResult({
        sessionId,
        merkleRoot,
        arweaveTxId: anchor.arweaveTxId || null,
        transcriptHash,
        audioHash,
        videoHash,
      });
      setPhase("secured");
      setStatus("Secured.");
    } catch (e: any) {
      console.error(e);
      setStatus(e.message || String(e));
      Alert.alert("Processing failed", e.message || String(e));
      setPhase("idle");
    }
  };

  const openChallenge = useCallback(() => {
    if (!result) return;
    const url = `${CHALLENGE_URL}/?witnessSession=${encodeURIComponent(result.sessionId)}`;
    Linking.openURL(url);
  }, [result]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>Witness</Text>
        <Text style={styles.tagline}>Record. Transcribe. Anchor. Challenge.</Text>
      </View>

      {phase === "consent" && (
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>Recording consent</Text>
          <Text style={styles.body}>
            Before first use, confirm your state so we can show the right consent notice.
            Eleven states require all-party consent, including California.
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
            Tap below to start recording (Siri / Google Assistant shortcuts and shake-to-activate can hook this same startRecording entry point).
          </Text>
          <Pressable style={[styles.btn, styles.recordBtn]} onPress={startRecording}>
            <Text style={styles.btnText}>Start recording</Text>
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
              <Pressable style={[styles.btn, styles.stopBtn]} onPress={requestStop}>
                <Text style={styles.btnText}>{recording ? "Stop & secure" : "Stopping…"}</Text>
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
          <Text style={styles.body}>Session {result.sessionId}</Text>
          <Text style={styles.mono}>Merkle root{"\n"}{result.merkleRoot}</Text>
          <Text style={styles.mono}>
            Arweave{"\n"}{result.arweaveTxId || "pending — retry via worker /api/anchor"}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={async () => {
              await Clipboard.setStringAsync(result.merkleRoot);
              Alert.alert("Copied", "Merkle root copied");
            }}
          >
            <Text style={styles.btnText}>Copy Merkle root</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.recordBtn]} onPress={openChallenge}>
            <Text style={styles.btnText}>Open Challenge the Footage</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={() => { setResult(null); setPhase("idle"); }}>
            <Text style={styles.link}>New recording</Text>
          </Pressable>
          <Text style={styles.fine}>
            Free to record. Document generation on challengethefootage.com is $9 (free for public defenders).
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8eef2" },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 16 : 8, paddingBottom: 8 },
  brand: { fontSize: 34, fontWeight: "700", color: "#142028", letterSpacing: -0.5 },
  tagline: { color: "#3d4f5c", marginTop: 4 },
  panel: { padding: 20, gap: 12 },
  h2: { fontSize: 22, fontWeight: "700", color: "#142028" },
  body: { color: "#3d4f5c", lineHeight: 22 },
  label: { fontSize: 12, fontWeight: "700", color: "#3d4f5c", textTransform: "uppercase", letterSpacing: 0.6 },
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
  link: { color: "#085555", fontWeight: "600", textAlign: "center", marginTop: 8 },
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
  transcript: { color: "#e7eef2", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: "#142028",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  fine: { color: "#3d4f5c", fontSize: 12, marginTop: 8 },
});
