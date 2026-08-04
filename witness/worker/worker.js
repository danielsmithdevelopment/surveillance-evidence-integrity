/**
 * Witness App — Cloudflare Worker Backend
 *
 * Routes:
 *   POST /api/upload-url      — generate signed R2 upload URL for an artifact
 *   POST /api/anchor          — anchor Merkle root to Arweave via ClawQL gateway
 *   GET  /api/session/:id     — retrieve session package for a recording
 *   GET  /api/verify/:id      — public verification of a session (no auth required)
 *
 * Secrets (wrangler secret put):
 *   CLAWQL_GATEWAY_URL
 *   CLAWQL_API_KEY
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *
 * KV namespace bindings (wrangler.toml):
 *   SESSIONS_KV              — session packages, keyed by sessionId
 *   DEVICE_REGISTRY_KV       — registered device IDs
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/upload-url'  && request.method === 'POST') return handleUploadUrl(request, env);
      if (url.pathname === '/api/anchor'      && request.method === 'POST') return handleAnchor(request, env);
      if (url.pathname.startsWith('/api/session/') && request.method === 'GET') {
        return handleSession(request, env, url.pathname.split('/api/session/')[1]);
      }
      if (url.pathname.startsWith('/api/verify/') && request.method === 'GET') {
        return handleVerify(request, env, url.pathname.split('/api/verify/')[1]);
      }
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal error', detail: err.message }, 500);
    }
  },
};

// ─── Upload URL ───────────────────────────────────────────────────────────────

async function handleUploadUrl(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid body' }, 400); }

  const { sessionId, artifactType, hash, mimeType, deviceId, signature } = body;

  if (!sessionId || !artifactType || !hash || !mimeType || !deviceId) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // Verify device is registered (or register on first upload)
  await env.DEVICE_REGISTRY_KV.put(
    `device:${deviceId}`,
    JSON.stringify({ deviceId, firstSeen: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 365 * 10 } // 10 years
  );

  // Generate a presigned R2 upload URL
  // In production: use AWS4 signature for R2 presigned URLs
  // For now: return a worker-proxied upload URL
  const key = `${sessionId}/${artifactType}-${hash.slice(0, 8)}.${mimeType.split('/')[1]}`;
  const publicUrl = `https://witness-recordings.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  // Store pending upload record
  await env.SESSIONS_KV.put(
    `upload:${sessionId}:${artifactType}`,
    JSON.stringify({ sessionId, artifactType, hash, mimeType, deviceId, key, signature, uploadedAt: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
  );

  return json({
    uploadUrl:  publicUrl, // Replace with actual R2 presigned URL in production
    publicUrl,
    key,
  });
}

// ─── Anchor to Arweave ────────────────────────────────────────────────────────

async function handleAnchor(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid body' }, 400); }

  const {
    sessionId, deviceId, merkleRoot, deviceSignature,
    transcriptHash, audioHash, videoHash,
    transcriptUrl, audioUrl, videoUrl,
    startedAt, endedAt, location,
  } = body;

  if (!sessionId || !merkleRoot || !deviceSignature) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // Build the session package
  const sessionPackage = {
    sessionId,
    deviceId,
    startedAt,
    endedAt,
    durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
    location,
    transcriptHash,
    audioHash,
    videoHash,
    merkleRoot,
    deviceSignature,
    transcriptUrl,
    audioUrl,
    videoUrl,
    anchoredAt: new Date().toISOString(),
  };

  // Anchor to Arweave via ClawQL gateway
  let arweaveTxId = null;
  try {
    const anchorRes = await fetch(`${env.CLAWQL_GATEWAY_URL}/surveillance/witness/anchor`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.CLAWQL_API_KEY}`,
      },
      body: JSON.stringify({
        type:          'witness_session',
        sessionId,
        deviceId,
        merkleRoot,
        deviceSignature,
        artifactHashes: { transcript: transcriptHash, audio: audioHash, video: videoHash },
        metadata: {
          startedAt, endedAt, location,
          transcriptUrl, audioUrl, videoUrl,
        },
      }),
    });

    if (anchorRes.ok) {
      const anchorData = await anchorRes.json();
      arweaveTxId = anchorData.arweaveTxId;
    }
  } catch (err) {
    console.warn('Arweave anchoring failed:', err.message);
    // Anchoring failure is non-fatal — session is still saved
  }

  // Store session package in KV
  const fullPackage = { ...sessionPackage, arweaveTxId };
  await env.SESSIONS_KV.put(
    `session:${sessionId}`,
    JSON.stringify(fullPackage),
    { expirationTtl: 60 * 60 * 24 * 365 * 7 } // 7 years
  );

  // Also ingest into ClawQL memory vault for the device owner
  try {
    await fetch(`${env.CLAWQL_GATEWAY_URL}/memory/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.CLAWQL_API_KEY}`,
      },
      body: JSON.stringify({
        content: `# Witness Recording — ${new Date(startedAt).toLocaleString()}
Session: ${sessionId}
Device: ${deviceId}
Duration: ${Math.floor(fullPackage.durationMs / 1000)}s
Location: ${location ? `${location.latitude}, ${location.longitude}` : 'not captured'}
Merkle root: ${merkleRoot}
Arweave TX: ${arweaveTxId || 'pending'}
Artifacts: transcript=${transcriptUrl ? 'secured' : 'local'} audio=${audioUrl ? 'secured' : 'local'} video=${videoUrl ? 'secured' : 'local'}`,
        metadata: {
          deviceId,
          sessionId,
          tool:      'witness',
          tags:      ['witness', `device:${deviceId}`],
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch {}

  return json({ arweaveTxId, sessionId, sessionPackage: fullPackage });
}

// ─── Session retrieval ────────────────────────────────────────────────────────

async function handleSession(request, env, sessionId) {
  const raw = await env.SESSIONS_KV.get(`session:${sessionId}`);
  if (!raw) return json({ error: 'Session not found' }, 404);

  const session = JSON.parse(raw);

  // Basic device auth — verify request comes from the recording device
  const deviceId = request.headers.get('X-Device-Id');
  if (deviceId && session.deviceId !== deviceId) {
    return json({ error: 'Forbidden' }, 403);
  }

  return json({ session });
}

// ─── Public verification ──────────────────────────────────────────────────────
// No auth required — designed for use by attorneys, courts, and journalists

async function handleVerify(request, env, sessionId) {
  const raw = await env.SESSIONS_KV.get(`session:${sessionId}`);
  if (!raw) return json({ error: 'Session not found' }, 404);

  const session = JSON.parse(raw);

  // Return only the verification-relevant fields — not artifact URLs
  // which may contain sensitive footage
  const verificationRecord = {
    sessionId:       session.sessionId,
    startedAt:       session.startedAt,
    endedAt:         session.endedAt,
    durationMs:      session.durationMs,
    location:        session.location,
    transcriptHash:  session.transcriptHash,
    audioHash:       session.audioHash,
    videoHash:       session.videoHash,
    merkleRoot:      session.merkleRoot,
    deviceSignature: session.deviceSignature,
    arweaveTxId:     session.arweaveTxId,
    anchoredAt:      session.anchoredAt,
    // Verification instructions
    verification: {
      instructions: [
        '1. Retrieve the Arweave transaction using the arweaveTxId at https://arweave.net/{arweaveTxId}',
        '2. Confirm the merkleRoot in the Arweave transaction matches the merkleRoot in this record',
        '3. Obtain the transcript, audio, and video files from the recording party',
        '4. Hash each file using SHA-256',
        '5. Confirm the hashes match transcriptHash, audioHash, and videoHash in this record',
        '6. Confirm the merkleRoot matches SHA-256 of {transcriptHash}:{audioHash}:{videoHash}',
        'If all six steps pass, the recording is cryptographically verified as unaltered since capture',
      ],
      arweaveUrl: session.arweaveTxId
        ? `https://arweave.net/${session.arweaveTxId}`
        : null,
    },
  };

  return json(verificationRecord);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
