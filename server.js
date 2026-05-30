import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

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
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

// Lightweight API request logger for admin log panel.
app.use((req, res, next) => {
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
app.get('/api/tournaments', async (req, res) => {
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
app.get('/api/leaderboard', async (req, res) => {
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
app.get('/api/streams', async (req, res) => {
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

// Tournament registration
app.post('/api/register', async (req, res) => {
  try {
    const { tournamentid, playername, playerage, playeremail, playercontact, gameuid, promo_code, player_id } = req.body;

    if (!tournamentid || !playername || !playerage || !playeremail || !playercontact || !gameuid) {
      return res.status(400).json({ error: 'All fields are required' });
    }

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

    // Get tournament data and validate registration window
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('title, entry_fee, registration_start_date, registration_end_date')
      .eq('id', tournamentid)
      .single();

    const now = new Date();
    const registrationStart = parseDateAtStartOfDay(tournament?.registration_start_date);
    const registrationEnd = parseDateAtEndOfDay(tournament?.registration_end_date);

    if (registrationStart && now < registrationStart) {
      return res.status(400).json({
        error: `Registration has not opened yet. Opens on ${tournament.registration_start_date}.`
      });
    }

    if (registrationEnd && now > registrationEnd) {
      return res.status(400).json({ error: 'Registration has ended for this tournament.' });
    }

    // Wallet entry fee lock (atomic) before inserting registration
    const walletId = (player_id || '').toString().trim();
    const entryFee = parseAmount(tournament?.entry_fee);
    if (entryFee > 0) {
      if (!walletId) {
        return res.status(400).json({ error: 'player_id (wallet id) is required for paid tournaments.' });
      }

      await ensureWallet(walletId, null);

      const idempotencyKey = `tournament:${tournamentid}:wallet:${walletId}:entry_fee`;
      const { error: lockErr } = await supabase.rpc('wallet_lock_for_tournament', {
        p_wallet_id: walletId,
        p_tournament_id: String(tournamentid),
        p_amount: entryFee,
        p_idempotency_key: idempotencyKey,
        p_description: `Entry fee lock for tournament ${tournament?.title || tournamentid}`,
        p_actor_user_id: null
      });

      if (lockErr) {
        const msg = (lockErr.message || '').toLowerCase().includes('insufficient')
          ? 'Insufficient balance for entry fee.'
          : lockErr.message;
        return res.status(400).json({ error: msg });
      }
    }

    const registration = {
      id: Date.now().toString(),
      tournamentid,
      tournamenttitle: tournament?.title || '',
      playername,
      Player_Age: playerage,
      playeremail,
      playercontact,
      gameuid,
      Promo_Code: promo_code || null,
      player_id: player_id || null,
      registrationdate: new Date().toISOString()
    };

    const { error } = await supabase
      .from('registrations')
      .insert([registration]);

    if (error) {
      console.error('Error registering:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get registrations (admin only)
app.get('/api/registrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('registrationdate', { ascending: false });

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

app.use((req, res, next) => {
  // Keep API routes and asset requests separate from client-side routing.
  if (req.path.startsWith('/api') || path.extname(req.path)) {
    return next();
  }

  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Start server ---
app.listen(PORT, () => console.log(`Taigour E-Sports server running on http://localhost:${PORT}`));

