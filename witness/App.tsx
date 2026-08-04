/**
 * Challenge the Footage — Evidence (native)
 *
 * Expo / React Native companion. Record first (no Google mid-encounter),
 * secure via CTF /api/evidence/secure-device, then claim on the website.
 *
 * Incomplete: ffmpeg audio extract, full-file SHA-256, live Whisper, enclave keys.
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
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { CTF_API, CTF_WEB } from "./src/config";

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
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256File(uri: string): Promise<string> {
  // MVP integrity marker — replace with full-file SHA-256 before court use.
  const info = await FileSystem.getInfoAsync(uri);
  const size = info.exists && "size" in info ? info.size : 0;
  const head = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    length: Math.min(64 * 1024, Number(size) || 64 * 1024),
    position: 0,
  }).catch(() => "");
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${uri}|${size}|${head}`,
  );
}

async function sha256Text(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

async function ensureDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!deviceId) {
    deviceId = randomId("dev");
    await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

async function apiJson(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const res = await fetch(`${CTF_API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
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
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

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

      setTranscript(
        (t) =>
          t ||
          "[Live transcript placeholder — on-device Whisper will appear here in a later build]\n",
      );
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
      setStatus("Preparing evidence package…");

      const transcriptText =
        transcript ||
        `[Evidence transcript — ${startedAt.current} → ${endedAt}]\nOn-device Whisper output will appear here.`;
      const transcriptPath = `${FileSystem.cacheDirectory}transcript-${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(transcriptPath, transcriptText);

      // INCOMPLETE: extract audio via ffmpeg — placeholder keeps pipeline moving.
      setStatus("Audio extract pending (ffmpeg) — continuing…");
      const audioPath = `${FileSystem.cacheDirectory}audio-${Date.now()}.placeholder.txt`;
      await FileSystem.writeAsStringAsync(
        audioPath,
        `AUDIO_EXTRACTION_PENDING\nsourceVideo=${videoUri || "none"}`,
      );

      if (!videoUri) throw new Error("No video captured");

      setStatus("Hashing…");
      const transcriptHash = await sha256Text(transcriptText);
      const audioHash = await sha256File(audioPath);
      const videoHash = await sha256File(videoUri);

      setStatus("Securing to Challenge the Footage…");
      const secured = await apiJson("/api/evidence/secure-device", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          transcriptHash,
          audioHash,
          videoHash,
          transcriptText,
          mimeType: "video/mp4",
          startedAt: startedAt.current,
          endedAt,
          stateCode: stateCode.toUpperCase(),
          source: "native",
          location: locationRef.current,
        }),
      });

      setResult({
        sessionId: secured.sessionId,
        status: secured.status,
        claimCode: secured.claimCode,
        claimUrl: secured.claimUrl,
        verificationId: secured.verificationId || secured.sessionId,
      });
      setPhase("secured");
      setStatus("Evidence secured.");
    } catch (e: any) {
      console.error(e);
      setStatus(e.message || String(e));
      Alert.alert("Processing failed", e.message || String(e));
      setPhase("idle");
    }
  };

  const openClaimOnWeb = useCallback(() => {
    if (!result) return;
    const url =
      result.claimUrl ||
      `${CTF_WEB}/evidence.html?claim=${encodeURIComponent(result.sessionId)}${
        result.claimCode ? `&code=${encodeURIComponent(result.claimCode)}` : ""
      }`;
    Linking.openURL(url);
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
            Tap to start recording. Shortcuts (Siri / Assistant / shake) can
            call the same start action later.
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
            {result.status === "anchored"
              ? "Independently verifiable on our systems."
              : "Saved securely. Independent verification may still be processing."}
          </Text>
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
