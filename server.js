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
    const { tournamentid, playername, playerage, playeremail, playercontact, gameuid, promocode } = req.body;

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
      .select('title, registration_start_date, registration_end_date')
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

    const registration = {
      id: Date.now().toString(),
      tournamentid,
      tournamenttitle: tournament?.title || '',
      playername,
      Player_Age: playerage,
      playeremail,
      playercontact,
      gameuid,
      Promo_Code: promocode || null,
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
      .order('created_at', { ascending: false });

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

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// --- Start server ---
app.listen(PORT, () => console.log(`Taigour E-Sports server running on http://localhost:${PORT}`));

