import { supabase } from './supabaseClient';
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from '../constants/balanceConstants';

class BalanceService {
  // Get player balance and membership info
  async getPlayerBalance(userId) {
    try {
      const { data, error } = await supabase
        .from('player_balances')
        .select(
          'user_id,balance,membership_tier,membership_expires_at,total_spent,created_at'
        )
        .eq('user_id', userId)
        .maybeSingle(); // maybeSingle returns null (not 406) when no row exists

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching balance:', error);
        return { error };
      }

      return { 
        data: data || {
          user_id: userId,
          balance: 0,
          membership_tier: 'none',
          membership_expires_at: null,
          total_spent: 0,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in getPlayerBalance:', error);
      return { error };
    }
  }

  // Initialize player balance (called on profile creation)
  async initializeBalance(userId) {
    try {
      const { data, error } = await supabase
        .from('player_balances')
        .upsert([{
          user_id: userId,
          balance: 0,
          membership_tier: 'none',
          membership_expires_at: null,
          total_spent: 0,
          created_at: new Date().toISOString()
        }]);

      return error ? { error } : { data };
    } catch (error) {
      console.error('Error initializing balance:', error);
      return { error };
    }
  }

  // Add balance (recharge)
  async addBalance(userId, amount, description = 'Account recharge') {
    try {
      // Get current balance
      const { data: balanceData } = await this.getPlayerBalance(userId);
      const newBalance = (balanceData?.balance || 0) + amount;

      // Update balance
      const { data: updateData, error: updateError } = await supabase
        .from('player_balances')
        .update({ balance: newBalance })
        .eq('user_id', userId)
        .select();

      if (updateError) return { error: updateError };

      // Record transaction
      await this.recordTransaction(userId, TRANSACTION_TYPES.RECHARGE, amount, TRANSACTION_STATUS.COMPLETED, description);

      return { data: updateData?.[0] };
    } catch (error) {
      console.error('Error adding balance:', error);
      return { error };
    }
  }

  // Deduct balance (tournament entry, etc.)
  async deductBalance(userId, amount, transactionType = TRANSACTION_TYPES.TOURNAMENT_ENTRY, description = '') {
    try {
      // Get current balance
      const { data: balanceData } = await this.getPlayerBalance(userId);
      const currentBalance = balanceData?.balance || 0;

      if (currentBalance < amount) {
        return { error: { message: 'Insufficient balance' } };
      }

      const newBalance = currentBalance - amount;

      // Update balance
      const { data: updateData, error: updateError } = await supabase
        .from('player_balances')
        .update({ balance: newBalance })
        .eq('user_id', userId)
        .select();

      if (updateError) return { error: updateError };

      // Record transaction
      await this.recordTransaction(userId, transactionType, -amount, TRANSACTION_STATUS.COMPLETED, description);

      return { data: updateData?.[0] };
    } catch (error) {
      console.error('Error deducting balance:', error);
      return { error };
    }
  }

  // Purchase membership
  async purchaseMembership(userId, membershipTier, price, durationDays = 30) {
    try {
      // Read current balance ONCE before any mutations to avoid race conditions
      const { data: currentBalanceData, error: fetchError } = await this.getPlayerBalance(userId);
      if (fetchError) return { error: fetchError };

      const currentTotalSpent = currentBalanceData?.total_spent || 0;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Deduct balance
      const { error: deductError } = await this.deductBalance(
        userId,
        price,
        TRANSACTION_TYPES.MEMBERSHIP_PURCHASE,
        `Membership: ${membershipTier}`
      );

      if (deductError) return { error: deductError };

      // Update membership tier using the already-known total_spent (no second fetch)
      const { data, error } = await supabase
        .from('player_balances')
        .update({
          membership_tier: membershipTier,
          membership_expires_at: expiresAt.toISOString(),
          total_spent: currentTotalSpent + price
        })
        .eq('user_id', userId)
        .select();

      if (error) return { error };

      return { data: data?.[0] };
    } catch (error) {
      console.error('Error purchasing membership:', error);
      return { error };
    }
  }

  // Record transaction
  async recordTransaction(userId, type, amount, status, description = '') {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type,
          amount,
          status,
          description,
          created_at: new Date().toISOString()
        }]);

      if (error) console.error('Error recording transaction:', error);
    } catch (error) {
      console.error('Error in recordTransaction:', error);
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return error ? { error } : { data: data || [] };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { error };
    }
  }

  // Get all player balances (admin)
  async getAllPlayerBalances(limit = 100, offset = 0) {
    try {
      // 1. Fetch balances
      const { data: balances, error: balError } = await supabase
        .from('player_balances')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (balError) return { error: balError };
      if (!balances || balances.length === 0) return { data: [] };

      // 2. Fetch corresponding profiles
      const userIds = balances.map(b => b.user_id);
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profError) {
        console.error('Error fetching profiles:', profError);
        // Continue anyway, just without profile data
      }

      // 3. Merge data
      const mergedData = balances.map(balance => {
        const profile = profiles?.find(p => p.id === balance.user_id) || {};
        return {
          ...balance,
          profiles: profile 
        };
      });

      return { data: mergedData };
    } catch (error) {
      console.error('Error fetching all balances:', error);
      return { error };
    }
  }

  // Admin: Update player balance directly via secure backend API
  async adminUpdateBalance(userId, newBalance, reason = 'Admin adjustment') {
    try {
      const response = await fetch(`http://localhost:10000/api/admin/player/${userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newBalance, reason })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update balance');
      return { data: result.data };
    } catch (error) {
      console.error('Error in adminUpdateBalance:', error);
      return { error };
    }
  }

  // Admin: Update membership via secure backend API
  async adminUpdateMembership(userId, membershipTier, durationDays = 30) {
    try {
      const response = await fetch(`http://localhost:10000/api/admin/player/${userId}/membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipTier, durationDays })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update membership');
      return { data: result.data };
    } catch (error) {
      console.error('Error in adminUpdateMembership:', error);
      return { error };
    }
  }

  // Admin: Update player profile stats via secure backend API
  async adminUpdatePlayerStats(userId, profileUpdates) {
    try {
      const response = await fetch(`http://localhost:10000/api/admin/player/${userId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdates)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update stats');
      return { data: result.data };
    } catch (error) {
      console.error('Error in adminUpdatePlayerStats:', error);
      return { error };
    }
  }
}

export const balanceService = new BalanceService();
