/**
 * Challenge the Footage — Evidence (native)
 *
 * Personal-safety recorder: police encounters, meetups, dates, night walks.
 * Record-first, on-device Whisper, rural 2G transcript sync, emergency contacts.
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
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { CTF_WEB } from "./src/config";
import {
  extractAudioWithFfmpeg,
  startParallelAudio,
  type AudioCapture,
} from "./src/audio";
import {
  getWhisperEngine,
  liveTranscriptBanner,
  downloadWhisperModel,
  isWhisperModelReady,
  resetWhisperEngine,
} from "./src/whisper";
import { probeLink, uploadPlan } from "./src/connectivity";
import { flushQueueItem } from "./src/sync";
import {
  listQueueItems,
  loadQueueItem,
  needsSync,
  saveQueueItem,
} from "./src/queue";
import { gzipTextToBase64 } from "./src/gzip";
import { buildQueuePackage } from "./src/package-session";
import {
  SCENARIO_LABELS,
  clearRecordingActive,
  dispatchSafetyAlert,
  loadCheckInMinutes,
  loadContacts,
  loadScenario,
  markRecordingActive,
  readRecordingActive,
  saveCheckInMinutes,
  saveContacts,
  saveScenario,
  type SafetyContact,
  type SafetyScenario,
} from "./src/safety";

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
  interrupted?: boolean;
  interruptReason?: string | null;
  scenario?: SafetyScenario;
  safetyAlertSent?: boolean;
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
  const stopRealtimeRef = useRef<null | (() => Promise<{
    text: string;
    audioPath: string | null;
  }>)>(null);
  const liveModelTextRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SessionResult | null>(null);
  const [whisperReady, setWhisperReady] = useState(false);
  const [modelPct, setModelPct] = useState<number | null>(null);
  const [scenario, setScenario] = useState<SafetyScenario>("other");
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [checkInMinutes, setCheckInMinutes] = useState(30);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [checkInLeft, setCheckInLeft] = useState<number | null>(null);
  const startedAt = useRef<string | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const whisperEngineId = useRef<"stub" | "native">("stub");
  const manualNotesRef = useRef("");
  const userStopRef = useRef(false);
  const checkInTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkInDeadlineRef = useRef<number | null>(null);
  const activeLocalIdRef = useRef<string | null>(null);
  const stopAndProcessRef = useRef<
    | ((
        videoUri?: string,
        opts?: { interrupted?: boolean; reason?: string },
      ) => Promise<void>)
    | null
  >(null);

  useEffect(() => {
    (async () => {
      const consented = await SecureStore.getItemAsync(CONSENT_KEY);
      if (consented) setPhase("idle");
      try {
        setWhisperReady(await isWhisperModelReady());
      } catch {
        setWhisperReady(false);
      }
      setContacts(await loadContacts());
      setCheckInMinutes(await loadCheckInMinutes());
      setScenario(await loadScenario());

      // Force-quit / crash while recording → interrupt recovery.
      const orphan = await readRecordingActive();
      if (orphan) {
        await clearRecordingActive();
        const deviceId = orphan.deviceId || (await ensureDeviceId());
        const localId = orphan.localId || randomId("local");
        const endedAt = new Date().toISOString();
        const { queueItem, transcriptText } = await buildQueuePackage({
          localId,
          deviceId,
          stateCode: stateCode.toUpperCase(),
          startedAt: orphan.startedAt,
          endedAt,
          engine: "stub",
          modelText: "",
          manualNotes: "App was killed or crashed during recording.",
          audioUri: null,
          videoUri: null,
          audioSource: "pending",
          location: null,
          scenario: orphan.scenario,
          interrupted: true,
          interruptReason: "process_death",
        });
        await saveQueueItem(queueItem);
        const alert = await dispatchSafetyAlert({
          kind: "interrupt",
          scenario: orphan.scenario || "other",
          deviceId,
          startedAt: orphan.startedAt,
          location: null,
          localId,
          interruptReason: "App closed during recording (possible forced stop)",
          openSms: true,
        });
        queueItem.safetyAlertSent = alert.smsOpened > 0 || alert.pingOk;
        await saveQueueItem(queueItem);
        try {
          await flushQueueItem(queueItem);
        } catch {
          // offline ok
        }
        setResult({
          sessionId: queueItem.sessionId || localId,
          status: queueItem.status || "interrupted",
          claimCode: queueItem.claimCode,
          claimUrl: queueItem.claimUrl,
          verificationId: queueItem.verificationId || localId,
          uploads: queueItem.uploads,
          interrupted: true,
          interruptReason: "process_death",
          scenario: orphan.scenario,
          safetyAlertSent: queueItem.safetyAlertSent,
          localOnly: !queueItem.sessionId,
          localId,
          mediaPending: true,
        });
        setTranscript(transcriptText);
        setPhase("secured");
        setStatus("Recovered interrupted recording — safety contacts notified if configured.");
      }
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
    const base =
      `Challenge the Footage helps you keep a private record when you do not feel safe — ` +
      `police encounters, marketplace meetups, first dates, walking alone at night, and similar situations.`;
    if (ALL_PARTY_STATES.has(stateCode.toUpperCase())) {
      return (
        `${base} You selected ${stateCode.toUpperCase()}, an all-party consent state. ` +
        `Notify others that you are recording when required. This is not legal advice.`
      );
    }
    return (
      `${base} You selected ${stateCode.toUpperCase()}. Rules vary by state — ` +
      `notify when appropriate and consult an attorney before relying on recordings in court.`
    );
  }, [stateCode]);

  const clearCheckInTimer = useCallback(() => {
    if (checkInTimerRef.current) {
      clearInterval(checkInTimerRef.current);
      checkInTimerRef.current = null;
    }
    checkInDeadlineRef.current = null;
    setCheckInLeft(null);
  }, []);

  const armCheckInTimer = useCallback(
    (minutes: number, deviceId: string) => {
      clearCheckInTimer();
      if (minutes <= 0) return;
      const deadline = Date.now() + minutes * 60 * 1000;
      checkInDeadlineRef.current = deadline;
      setCheckInLeft(minutes * 60);
      checkInTimerRef.current = setInterval(async () => {
        const left = Math.max(
          0,
          Math.ceil(((checkInDeadlineRef.current || 0) - Date.now()) / 1000),
        );
        setCheckInLeft(left);
        if (left <= 0) {
          clearCheckInTimer();
          setStatus("Check-in missed — alerting emergency contacts…");
          await dispatchSafetyAlert({
            kind: "deadman",
            scenario,
            deviceId,
            startedAt: startedAt.current || undefined,
            location: locationRef.current,
            localId: activeLocalIdRef.current,
            openSms: true,
          });
        }
      }, 1000);
    },
    [clearCheckInTimer, scenario],
  );

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
      const deviceId = await ensureDeviceId();
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
      userStopRef.current = false;
      const localId = randomId("local");
      activeLocalIdRef.current = localId;
      await markRecordingActive({
        localId,
        startedAt: startedAt.current,
        scenario,
        deviceId,
      });
      await saveScenario(scenario);

      setTranscript("");
      setPhase("recording");
      setRecording(true);
      setStatus("Recording…");

      const engine = await getWhisperEngine();
      whisperEngineId.current = engine.id;
      liveModelTextRef.current = "";
      stopRealtimeRef.current = null;
      setTranscript(liveTranscriptBanner(engine.id));
      setStatus(engine.label);

      if (engine.id === "native" && engine.supportsRealtime) {
        stopRealtimeRef.current = await engine.startRealtime((partial) => {
          liveModelTextRef.current = partial;
          setTranscript(`${liveTranscriptBanner("native")}${partial}\n`);
        });
        audioRef.current = null;
      } else {
        audioRef.current = await startParallelAudio();
      }

      armCheckInTimer(checkInMinutes, deviceId);

      const cam = cameraRef.current;
      if (!cam) throw new Error("Camera not ready");
      cam
        .recordAsync({ maxDuration: 60 * 30 })
        .then(async (video) => {
          const interrupted = !userStopRef.current;
          await stopAndProcessRef.current?.(video?.uri, {
            interrupted,
            reason: interrupted
              ? "recording_ended_without_stop_button"
              : undefined,
          });
        })
        .catch(async (e) => {
          console.warn(e);
          await stopAndProcessRef.current?.(undefined, {
            interrupted: true,
            reason: e?.message || "camera_error",
          });
        });
    } catch (e: any) {
      await clearRecordingActive();
      clearCheckInTimer();
      Alert.alert("Cannot start", e.message || String(e));
    }
  };

  const requestStop = () => {
    userStopRef.current = true;
    setStatus("Stopping…");
    cameraRef.current?.stopRecording();
  };

  const extendCheckIn = useCallback(async () => {
    const deviceId = await ensureDeviceId();
    armCheckInTimer(checkInMinutes || 15, deviceId);
    setStatus("Check-in extended.");
  }, [armCheckInTimer, checkInMinutes]);

  const stopAndProcess = async (
    videoUri?: string,
    opts?: { interrupted?: boolean; reason?: string },
  ) => {
    setRecording(false);
    setPhase("processing");
    clearCheckInTimer();
    const endedAt = new Date().toISOString();
    const interrupted = !!opts?.interrupted;
    const interruptReason = opts?.reason || null;

    try {
      const deviceId = await ensureDeviceId();
      await clearRecordingActive();

      setStatus("Finalizing audio…");
      let audioUri: string | null = null;
      let audioSource: SessionResult["audioSource"] = "pending";
      let modelText = "";

      if (stopRealtimeRef.current) {
        setStatus("Finalizing on-device transcript…");
        try {
          const live = await stopRealtimeRef.current();
          modelText = live.text || liveModelTextRef.current || "";
          if (live.audioPath) {
            audioUri = live.audioPath;
            audioSource = "parallel";
          }
        } catch (e) {
          console.warn("Realtime Whisper stop:", e);
        }
        stopRealtimeRef.current = null;
      }

      if (!audioUri && audioRef.current) {
        audioUri = await audioRef.current.stop();
        audioRef.current = null;
        if (audioUri) audioSource = "parallel";
      } else {
        audioRef.current = null;
      }

      if (!audioUri && videoUri) {
        setStatus("Trying ffmpeg audio extract…");
        audioUri = await extractAudioWithFfmpeg(videoUri);
        if (audioUri) audioSource = "ffmpeg";
      }

      setStatus("Transcribing…");
      const engine = await getWhisperEngine();
      whisperEngineId.current = engine.id;
      if (!modelText && audioUri) {
        try {
          const spoken = await engine.transcribeFile(audioUri);
          modelText = spoken.text || "";
        } catch (e: any) {
          console.warn("Whisper transcribe:", e?.message || e);
        }
      }
      if (modelText) {
        setTranscript(`${liveTranscriptBanner(engine.id)}${modelText}\n`);
      }

      const manualNotes = transcript
        .replace(/\[Transcript\][^\n]*\n?/g, "")
        .replace(modelText, "")
        .trim();
      manualNotesRef.current = manualNotes;

      const localId = activeLocalIdRef.current || randomId("local");
      setStatus("Hashing (full file SHA-256)…");
      const { queueItem, transcriptText } = await buildQueuePackage({
        localId,
        deviceId,
        stateCode: stateCode.toUpperCase(),
        startedAt: startedAt.current!,
        endedAt,
        engine: engine.id,
        modelText,
        manualNotes,
        audioUri,
        videoUri: videoUri || null,
        audioSource,
        location: locationRef.current,
        scenario,
        interrupted,
        interruptReason,
      });
      setTranscript(transcriptText);
      await saveQueueItem(queueItem);

      if (interrupted) {
        setStatus("Interrupted — securing what we have + alerting contacts…");
        const alert = await dispatchSafetyAlert({
          kind: "interrupt",
          scenario,
          deviceId,
          startedAt: startedAt.current || undefined,
          location: locationRef.current,
          localId,
          interruptReason:
            interruptReason || "Recording stopped unexpectedly",
          openSms: true,
        });
        queueItem.safetyAlertSent = alert.smsOpened > 0 || alert.pingOk;
        await saveQueueItem(queueItem);
      }

      setStatus("Checking link (rural / 2G aware)…");
      const link = await probeLink();
      const plan = uploadPlan(link.tier);
      setStatus(link.detail);

      let secured: SessionResult = {
        sessionId: localId,
        status: interrupted ? "interrupted_local" : "local_only",
        verificationId: localId,
        uploads: {},
        audioSource: queueItem.audioSource,
        transcriptEngine: engine.id,
        linkTier: link.tier,
        mediaPending: true,
        localOnly: true,
        localId,
        interrupted,
        interruptReason,
        scenario,
        safetyAlertSent: queueItem.safetyAlertSent,
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
          if (interrupted && flushed.claimUrl) {
            await dispatchSafetyAlert({
              kind: "interrupt",
              scenario,
              deviceId,
              startedAt: startedAt.current || undefined,
              location: locationRef.current,
              localId,
              sessionId: flushed.sessionId,
              claimUrl: flushed.claimUrl,
              interruptReason: interruptReason || "Recording interrupted",
              openSms: false,
            });
          }
          secured = {
            sessionId: flushed.sessionId || localId,
            status: flushed.status || (interrupted ? "interrupted" : "secured"),
            claimCode: flushed.claimCode,
            claimUrl: flushed.claimUrl,
            verificationId:
              flushed.verificationId || flushed.sessionId || localId,
            uploads: flushed.uploads,
            audioSource: queueItem.audioSource,
            transcriptEngine: engine.id,
            linkTier: link.tier,
            mediaPending: !(flushed.uploads.audio && flushed.uploads.video),
            localOnly: !flushed.sessionId,
            localId,
            compressedBytes: gzInfo.gzipBytes,
            interrupted,
            interruptReason,
            scenario,
            safetyAlertSent: queueItem.safetyAlertSent,
          };
        } catch (syncErr: any) {
          console.warn("Sync failed — kept on device:", syncErr);
          Alert.alert(
            "Saved on device",
            `${syncErr.message || syncErr}\n\nHashes and transcript are stored locally.`,
          );
        }
      } else if (!interrupted) {
        Alert.alert(
          "Saved on device",
          "No data connection. We will sync a compressed transcript when you get even a weak (2G) signal.",
        );
      }

      setResult(secured);
      setPhase("secured");
      setStatus(
        interrupted
          ? "Interrupted session secured. Contacts alerted if configured."
          : secured.localOnly
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

  stopAndProcessRef.current = stopAndProcess;

  const prepSpeechModel = useCallback(async () => {
    try {
      setModelPct(0);
      setStatus("Downloading on-device speech model on Wi‑Fi…");
      await downloadWhisperModel({
        onProgress: (p) => setModelPct(p.pct),
      });
      resetWhisperEngine();
      setWhisperReady(true);
      setModelPct(null);
      setStatus("Speech model ready for offline use.");
      Alert.alert(
        "Speech model ready",
        "On-device Whisper can run without a network. Over 2G we still only sync the compressed transcript until the link improves.",
      );
    } catch (e: any) {
      setModelPct(null);
      Alert.alert("Model download", e.message || String(e));
      setStatus(e.message || String(e));
    }
  }, []);

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
          Personal safety · record first, account later
        </Text>
      </View>

      {phase === "consent" && (
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>Before you record</Text>
          <Text style={styles.body}>
            This is your personal safety recorder for Challenge the Footage —
            police encounters, marketplace meetups, first dates, walking alone
            at night, or any moment you want a private record. Record without
            signing in; link evidence on the website later. No crypto wallet.
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
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>Ready</Text>
          <Text style={styles.body}>
            Capture works offline. On a weak (2G) link we sync a compressed
            transcript first. If recording is force-stopped, we keep what we
            can and alert your emergency contacts.
          </Text>

          <Text style={styles.label}>Situation</Text>
          {(Object.keys(SCENARIO_LABELS) as SafetyScenario[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.chip, scenario === key ? styles.chipOn : null]}
              onPress={() => setScenario(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  scenario === key ? styles.chipTextOn : null,
                ]}
              >
                {SCENARIO_LABELS[key]}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.label}>Check-in timer (minutes, 0 = off)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(checkInMinutes)}
            onChangeText={async (t) => {
              const n = Number(t.replace(/[^\d]/g, "")) || 0;
              setCheckInMinutes(n);
              await saveCheckInMinutes(n);
            }}
          />
          <Text style={styles.body}>
            If you do not extend check-in before the timer ends, we open SMS
            drafts to your emergency contacts with your last location.
          </Text>

          <Text style={styles.label}>Emergency contacts</Text>
          {contacts.map((c) => (
            <View key={c.id} style={styles.contactRow}>
              <Text style={styles.body}>
                {c.name} · {c.phone}
              </Text>
              <Pressable
                onPress={async () => {
                  const next = contacts.filter((x) => x.id !== c.id);
                  setContacts(next);
                  await saveContacts(next);
                }}
              >
                <Text style={styles.link}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={contactName}
            onChangeText={setContactName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />
          <Pressable
            style={styles.btnGhost}
            onPress={async () => {
              if (!contactName.trim() || !contactPhone.trim()) return;
              const next = [
                ...contacts,
                {
                  id: randomId("c"),
                  name: contactName.trim(),
                  phone: contactPhone.trim(),
                },
              ].slice(0, 5);
              setContacts(next);
              await saveContacts(next);
              setContactName("");
              setContactPhone("");
            }}
          >
            <Text style={styles.link}>Add contact</Text>
          </Pressable>

          <Text style={styles.body}>
            Speech model:{" "}
            {whisperReady
              ? "ready (on-device Whisper)"
              : modelPct !== null
                ? `downloading… ${modelPct}%`
                : "not installed — download on Wi‑Fi before rural use"}
          </Text>
          {!whisperReady && (
            <Pressable
              style={[styles.btn, styles.recordBtn]}
              onPress={prepSpeechModel}
              disabled={modelPct !== null}
            >
              <Text style={styles.btnText}>
                {modelPct !== null
                  ? `Downloading model… ${modelPct}%`
                  : "Download speech model (Wi‑Fi, ~75MB)"}
              </Text>
            </Pressable>
          )}
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
        </ScrollView>
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
            {checkInLeft !== null ? (
              <Text style={styles.status}>
                Check-in in {Math.floor(checkInLeft / 60)}:
                {String(checkInLeft % 60).padStart(2, "0")}
              </Text>
            ) : null}
            <ScrollView style={styles.transcriptBox}>
              <Text style={styles.transcript}>{transcript}</Text>
            </ScrollView>
            {phase === "recording" ? (
              <>
                {checkInMinutes > 0 ? (
                  <Pressable style={styles.btn} onPress={extendCheckIn}>
                    <Text style={styles.btnText}>I&apos;m OK — extend check-in</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.btn, styles.stopBtn]}
                  onPress={requestStop}
                >
                  <Text style={styles.btnText}>
                    {recording ? "Stop & secure" : "Stopping…"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color="#0b6e6e" size="large" />
            )}
          </View>
        </View>
      )}

      {phase === "secured" && result && (
        <ScrollView contentContainerStyle={styles.panel}>
          <Text style={styles.h2}>
            {result.interrupted ? "Interrupted — package secured" : "Evidence secured"}
          </Text>
          {result.interrupted ? (
            <Text style={styles.body}>
              Recording ended unexpectedly
              {result.interruptReason ? ` (${result.interruptReason})` : ""}.
              We kept hashes/transcript where possible
              {result.safetyAlertSent ? " and notified emergency contacts" : ""}.
            </Text>
          ) : null}
          {result.scenario ? (
            <Text style={styles.body}>
              Situation: {SCENARIO_LABELS[result.scenario] || result.scenario}
            </Text>
          ) : null}
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
  chip: {
    borderWidth: 1,
    borderColor: "#9ab0bc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipOn: { backgroundColor: "#0b6e6e", borderColor: "#0b6e6e" },
  chipText: { color: "#142028", fontSize: 14 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
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
