import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import validator from 'validator';
import { z } from 'zod';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Wallet helpers (wallet_id === profiles.player_id) ---
async function getPlayerIdForUserId(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.player_id || null;
}

async function getUserIdForPlayerId(playerId) {
  if (!playerId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function ensureWallet(playerId, userId = null) {
  if (!playerId) return null;
  const { data, error } = await supabase.rpc('ensure_wallet', {
    p_wallet_id: playerId,
    p_user_id: userId
  });
  if (error) throw error;
  return data;
}

async function getWallet(playerId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('wallet_id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function ensureMembership(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.rpc('ensure_membership', { p_user_id: userId });
  if (error) throw error;
  return data;
}

async function getMembership(userId) {
  const { data, error } = await supabase
    .from('player_memberships')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function parseAmount(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^\d.]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

// --- Express Setup ---
const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());

// Global Rate Limiting
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalApiLimiter);

// Simple In-Memory Cache
const cacheMap = new Map();
function apiCache(durationSec = 60) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const cached = cacheMap.get(key);
    if (cached && cached.exp > Date.now()) {
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheMap.set(key, { data: body, exp: Date.now() + durationSec * 1000 });
      }
      return originalJson(body);
    };
    next();
  };
}

// Security headers (OWASP aligned)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https:", "'unsafe-inline'"],

      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'http:'],
      frameSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'no-referrer' }
}));

app.use(cookieParser());
app.use(bodyParser.json({ limit: '1mb' }));


app.use(express.static(path.join(__dirname, 'public')));

// Lightweight API request logger for admin log panel.

// ---- Security helpers (shared) ----
function sanitizeText(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // control chars
    .replace(/<\/?[^>]+(>|$)/g, '') // strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();
}

function safeError(res, statusCode, message) {
  return res.status(statusCode).json({ error: message });
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.ip;
}

async function requireAdminRole(req, res, next, allowedRoles = ['admin', 'super_admin', 'partner_manager']) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return safeError(res, 401, 'Unauthorized');

    const jwtSecret = process.env.ADMIN_JWT_SECRET;
    if (!jwtSecret) {
      console.error('Missing ADMIN_JWT_SECRET');
      return safeError(res, 500, 'Server configuration error');
    }

    const payload = jwt.verify(token, jwtSecret);
    const userUuid = payload?.sub;
    if (!userUuid) return safeError(res, 401, 'Unauthorized');

    const { data: adminRow, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_uuid', userUuid)
      .maybeSingle();

    if (error) {
      console.error('RBAC lookup failed:', error);
      return safeError(res, 500, 'Failed to authorize');
    }

    const role = adminRow?.role;
    if (!role || !allowedRoles.includes(role)) {
      return safeError(res, 403, 'Forbidden');
    }

    req.admin = { user_uuid: userUuid, role };
    return next();
  } catch (e) {
    return safeError(res, 401, 'Unauthorized');
  }
}

// CSRF (double-submit)
// - Backend sets csrf_token cookie
// - Client must echo token in `X-CSRF-Token` header
function generateCsrfToken() {
  // 32 bytes => base64 token
  const buf = Buffer.alloc(32);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf.toString('base64url');
}

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  res.cookie('csrf_token', token, {
    httpOnly: false, // double-submit
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60 * 1000
  });
  return res.json({ csrfToken: token });
});

function requireCsrf(req, res, next) {
  // Only enforce for state-changing endpoints
  const cookieToken = req.cookies?.csrf_token;
  const headerToken = (req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || '').toString();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return safeError(res, 403, 'CSRF validation failed');
  }
  return next();
}

// Rate limiting
const partnerSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour

  limit: 10, // will refine per requirements
  standardHeaders: true,
  legacyHeaders: false
});

const streamChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const streamEngagementLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
});

const ALLOWED_CHAT_EMOJIS = new Set(['🔥', '👍', '❤️', '😂', '👏', '🎉']);
const VIEWER_ACTIVE_SECONDS = 90;

function isValidVisitorId(id) {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  return trimmed.length >= 8 && trimmed.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function requireSimpleAdmin(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD;
  const key = (req.headers['x-admin-key'] || '').toString();
  if (!adminPass || !key) return safeError(res, 403, 'Forbidden');

  const a = Buffer.from(key);
  const b = Buffer.from(adminPass);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return safeError(res, 403, 'Forbidden');
  }
  return next();
}

async function refreshStreamViewerCount(streamId) {
  const cutoff = new Date(Date.now() - VIEWER_ACTIVE_SECONDS * 1000).toISOString();
  const { count, error: countErr } = await supabase
    .from('stream_viewers')
    .select('*', { count: 'exact', head: true })
    .eq('stream_id', streamId)
    .gte('last_seen_at', cutoff);

  if (countErr) throw countErr;

  const viewerCount = count || 0;
  const { error: updateErr } = await supabase
    .from('streams')
    .update({ viewer_count: viewerCount })
    .eq('id', streamId);

  if (updateErr) throw updateErr;
  return viewerCount;
}

async function aggregateReactions(messageIds) {
  if (!messageIds.length) return {};
  const { data, error } = await supabase
    .from('stream_chat_reactions')
    .select('message_id, emoji')
    .in('message_id', messageIds);

  if (error) throw error;

  const grouped = {};
  for (const row of data || []) {
    if (!grouped[row.message_id]) grouped[row.message_id] = {};
    grouped[row.message_id][row.emoji] = (grouped[row.message_id][row.emoji] || 0) + 1;
  }

  const result = {};
  for (const [messageId, emojis] of Object.entries(grouped)) {
    result[messageId] = Object.entries(emojis).map(([emoji, count]) => ({ emoji, count }));
  }
  return result;
}

function mapChatMessage(row, reactions = []) {
  return {
    id: row.id,
    username: row.username,
    text: row.message_text,
    timestamp: new Date(row.created_at).getTime(),
    isSystem: row.is_system,
    reactions
  };
}




app.use((req, res, next) => {
  // Basic suspicious activity logging (brute-force / probing helpers)
  // This is intentionally lightweight; detailed monitoring can be extended later.
  const ip = getClientIp(req);
  if (req.path.startsWith('/api') && (req.method === 'POST' || req.method === 'PUT')) {
    const ua = (req.headers['user-agent'] || '').toString();
    if (ua.length > 300) {
      console.warn('Suspicious UA length', { ip, path: req.path, uaLen: ua.length });
    }
  }

  if (!req.path.startsWith('/api') || req.path === '/api/logs') {
    return next();
  }


  res.on('finish', async () => {
    try {
      await supabase.from('logs').insert([{
        method: req.method,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  });

  next();
});

// --- API Endpoints ---

// Create purchase request (recharge or membership)
app.post('/api/purchase-request', async (req, res) => {
  const {
    user_id,
    user_email,
    user_name,
    type,
    amount,
    package_amount,
    bonus_amount,
    cost,
    tier,
    duration_days,
    description,
    whatsapp_number,
    payment_method,
    payment_account_number,
    payment_account_owner,
    players_id
  } = req.body;
  if (!user_id || !type || !amount) return res.status(400).json({ error: 'Missing fields' });

  try {
    const method = (payment_method || '').toString().trim().toLowerCase();
    const allowedMethods = ['esewa', 'khalti', 'bank'];

    // Require contact/payment details for all purchase requests
    if (!whatsapp_number || !payment_account_number || !payment_account_owner) {
      return res.status(400).json({ error: 'WhatsApp number, account number and owner name are required.' });
    }
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: 'Valid payment_method is required (esewa/khalti/bank).' });
    }

    const payload = {
      user_id,
      user_email,
      user_name,
      type,
      amount,
      package_amount: package_amount || null,
      bonus_amount: bonus_amount || null,
      cost: cost || null,
      tier: tier || null,
      duration_days: duration_days || null,
      description: description || null,
      whatsapp_number: whatsapp_number || null,
      payment_method: method,
      payment_account_number: payment_account_number || null,
      payment_account_owner: payment_account_owner || null,
      players_id: players_id || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('purchase_requests').insert([payload]);
    if (error) {
      console.error('Failed to insert purchase_request:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    res.status(500).json({ error: 'Failed to create purchase request' });
  }
});

// Get purchase requests (admin)
app.get('/api/purchase-requests', async (req, res) => {
  const status = req.query.status || null;
  try {
    let q = supabase.from('purchase_requests').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// Approve request - admin action: adds balance or membership
app.put('/api/purchase-requests/:id/approve', async (req, res) => {
  const id = req.params.id;
  const { admin_notes } = req.body;
  try {
    // Fetch the purchase request
    const { data: reqData, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !reqData) return res.status(404).json({ error: 'Request not found' });

    const userId = reqData.user_id;
    const playerId = await getPlayerIdForUserId(userId).catch(() => null);

    if (reqData.type === 'recharge') {
      if (!playerId) return res.status(400).json({ error: 'Player profile missing player_id (wallet id).' });

      await ensureWallet(playerId, userId);

      const idempotencyKey = `purchase_request:${id}:recharge`;
      const { data: txId, error: rpcErr } = await supabase.rpc('wallet_recharge', {
        p_wallet_id: playerId,
        p_amount: reqData.amount || 0,
        p_idempotency_key: idempotencyKey,
        p_reference_id: String(id),
        p_description: `Admin approved recharge #${id}`,
        p_actor_user_id: userId
      });
      if (rpcErr) throw rpcErr;

    } else if (reqData.type === 'membership') {
      await ensureMembership(userId);

      const durationDays = parseInt(reqData.duration_days) || 30;
      const { data: membershipRow, error: memErr } = await supabase.rpc('admin_set_membership', {
        p_user_id: userId,
        p_membership_tier: reqData.tier || 'none',
        p_duration_days: durationDays
      });
      if (memErr) throw memErr;

      // Best-effort: track total_spent for membership cash purchase
      if ((reqData.amount || 0) > 0) {
        await supabase
          .from('player_memberships')
          .update({ total_spent: (Number(membershipRow?.total_spent || 0) + Number(reqData.amount || 0)) })
          .eq('user_id', userId);
      }
    }

    // Mark the request as approved
    const { error: updErr } = await supabase
      .from('purchase_requests')
      .update({ status: 'approved', admin_notes: admin_notes || null })
      .eq('id', id);
    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message || 'Failed to approve request' });
  }
});

// Decline request
app.put('/api/purchase-requests/:id/decline', async (req, res) => {
  const id = req.params.id;
  const { admin_notes } = req.body;
  try {
    const { error } = await supabase.from('purchase_requests').update({ status: 'declined', admin_notes }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    console.error('Error declining request:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});


// Get all tournaments
app.get('/api/tournaments', apiCache(60), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*');

    if (error) {
      console.error('Error fetching tournaments:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', apiCache(60), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get streams
app.get('/api/streams', apiCache(60), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*');

    if (error) {
      console.error('Error fetching streams:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// ================================================================
// STREAM ENGAGEMENT (likes, shares, viewers, live chat)
// ================================================================

app.get('/api/streams/:id/engagement', streamEngagementLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = (req.query.visitorId || '').toString();

    const { data: stream, error } = await supabase
      .from('streams')
      .select('id, like_count, share_count, viewer_count')
      .eq('id', id)
      .maybeSingle();

    if (error) return safeError(res, 500, 'Failed to fetch engagement');
    if (!stream) return safeError(res, 404, 'Stream not found');

    let hasLiked = false;
    if (isValidVisitorId(visitorId)) {
      const { data: likeRow } = await supabase
        .from('stream_likes')
        .select('id')
        .eq('stream_id', id)
        .eq('visitor_id', visitorId)
        .maybeSingle();
      hasLiked = !!likeRow;
    }

    res.json({
      likeCount: Number(stream.like_count) || 0,
      shareCount: Number(stream.share_count) || 0,
      viewerCount: Number(stream.viewer_count) || 0,
      hasLiked
    });
  } catch (error) {
    console.error('Error fetching stream engagement:', error);
    safeError(res, 500, 'Failed to fetch engagement');
  }
});

app.post('/api/streams/:id/like', streamEngagementLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = (req.body?.visitorId || '').toString().trim();
    const userId = req.body?.userId || null;

    if (!isValidVisitorId(visitorId)) {
      return safeError(res, 400, 'Invalid visitor id');
    }

    const { data: stream } = await supabase.from('streams').select('id').eq('id', id).maybeSingle();
    if (!stream) return safeError(res, 404, 'Stream not found');

    const { data: existing } = await supabase
      .from('stream_likes')
      .select('id')
      .eq('stream_id', id)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existing) {
      const { error: delErr } = await supabase.from('stream_likes').delete().eq('id', existing.id);
      if (delErr) return safeError(res, 500, 'Failed to update like');
    } else {
      const { error: insErr } = await supabase.from('stream_likes').insert([{
        stream_id: id,
        visitor_id: visitorId,
        user_id: userId
      }]);
      if (insErr) return safeError(res, 500, 'Failed to like stream');
    }

    const { data: updated } = await supabase
      .from('streams')
      .select('like_count')
      .eq('id', id)
      .maybeSingle();

    res.json({
      likeCount: Number(updated?.like_count) || 0,
      hasLiked: !existing
    });
  } catch (error) {
    console.error('Error liking stream:', error);
    safeError(res, 500, 'Failed to like stream');
  }
});

app.post('/api/streams/:id/share', streamEngagementLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = (req.body?.visitorId || '').toString().trim();
    const method = sanitizeText(req.body?.method || 'link').slice(0, 32) || 'link';

    if (!isValidVisitorId(visitorId)) {
      return safeError(res, 400, 'Invalid visitor id');
    }

    const { data: stream } = await supabase.from('streams').select('id').eq('id', id).maybeSingle();
    if (!stream) return safeError(res, 404, 'Stream not found');

    const { error: insErr } = await supabase.from('stream_shares').insert([{
      stream_id: id,
      visitor_id: visitorId,
      share_method: method
    }]);
    if (insErr) return safeError(res, 500, 'Failed to record share');

    const { data: updated } = await supabase
      .from('streams')
      .select('share_count')
      .eq('id', id)
      .maybeSingle();

    res.json({ shareCount: Number(updated?.share_count) || 0 });
  } catch (error) {
    console.error('Error recording share:', error);
    safeError(res, 500, 'Failed to record share');
  }
});

app.post('/api/streams/:id/viewers/heartbeat', streamEngagementLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = (req.body?.visitorId || '').toString().trim();

    if (!isValidVisitorId(visitorId)) {
      return safeError(res, 400, 'Invalid visitor id');
    }

    const { data: stream } = await supabase.from('streams').select('id').eq('id', id).maybeSingle();
    if (!stream) return safeError(res, 404, 'Stream not found');

    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase
      .from('stream_viewers')
      .upsert([{ stream_id: id, visitor_id: visitorId, last_seen_at: now }], {
        onConflict: 'stream_id,visitor_id'
      });

    if (upsertErr) return safeError(res, 500, 'Failed to update viewer');

    const viewerCount = await refreshStreamViewerCount(id);
    res.json({ viewerCount });
  } catch (error) {
    console.error('Error updating viewer heartbeat:', error);
    safeError(res, 500, 'Failed to update viewer');
  }
});

app.get('/api/streams/:id/chat', streamEngagementLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const since = req.query.since ? new Date(req.query.since).toISOString() : null;

    let rows;
    if (since && !Number.isNaN(new Date(since).getTime())) {
      const { data, error } = await supabase
        .from('stream_chat_messages')
        .select('id, stream_id, visitor_id, user_id, username, message_text, is_system, created_at')
        .eq('stream_id', id)
        .eq('is_deleted', false)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) return safeError(res, 500, 'Failed to fetch chat');
      rows = data || [];
    } else {
      const { data, error } = await supabase
        .from('stream_chat_messages')
        .select('id, stream_id, visitor_id, user_id, username, message_text, is_system, created_at')
        .eq('stream_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return safeError(res, 500, 'Failed to fetch chat');
      rows = (data || []).reverse();
    }

    const messageIds = rows.map(r => r.id);
    const reactionMap = await aggregateReactions(messageIds);
    const messages = rows.map(row => mapChatMessage(row, reactionMap[row.id] || []));

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat:', error);
    safeError(res, 500, 'Failed to fetch chat');
  }
});

app.post('/api/streams/:id/chat', streamChatLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = (req.body?.visitorId || '').toString().trim();
    const userId = req.body?.userId || null;
    const username = sanitizeText(req.body?.username || '').slice(0, 32);
    const text = sanitizeText(req.body?.text || '').slice(0, 500);

    if (!isValidVisitorId(visitorId)) return safeError(res, 400, 'Invalid visitor id');
    if (!username) return safeError(res, 400, 'Username required');
    if (!text) return safeError(res, 400, 'Message required');

    const { data: stream } = await supabase.from('streams').select('id').eq('id', id).maybeSingle();
    if (!stream) return safeError(res, 404, 'Stream not found');

    const { data: inserted, error } = await supabase
      .from('stream_chat_messages')
      .insert([{
        stream_id: id,
        visitor_id: visitorId,
        user_id: userId,
        username,
        message_text: text,
        is_system: false
      }])
      .select('id, stream_id, visitor_id, user_id, username, message_text, is_system, created_at')
      .single();

    if (error) return safeError(res, 500, 'Failed to send message');

    res.status(201).json({ message: mapChatMessage(inserted, []) });
  } catch (error) {
    console.error('Error sending chat message:', error);
    safeError(res, 500, 'Failed to send message');
  }
});

app.post('/api/streams/:id/chat/:messageId/reactions', streamEngagementLimiter, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const visitorId = (req.body?.visitorId || '').toString().trim();
    const emoji = (req.body?.emoji || '').toString();

    if (!isValidVisitorId(visitorId)) return safeError(res, 400, 'Invalid visitor id');
    if (!ALLOWED_CHAT_EMOJIS.has(emoji)) return safeError(res, 400, 'Invalid emoji');

    const { data: message } = await supabase
      .from('stream_chat_messages')
      .select('id')
      .eq('id', messageId)
      .eq('stream_id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!message) return safeError(res, 404, 'Message not found');

    const { data: existing } = await supabase
      .from('stream_chat_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('visitor_id', visitorId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('stream_chat_reactions').delete().eq('id', existing.id);
    } else {
      const { error: insErr } = await supabase.from('stream_chat_reactions').insert([{
        message_id: messageId,
        visitor_id: visitorId,
        emoji
      }]);
      if (insErr) return safeError(res, 500, 'Failed to add reaction');
    }

    const reactionMap = await aggregateReactions([messageId]);
    res.json({ reactions: reactionMap[messageId] || [] });
  } catch (error) {
    console.error('Error updating reaction:', error);
    safeError(res, 500, 'Failed to update reaction');
  }
});

app.delete('/api/streams/:id/chat/:messageId', requireSimpleAdmin, async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const { error } = await supabase
      .from('stream_chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('stream_id', id);

    if (error) return safeError(res, 500, 'Failed to delete message');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    safeError(res, 500, 'Failed to delete message');
  }
});

app.delete('/api/streams/:id/chat', requireSimpleAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('stream_chat_messages')
      .update({ is_deleted: true })
      .eq('stream_id', id)
      .eq('is_deleted', false);

    if (error) return safeError(res, 500, 'Failed to clear chat');

    await supabase.from('stream_chat_messages').insert([{
      stream_id: id,
      username: 'SYSTEM',
      message_text: 'Matrix cleared by administrator.',
      is_system: true
    }]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat:', error);
    safeError(res, 500, 'Failed to clear chat');
  }
});

// ================================================================
// TEAM REGISTRATION ENDPOINTS
// ================================================================

// Register a team for tournament
// --- Scalable Registration Queue System ---
const registrationQueue = [];
const registrationStatus = new Map();

// Abuse prevention specifically for registration
const registrationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5, // 5 registrations per IP max
  message: { error: 'Too many registration requests. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

async function processRegistrationQueue() {
  if (registrationQueue.length === 0) {
    setTimeout(processRegistrationQueue, 1000);
    return;
  }
  
  const task = registrationQueue.shift();
  registrationStatus.set(task.ticket_id, { status: 'processing' });
  
  try {
    const {
      tournament_id, team_name, team_tag, team_logo,
      manager_name, manager_contact, registrar_email, players
    } = task.payload;

    const parseDateAtStartOfDay = (dateValue) => {
      if (!dateValue) return null;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return null;
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    };
    const parseDateAtEndOfDay = (dateValue) => {
      if (!dateValue) return null;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return null;
      parsed.setHours(23, 59, 59, 999);
      return parsed;
    };

    const { data: tournament, error: tourneyErr } = await supabase
      .from('tournaments')
      .select('id, title, entry_fee, registration_start_date, registration_end_date, login_required, payment_method, team_size, max_slots')
      .eq('id', tournament_id)
      .single();

    if (tourneyErr || !tournament) throw new Error('Tournament not found');

    // Slot validation
    const { count: currentRegs, error: countErr } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);
    
    if (countErr) throw new Error('Database count error');
    
    const max_slots = Number(tournament.max_slots) || 48;
    if (currentRegs >= max_slots) throw new Error('Tournament slots are full');

    const requiredTeamSize = tournament.team_size || (tournament.title.toLowerCase().includes('pubg') ? 5 : tournament.title.toLowerCase().includes('free fire') ? 4 : 1);
    if (!Array.isArray(players) || players.length !== requiredTeamSize) {
      throw new Error(`This tournament strictly requires exactly ${requiredTeamSize} players.`);
    }

    const now = new Date();
    const registrationStart = parseDateAtStartOfDay(tournament.registration_start_date);
    const registrationEnd = parseDateAtEndOfDay(tournament.registration_end_date);
    if (registrationStart && now < registrationStart) throw new Error(`Registration opens on ${tournament.registration_start_date}.`);
    if (registrationEnd && now > registrationEnd) throw new Error('Registration has ended.');

    const registrationId = crypto.randomUUID();
    const nowISO = new Date().toISOString();

    const { data: teamReg, error: teamRegErr } = await supabase
      .from('registrations')
      .insert([{
        id: registrationId,
        tournamentid: String(tournament_id),
        tournamenttitle: tournament.title || 'NA',
        registrationdate: nowISO,
        tournament_id: String(tournament_id),
        team_name, team_tag, team_logo: team_logo || null,
        manager_name, manager_contact, registrar_email,
        total_players: players.length,
        payment_method: tournament.payment_method || 'tgc_coin',
        payment_status: 'pending',
        registration_status: 'pending',
        created_at: nowISO, updated_at: nowISO
      }])
      .select().single();

    if (teamRegErr) throw new Error('Failed to create team registration');

    const playerRecords = players.map(p => ({
      team_registration_id: teamReg.id,
      player_name: p.player_name,
      player_uid: p.player_uid,
      player_citizenship_photo: p.player_citizenship_photo
    }));

    const { error: playersErr } = await supabase.from('team_players').insert(playerRecords);
    if (playersErr) {
      await supabase.from('registrations').delete().eq('id', teamReg.id);
      throw new Error('Failed to register players');
    }

    registrationStatus.set(task.ticket_id, { 
      status: 'success', 
      registration_id: teamReg.id,
      message: 'Registration successful'
    });
  } catch (error) {
    registrationStatus.set(task.ticket_id, { 
      status: 'failed', 
      error: error.message || 'Registration failed' 
    });
  }
  
  // Continue processing next in queue
  setTimeout(processRegistrationQueue, 100);
}
// Start worker
processRegistrationQueue();

app.post('/api/team-register', registrationLimiter, async (req, res) => {
  try {
    const { tournament_id, team_name, team_tag, manager_name, manager_contact, registrar_email, players } = req.body;

    if (!tournament_id || !team_name || !team_tag || !manager_name || !manager_contact || !registrar_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    for (const player of players) {
      if (!player.player_name || !player.player_uid || !player.player_citizenship_photo) {
        return res.status(400).json({ error: 'All player fields are required (name, UID, photo)' });
      }
    }

    const ticket_id = crypto.randomUUID();
    registrationStatus.set(ticket_id, { status: 'queued' });
    
    registrationQueue.push({
      ticket_id,
      payload: req.body
    });

    res.json({ ticket_id, status: 'queued', message: 'Registration request received and queued.' });
  } catch (error) {
    console.error('Error in registration queuing:', error);
    res.status(500).json({ error: 'Failed to queue registration' });
  }
});

app.get('/api/registration-status/:ticket_id', async (req, res) => {
  const { ticket_id } = req.params;
  const statusInfo = registrationStatus.get(ticket_id);
  
  if (!statusInfo) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  res.json(statusInfo);
});

// Get registrations for a tournament
app.get('/api/team-registrations/:tournament_id', async (req, res) => {
  try {
    const { tournament_id } = req.params;

    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('tournament_id', tournament_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get registration with all player details
app.get('/api/team-registration/:id/players', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teamData, error: teamErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (teamErr || !teamData) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const { data: playersData, error: playersErr } = await supabase
      .from('team_players')
      .select('*')
      .eq('team_registration_id', id)
      .order('created_at', { ascending: true });

    if (playersErr) {
      console.error('Error fetching players:', playersErr);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json({
      team: teamData,
      players: playersData || []
    });

  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// Admin: Get all registrations (with filters)
app.get('/api/admin/team-registrations', async (req, res) => {
  try {
    const { tournament_id, status } = req.query;

    let query = supabase
      .from('registrations')
      .select('*');

    if (tournament_id) {
      query = query.eq('tournament_id', tournament_id);
    }

    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Admin: Update registration status
app.put('/api/admin/team-registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, notes } = req.body;

    const { data, error } = await supabase
      .from('registrations')
      .update({
        payment_status: payment_status || undefined,
        notes: notes || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team registration:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating team registration:', error);
    res.status(500).json({ error: 'Failed to update team registration' });
  }
});

// ================================================================
// END REGISTRATION ENDPOINTS
// ================================================================

// Get logs (admin only) - using Supabase
app.get('/api/logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Admin login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: 'admin-token-' + Date.now(),
      user: { name: 'Admin', role: 'admin' } 
    });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Admin: Update tournaments (bulk)
app.post('/api/admin/tournaments', async (req, res) => {
  try {
    const tournaments = req.body;

    // Clear existing and insert new
    const { error: deleteError } = await supabase
      .from('tournaments')
      .delete()
      .neq('id', ''); // Delete all

    if (deleteError) {
      console.error('Error clearing tournaments:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    if (tournaments.length > 0) {
      const { error: insertError } = await supabase
        .from('tournaments')
        .insert(tournaments);

      if (insertError) {
        console.error('Error inserting tournaments:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
    }

    res.json({ success: true, message: 'Tournaments updated' });
  } catch (error) {
    console.error('Error updating tournaments:', error);
    res.status(500).json({ error: 'Failed to update tournaments' });
  }
});

// Admin: Update leaderboard (bulk)
app.post('/api/admin/leaderboard', async (req, res) => {
  try {
    const leaderboard = req.body;
    // Clear existing and insert new
    const { error: deleteError } = await supabase
      .from('leaderboard')
      .delete()
      .neq('id', ''); // Delete all

    if (deleteError) {
      console.error('Error clearing leaderboard:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    if (leaderboard.length > 0) {
      const { error: insertError } = await supabase
        .from('leaderboard')
        .insert(leaderboard);

      if (insertError) {
        console.error('Error inserting leaderboard:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
    }

    res.json({ success: true, message: 'Leaderboard updated' });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

// Admin: Update streams (bulk)
app.post('/api/admin/streams', async (req, res) => {
  try {
    const streams = req.body;

    // Clear existing and insert new
    const { error: deleteError } = await supabase
      .from('streams')
      .delete()
      .neq('id', ''); // Delete all

    if (deleteError) {
      console.error('Error clearing streams:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    if (streams.length > 0) {
      const { error: insertError } = await supabase
        .from('streams')
        .insert(streams);

      if (insertError) {
        console.error('Error inserting streams:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
    }

    res.json({ success: true, message: 'Streams updated' });
  } catch (error) {
    console.error('Error updating streams:', error);
    res.status(500).json({ error: 'Failed to update streams' });
  }
});

// Admin: Restore database
app.post('/api/admin/restore', async (req, res) => {
  try {
    const { tournaments, leaderboard, streams, registrations } = req.body;

    // Restore tournaments
    if (tournaments) {
      const { error: deleteTournaments } = await supabase
        .from('tournaments')
        .delete()
        .neq('id', '');

      if (deleteTournaments) {
        console.error('Error clearing tournaments:', deleteTournaments);
        return res.status(500).json({ error: deleteTournaments.message });
      }

      if (tournaments.length > 0) {
        const { error: insertTournaments } = await supabase
          .from('tournaments')
          .insert(tournaments);

        if (insertTournaments) {
          console.error('Error inserting tournaments:', insertTournaments);
          return res.status(500).json({ error: insertTournaments.message });
        }
      }
    }

    // Restore leaderboard
    if (leaderboard) {
      const { error: deleteLeaderboard } = await supabase
        .from('leaderboard')
        .delete()
        .neq('id', '');

      if (deleteLeaderboard) {
        console.error('Error clearing leaderboard:', deleteLeaderboard);
        return res.status(500).json({ error: deleteLeaderboard.message });
      }

      if (leaderboard.length > 0) {
        const { error: insertLeaderboard } = await supabase
          .from('leaderboard')
          .insert(leaderboard);

        if (insertLeaderboard) {
          console.error('Error inserting leaderboard:', insertLeaderboard);
          return res.status(500).json({ error: insertLeaderboard.message });
        }
      }
    }

    // Restore streams
    if (streams) {
      const { error: deleteStreams } = await supabase
        .from('streams')
        .delete()
        .neq('id', '');

      if (deleteStreams) {
        console.error('Error clearing streams:', deleteStreams);
        return res.status(500).json({ error: deleteStreams.message });
      }

      if (streams.length > 0) {
        const { error: insertStreams } = await supabase
          .from('streams')
          .insert(streams);

        if (insertStreams) {
          console.error('Error inserting streams:', insertStreams);
          return res.status(500).json({ error: insertStreams.message });
        }
      }
    }

    // Restore registrations
    if (registrations) {
      const { error: deleteRegistrations } = await supabase
        .from('registrations')
        .delete()
        .neq('id', '');

      if (deleteRegistrations) {
        console.error('Error clearing registrations:', deleteRegistrations);
        return res.status(500).json({ error: deleteRegistrations.message });
      }

      if (registrations.length > 0) {
        const { error: insertRegistrations } = await supabase
          .from('registrations')
          .insert(registrations);

        if (insertRegistrations) {
          console.error('Error inserting registrations:', insertRegistrations);
          return res.status(500).json({ error: insertRegistrations.message });
        }
      }
    }

    res.json({ success: true, message: 'Database restored' });
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

// --- Individual CRUD Operations for Admin Panel ---

// Tournaments CRUD
app.post('/api/admin/tournaments/add', async (req, res) => {
  try {
    const newTournament = req.body;
    if (!newTournament.id) newTournament.id = Date.now().toString();

    const { data, error } = await supabase
      .from('tournaments')
      .insert([newTournament])
      .select();

    if (error) {
      console.error('Error adding tournament:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Tournament added', data: data[0] });
  } catch (error) {
    console.error('Error adding tournament:', error);
    res.status(500).json({ error: 'Failed to add tournament' });
  }
});

app.put('/api/admin/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTournament = req.body;

    const { data, error } = await supabase
      .from('tournaments')
      .update(updatedTournament)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating tournament:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({ success: true, message: 'Tournament updated', data: data[0] });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

app.delete('/api/admin/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tournament:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Tournament deleted' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Leaderboard CRUD
app.post('/api/admin/leaderboard/add', async (req, res) => {
  try {
    const newEntry = req.body;
    if (!newEntry.id) newEntry.id = Date.now().toString();

    // Calculate rank based on points
    const { data: allEntries, error: fetchError } = await supabase
      .from('leaderboard')
      .select('points')
      .eq('game', newEntry.game)
      .order('points', { ascending: false });

    if (fetchError) {
      console.error('Error fetching leaderboard for rank calculation:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Calculate rank (1-based index)
    const rank = allEntries.filter(entry => entry.points > newEntry.points).length + 1;
    newEntry.rank = rank;

    const { data, error } = await supabase
      .from('leaderboard')
      .insert([newEntry])
      .select();

    if (error) {
      console.error('Error adding leaderboard entry:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Leaderboard entry added', data: data[0] });
  } catch (error) {
    console.error('Error adding leaderboard entry:', error);
    res.status(500).json({ error: 'Failed to add leaderboard entry' });
  }
});

app.put('/api/admin/leaderboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = req.body;

    const { data, error } = await supabase
      .from('leaderboard')
      .update(updatedEntry)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating leaderboard entry:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Leaderboard entry not found' });
    }

    res.json({ success: true, message: 'Leaderboard entry updated', data: data[0] });
  } catch (error) {
    console.error('Error updating leaderboard entry:', error);
    res.status(500).json({ error: 'Failed to update leaderboard entry' });
  }
});

app.delete('/api/admin/leaderboard/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('leaderboard')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting leaderboard entry:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Leaderboard entry deleted' });
  } catch (error) {
    console.error('Error deleting leaderboard entry:', error);
    res.status(500).json({ error: 'Failed to delete leaderboard entry' });
  }
});

// Admin: Update Player Balance
app.post('/api/admin/player/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newBalance, reason } = req.body;

    const playerId = await getPlayerIdForUserId(userId);
    if (!playerId) return res.status(400).json({ error: 'Player profile missing player_id (wallet id).' });

    await ensureWallet(playerId, userId);
    const wallet = await getWallet(playerId);

    const oldBalance = wallet?.available_balance || 0;
    const difference = (newBalance ?? 0) - oldBalance;
    if (difference === 0) return res.json({ success: true, data: { user_id: userId, balance: oldBalance } });

    const idempotencyKey = `admin_adjust:${userId}:${Date.now()}`;
    const { data: txId, error: rpcErr } = await supabase.rpc('wallet_admin_adjust', {
      p_wallet_id: playerId,
      p_amount_signed: difference,
      p_idempotency_key: idempotencyKey,
      p_reference_id: null,
      p_description: reason || 'Admin adjustment',
      p_actor_user_id: userId
    });
    if (rpcErr) throw rpcErr;

    const updatedWallet = await getWallet(playerId);

    res.json({ success: true, data: { user_id: userId, balance: updatedWallet?.available_balance || 0 } });
  } catch (error) {
    console.error('Error updating player balance:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Admin: update membership (new system)
app.post('/api/admin/player/:userId/membership', async (req, res) => {
  try {
    const { userId } = req.params;
    const { membershipTier, durationDays } = req.body;

    if (!membershipTier) return res.status(400).json({ error: 'Membership tier is required' });

    await ensureMembership(userId);
    const { data, error } = await supabase.rpc('admin_set_membership', {
      p_user_id: userId,
      p_membership_tier: membershipTier,
      p_duration_days: parseInt(durationDays) || 30
    });
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating player membership:', error);
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

// Admin: list wallets + profiles + memberships (replaces /api/admin/balances)
app.get('/api/admin/wallets', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const { data: wallets, error: wErr } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (wErr) return res.status(500).json({ error: wErr.message });

    const userIds = (wallets || []).map(w => w.user_id).filter(Boolean);
    const walletIds = (wallets || []).map(w => w.wallet_id).filter(Boolean);

    const [{ data: profiles, error: pErr }, { data: memberships, error: mErr }] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('*').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabase.from('player_memberships').select('*').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (pErr) return res.status(500).json({ error: pErr.message });
    if (mErr) return res.status(500).json({ error: mErr.message });

    const profById = new Map((profiles || []).map(p => [p.id, p]));
    const memById = new Map((memberships || []).map(m => [m.user_id, m]));

    const merged = (wallets || []).map(w => {
      const p = w.user_id ? profById.get(w.user_id) : null;
      const m = w.user_id ? memById.get(w.user_id) : null;
      return {
        user_id: w.user_id,
        wallet_id: w.wallet_id,
        available_balance: Number(w.available_balance || 0),
        locked_balance: Number(w.locked_balance || 0),
        status: w.status,
        created_at: w.created_at,
        profiles: p || null,
        membership_tier: m?.membership_tier || 'none',
        membership_expires_at: m?.membership_expires_at || null,
        total_spent: Number(m?.total_spent || 0)
      };
    });

    // If a user has a profile but no wallet row yet, admin can still find them via profile search elsewhere.
    // This endpoint is wallet-centric by design.

    res.json({ data: merged, wallet_ids: walletIds });
  } catch (error) {
    console.error('Error fetching admin wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Admin: wallet ledger by wallet_id
app.get('/api/admin/ledger/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    if (!walletId) return res.status(400).json({ error: 'walletId required' });

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or(`from_wallet_id.eq.${walletId},to_wallet_id.eq.${walletId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching admin ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// Wallet: player-to-player transfer (wallet_id === player_id)
app.post('/api/wallet/transfer', async (req, res) => {
  try {
    const { from_player_id, to_player_id, amount, request_id, description } = req.body || {};
    const fromId = (from_player_id || '').toString().trim();
    const toId = (to_player_id || '').toString().trim();
    const amt = Number(amount);

    if (!fromId || !toId) return res.status(400).json({ error: 'from_player_id and to_player_id are required' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    await ensureWallet(fromId, null);
    await ensureWallet(toId, null);

    const idempotencyKey = request_id ? `transfer:${request_id}` : `transfer:${fromId}:${toId}:${Date.now()}`;
    const { data: txId, error } = await supabase.rpc('wallet_transfer', {
      p_from_wallet_id: fromId,
      p_to_wallet_id: toId,
      p_amount: amt,
      p_idempotency_key: idempotencyKey,
      p_reference_id: null,
      p_description: description || 'Wallet transfer',
      p_actor_user_id: null
    });

    if (error) {
      const msg = (error.message || '').toLowerCase().includes('insufficient')
        ? 'Insufficient balance.'
        : error.message;
      return res.status(400).json({ error: msg });
    }

    res.json({ ok: true, tx_id: txId });
  } catch (error) {
    console.error('Error transferring balance:', error);
    res.status(500).json({ error: error.message || 'Transfer failed' });
  }
});

// Admin: Update Player Stats & Achievements
app.post('/api/admin/player/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileUpdates = req.body;

    const { data: currentProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('achievements')
      .eq('id', userId)
      .maybeSingle();

    // If there is an error fetching, the columns might not exist. 
    // We will still try to update to gracefully fail with a detailed error.

    let currentAchievements = currentProfile?.achievements || [];
    if (!Array.isArray(currentAchievements)) currentAchievements = [];

    const newAchievements = new Set(currentAchievements);
    const kills = parseInt(profileUpdates.total_kills) || 0;
    const combat = parseInt(profileUpdates.combat_score) || 0;
    const rank = (profileUpdates.rank || '').toString().toLowerCase();

    if (kills >= 10) newAchievements.add('FIRST_BLOOD');
    if (kills >= 50) newAchievements.add('ASSASSIN');
    if (kills >= 100) newAchievements.add('VETERAN');
    if (kills >= 500) newAchievements.add('TERMINATOR');
    if (combat >= 1000) newAchievements.add('GLADIATOR');
    if (combat >= 5000) newAchievements.add('WARLORD');
    if (['diamond', 'crown', 'ace', 'conqueror', 'master', 'grandmaster'].includes(rank)) {
      newAchievements.add('ELITE_RANK');
    }

    // Merge manual achievement overrides if provided
    if (Array.isArray(profileUpdates.achievements)) {
      profileUpdates.achievements.forEach(a => newAchievements.add(a));
    }

    profileUpdates.achievements = Array.from(newAchievements);

    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating stats (Supabase):', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data: data?.[0] });
  } catch (error) {
    console.error('Error updating player stats:', error);
    res.status(500).json({ error: 'Failed to update stats. Ensure the database migration was run.' });
  }
});

// Streams CRUD
app.post('/api/admin/streams/add', async (req, res) => {
  try {
    const newStream = req.body;
    if (!newStream.id) newStream.id = Date.now().toString();

    const { data, error } = await supabase
      .from('streams')
      .insert([newStream])
      .select();

    if (error) {
      console.error('Error adding stream:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Stream added', data: data[0] });
  } catch (error) {
    console.error('Error adding stream:', error);
    res.status(500).json({ error: 'Failed to add stream' });
  }
});

app.put('/api/admin/streams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStream = req.body;

    const { data, error } = await supabase
      .from('streams')
      .update(updatedStream)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating stream:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    res.json({ success: true, message: 'Stream updated', data: data[0] });
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

app.delete('/api/admin/streams/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting stream:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Stream deleted' });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: 'Failed to delete stream' });
  }
});

// Registrations CRUD
// NOTE: Team registration uses /api/team-register + /api/team-registrations/*.
// The client-side app also expects a generic /api/registrations list; we map that to team registrations
// (all team registrations, including players indirectly via /api/team-registration/:id/players).
app.get('/api/registrations', async (req, res) => {
  // New team registration UX expects a fresh UI. This endpoint returns team-level rows.
  // We map new schema columns to the legacy AdminPanel fields where possible.

  try {
    const { tournament_id, status } = req.query;

let query = supabase
      .from('registrations')
      .select('*, team_players(count)');

    // Admin “Teams” dossier needs legacy-ish fields so AdminPanel.jsx can render safely.
    // We hydrate dossier defaults here; the nested team-player records are fetched separately when needed.
    // NOTE: team_players row fields are available on /api/team-registration/:id/players.
    const normalizeTeamRow = (r) => ({
      ...r,
      // Legacy naming expected by AdminPanel
      tournamentid: r.tournament_id,
      tournamenttitle: r.tournament_title || '',
      teamname: r.team_name || r.team_tag || '',
      title: r.team_name || r.team_tag || '',
      team_tag: r.team_tag,
      // Player-level fields are not present in team-level list; AdminPanel will show nulls.
      playername: r.playername ?? null,
      gameuid: r.gameuid ?? null,
      playeremail: r.playeremail ?? r.registrar_email ?? null,
      playercontact: r.playercontact ?? r.manager_contact ?? null,
      registrationdate: r.created_at,
      sms_status: r.sms_status ?? null,
      SMS_Status: r.sms_status ?? null
    });

    if (tournament_id) query = query.eq('tournament_id', tournament_id);
    if (status) query = query.eq('payment_status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

app.post('/api/admin/registrations/add', async (req, res) => {
  try {
    const newRegistration = req.body;
    if (!newRegistration.id) newRegistration.id = Date.now().toString();

    const { data, error } = await supabase
      .from('registrations')
      .insert([newRegistration])
      .select();

    if (error) {
      console.error('Error adding registration:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Registration added', data: data[0] });
  } catch (error) {
    console.error('Error adding registration:', error);
    res.status(500).json({ error: 'Failed to add registration' });
  }
});

app.put('/api/admin/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRegistration = req.body;

    const { data, error } = await supabase
      .from('registrations')
      .update(updatedRegistration)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating registration:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({ success: true, message: 'Registration updated', data: data[0] });
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

app.delete('/api/admin/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting registration:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Registration deleted' });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// --- BALANCE & MEMBERSHIP API ROUTES ---

// Get player balance
app.get('/api/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const playerId = await getPlayerIdForUserId(userId).catch(() => null);
    const membership = await ensureMembership(userId);

    if (!playerId) {
      return res.json({
        user_id: userId,
        balance: 0,
        membership_tier: membership?.membership_tier || 'none',
        membership_expires_at: membership?.membership_expires_at || null,
        total_spent: membership?.total_spent || 0,
        created_at: membership?.created_at || new Date().toISOString()
      });
    }

    await ensureWallet(playerId, userId);
    const wallet = await getWallet(playerId);

    return res.json({
      user_id: userId,
      balance: wallet?.available_balance ?? 0,
      locked_balance: wallet?.locked_balance ?? 0,
      membership_tier: membership?.membership_tier || 'none',
      membership_expires_at: membership?.membership_expires_at || null,
      total_spent: membership?.total_spent || 0,
      created_at: membership?.created_at || new Date().toISOString(),
      wallet_id: playerId
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Add balance (recharge)
app.post('/api/balance/add/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const playerId = await getPlayerIdForUserId(userId);
    if (!playerId) return res.status(400).json({ error: 'Player profile missing player_id (wallet id).' });

    await ensureWallet(playerId, userId);

    const idempotencyKey = `api_balance_add:${userId}:${Date.now()}`;
    const { data: txId, error: rpcErr } = await supabase.rpc('wallet_recharge', {
      p_wallet_id: playerId,
      p_amount: amount,
      p_idempotency_key: idempotencyKey,
      p_reference_id: null,
      p_description: description || 'Account recharge',
      p_actor_user_id: userId
    });
    if (rpcErr) throw rpcErr;

    const wallet = await getWallet(playerId);

    res.json({
      success: true,
      data: {
        user_id: userId,
        balance: wallet?.available_balance || 0
      }
    });
  } catch (error) {
    console.error('Error adding balance:', error);
    res.status(500).json({ error: 'Failed to add balance' });
  }
});

// Get transaction history
app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit || 50;

    const playerId = await getPlayerIdForUserId(userId).catch(() => null);
    if (!playerId) {
      return res.json([]);
    }

    await ensureWallet(playerId, userId);

    const { data: ledger, error: ledErr } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or(`from_wallet_id.eq.${playerId},to_wallet_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ledErr) {
      console.error('Error fetching wallet ledger:', ledErr);
      return res.status(500).json({ error: ledErr.message });
    }

    // Return in a backward-compatible shape (amount signed)
    const normalized = (ledger || []).map(tx => {
      const isOut = tx.from_wallet_id === playerId;
      const isIn = tx.to_wallet_id === playerId;
      const signedAmount = (isOut && !isIn) ? -Number(tx.amount) : Number(tx.amount);
      return {
        user_id: userId,
        type: (tx.type || '').toLowerCase(),
        amount: signedAmount,
        status: (tx.status || '').toLowerCase(),
        description: tx.description || null,
        reference_id: tx.reference_id || null,
        created_at: tx.created_at,
        tx_id: tx.tx_id
      };
    });

    res.json(normalized);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Serve static files from the public and Vite build directories
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, 'dist');
app.use(express.static(publicPath));
app.use(express.static(distPath));

// Global error handler - never expose stack traces
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res, next) => {
  // Keep API routes and asset requests separate from client-side routing.
  if (req.path.startsWith('/api') || path.extname(req.path)) {
    return next();
  }

  res.sendFile(path.join(distPath, 'index.html'));
});


// --- Start server ---
app.listen(PORT, '0.0.0.0', () => console.log(`Taigour E-Sports server running on http://0.0.0.0:${PORT}`));

