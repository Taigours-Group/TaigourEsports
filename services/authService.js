import { supabase } from './supabaseClient';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

// Helper function to generate unique player ID
const generatePlayerID = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PLAYER_${timestamp}_${randomStr}`;
};

class AuthService {
  // Check if we are on a native mobile platform
  isNative() {
    return window.Capacitor?.isNativePlatform();
  }

  getRedirectUrl() {
    if (this.isNative()) {
      return 'taigours-esports://login-callback';
    }
    return window.location.origin;
  }

  async signInWithGoogle() {
    try {
      if (this.isNative()) {
        // 1. Trigger Native Google Sign-In (No Chrome redirect!)
        const result = await GoogleSignIn.signIn();

        // 2. Authenticate with Supabase using the ID Token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: result.idToken,
        });

        if (error) throw error;
        return { data };
      } else {
        // Web Flow fallback
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: this.getRedirectUrl()
          }
        });
        if (error) throw error;
        return { data };
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error.message);
      return { error };
    }
  }

  async signInWithApple() {
    // Note: For native Apple login, use @capacitor-community/apple-sign-in similarly
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: this.getRedirectUrl()
      }
    });
    return error ? { error } : { data };
  }

  async signInWithFacebook() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: this.getRedirectUrl()
      }
    });
    return error ? { error } : { data };
  }

  async signOut() {
    if (this.isNative()) {
      await GoogleSignIn.signOut().catch(() => { });
    }
    const { error } = await supabase.auth.signOut();
    return error ? { error } : { success: true };
  }

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error.message);
      return { error };
    }
    return { data: error?.code === 'PGRST116' ? null : data };
  }

  async createProfile(userId, profileData) {
    // Generate player_id if not provided
    if (!profileData.player_id) {
      profileData.player_id = generatePlayerID();
    }

    // Initialize player stats if not provided
    if (profileData.rank === undefined) {
      profileData.rank = 'UNRANKED'; 
    }
    if (profileData.combat_score === undefined) {
      profileData.combat_score = 0;
    }
    if (profileData.total_kills === undefined) {
      profileData.total_kills = 0;
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, ...profileData }]);

    if (!error) {
      // Initialize player balance
      try {
        await supabase
          .from('player_balances')
          .upsert([{
            user_id: userId,
            balance: 0,
            membership_tier: 'none',
            membership_expires_at: null,
            total_spent: 0,
            created_at: new Date().toISOString()
          }]);
      } catch (balanceError) {
        console.error('Error initializing balance:', balanceError);
      }
    }

    return error ? { error } : { data };
  }
}

export const authService = new AuthService();
