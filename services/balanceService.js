class BalanceService {
  // Get player balance and membership info
  async getPlayerBalance(userId) {
    try {
      const response = await fetch(`/api/balance/${userId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch balance');
      return { data: result };
    } catch (error) {
      console.error('Error in getPlayerBalance:', error);
      return { error };
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, limit = 50) {
    try {
      const response = await fetch(`/api/transactions/${userId}?limit=${limit}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch transactions');
      return { data: result || [] };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { error };
    }
  }

  // Admin: Get all wallets + profiles + memberships
  async getAllPlayerBalances(limit = 100, offset = 0) {
    try {
      const response = await fetch(`/api/admin/wallets?limit=${limit}&offset=${offset}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch admin wallets');

      const rows = (result?.data || []).map(r => ({
        user_id: r.user_id,
        balance: Number(r.available_balance || 0),
        locked_balance: Number(r.locked_balance || 0),
        membership_tier: r.membership_tier || 'none',
        membership_expires_at: r.membership_expires_at || null,
        total_spent: Number(r.total_spent || 0),
        created_at: r.created_at,
        profiles: r.profiles || {}
      }));

      return { data: rows };
    } catch (error) {
      console.error('Error fetching all balances:', error);
      return { error };
    }
  }

  // Admin: Update player balance directly via secure backend API
  async adminUpdateBalance(userId, newBalance, reason = 'Admin adjustment') {
    try {
      const response = await fetch(`/api/admin/player/${userId}/balance`, {
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
      const response = await fetch(`/api/admin/player/${userId}/membership`, {
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
      const response = await fetch(`/api/admin/player/${userId}/stats`, {
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
