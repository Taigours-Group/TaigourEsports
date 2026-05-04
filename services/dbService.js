
import { createClient } from '@supabase/supabase-js';
import { Tournament, LeaderboardEntry, StreamVideo, Registration, LogEntry, GameType } from '../types';

// Supabase client setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default values
const DEFAULT_STREAMS = [];



class DBService {

  // Tournaments
  async getTournaments() {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*');

      if (error) {
        console.error('Error fetching tournaments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
  }

  async saveTournaments(data) {
    try {
      // Clear existing and insert new
      const { error: deleteError } = await supabase
        .from('tournaments')
        .delete()
        .neq('id', ''); // Delete all

      if (deleteError) {
        console.error('Error clearing tournaments:', deleteError);
        return false;
      }

      if (data.length > 0) {
        const { error: insertError } = await supabase
          .from('tournaments')
          .insert(data);

        if (insertError) {
          console.error('Error inserting tournaments:', insertError);
          return false;
        }
      }

      this.addLog('PUT', '/api/tournaments');
      return true;
    } catch (error) {
      console.error('Error saving tournaments:', error);
      return false;
    }
  }

  // Leaderboard
  async getLeaderboard() {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async saveLeaderboard(data) {
    try {
      // Clear existing and insert new
      const { error: deleteError } = await supabase
        .from('leaderboard')
        .delete()
        .neq('id', ''); // Delete all

      if (deleteError) {
        console.error('Error clearing leaderboard:', deleteError);
        return false;
      }

      if (data.length > 0) {
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert(data);

        if (insertError) {
          console.error('Error inserting leaderboard:', insertError);
          return false;
        }
      }

      this.addLog('PUT', '/api/leaderboard');
      return true;
    } catch (error) {
      console.error('Error saving leaderboard:', error);
      return false;
    }
  }

  // Streams
  async getStreams() {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*');

      if (error) {
        console.error('Error fetching streams:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching streams:', error);
      return [];
    }
  }

  async saveStreams(data) {
    try {
      // Clear existing and insert new
      const { error: deleteError } = await supabase
        .from('streams')
        .delete()
        .neq('id', ''); // Delete all

      if (deleteError) {
        console.error('Error clearing streams:', deleteError);
        return false;
      }

      if (data.length > 0) {
        const { error: insertError } = await supabase
          .from('streams')
          .insert(data);

        if (insertError) {
          console.error('Error inserting streams:', insertError);
          return false;
        }
      }

      this.addLog('PUT', '/api/streams');
      return true;
    } catch (error) {
      console.error('Error saving streams:', error);
      return false;
    }
  }

  // Registrations
  async getRegistrations() {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registrationdate', { ascending: false });

      if (error) {
        console.error('Error fetching registrations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return [];
    }
  }

  async saveRegistrations(data) {
    try {
      // Clear existing and insert new
      const { error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .neq('id', ''); // Delete all

      if (deleteError) {
        console.error('Error clearing registrations:', deleteError);
        return false;
      }

      if (data.length > 0) {
        const { error: insertError } = await supabase
          .from('registrations')
          .insert(data);

        if (insertError) {
          console.error('Error inserting registrations:', insertError);
          return false;
        }
      }

      this.addLog('PUT', '/api/registrations');
      return true;
    } catch (error) {
      console.error('Error saving registrations:', error);
      return false;
    }
  }

  async addRegistration(reg) {
    try {
      // Get tournament title
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('title')
        .eq('id', reg.tournamentid)
        .single();

      const registration = {
        id: Date.now().toString(),
        tournamentid: reg.tournamentid,
        tournamenttitle: tournament?.title || '',
        playername: reg.playername,
        playeremail: reg.playeremail,
        playercontact: reg.playercontact,
        gameuid: reg.gameuid,
        registrationdate: new Date().toISOString()
      };

      const { error } = await supabase
        .from('registrations')
        .insert([registration]);

      if (error) {
        console.error('Error adding registration:', error);
        return false;
      }

      this.addLog('POST', `/api/register/${reg.tournamentid}`);
      return true;
    } catch (error) {
      console.error('Error adding registration:', error);
      return false;
    }
  }

  // Logs
  async getLogs() {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  addLog(method, endpoint) {
    // Note: Logging is now handled server-side via Supabase
    // This method can be removed or kept for client-side logging if needed
    console.log(`Log: ${method} ${endpoint}`);
  }

  // Global State Sync (for Admin restore)
  async restoreDatabase(data) {
    try {
      // Restore tournaments
      if (data.tournaments) {
        const { error: deleteTournaments } = await supabase
          .from('tournaments')
          .delete()
          .neq('id', '');

        if (deleteTournaments) {
          console.error('Error clearing tournaments:', deleteTournaments);
          return false;
        }

        if (data.tournaments.length > 0) {
          const { error: insertTournaments } = await supabase
            .from('tournaments')
            .insert(data.tournaments);

          if (insertTournaments) {
            console.error('Error inserting tournaments:', insertTournaments);
            return false;
          }
        }
      }

      // Restore leaderboard
      if (data.leaderboard) {
        const { error: deleteLeaderboard } = await supabase
          .from('leaderboard')
          .delete()
          .neq('id', '');

        if (deleteLeaderboard) {
          console.error('Error clearing leaderboard:', deleteLeaderboard);
          return false;
        }

        if (data.leaderboard.length > 0) {
          const { error: insertLeaderboard } = await supabase
            .from('leaderboard')
            .insert(data.leaderboard);

          if (insertLeaderboard) {
            console.error('Error inserting leaderboard:', insertLeaderboard);
            return false;
          }
        }
      }

      // Restore streams
      if (data.streams) {
        const { error: deleteStreams } = await supabase
          .from('streams')
          .delete()
          .neq('id', '');

        if (deleteStreams) {
          console.error('Error clearing streams:', deleteStreams);
          return false;
        }

        if (data.streams.length > 0) {
          const { error: insertStreams } = await supabase
            .from('streams')
            .insert(data.streams);

          if (insertStreams) {
            console.error('Error inserting streams:', insertStreams);
            return false;
          }
        }
      }

      // Restore registrations
      if (data.registrations) {
        const { error: deleteRegistrations } = await supabase
          .from('registrations')
          .delete()
          .neq('id', '');

        if (deleteRegistrations) {
          console.error('Error clearing registrations:', deleteRegistrations);
          return false;
        }

        if (data.registrations.length > 0) {
          const { error: insertRegistrations } = await supabase
            .from('registrations')
            .insert(data.registrations);

          if (insertRegistrations) {
            console.error('Error inserting registrations:', insertRegistrations);
            return false;
          }
        }
      }

      this.addLog('SYSTEM', '/api/restore');
      return true;
    } catch (e) {
      console.error("Database restore failed", e);
      return false;
    }
  }
}

export const dbService = new DBService();
