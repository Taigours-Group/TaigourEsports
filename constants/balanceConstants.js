// Membership Tiers
export const MEMBERSHIP_TIERS = {
  NONE: 'none',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
};

// Membership Benefits
export const MEMBERSHIP_BENEFITS = {
  [MEMBERSHIP_TIERS.NONE]: {
    name: 'Free Player',
    price: 0,
    color: 'gray',
    benefits: ['Basic tournament access', 'Limited daily tournaments']
  },
  [MEMBERSHIP_TIERS.BRONZE]: {
    name: 'Bronze Member',
    price: 99,
    color: 'amber',
    benefits: ['Unlimited tournaments', '5% prize boost', 'Priority support']
  },
  [MEMBERSHIP_TIERS.SILVER]: {
    name: 'Silver Member',
    price: 199,
    color: 'slate',
    benefits: ['Unlimited tournaments', '10% prize boost', 'Priority support', 'Exclusive events']
  },
  [MEMBERSHIP_TIERS.GOLD]: {
    name: 'Gold Member',
    price: 499,
    color: 'yellow',
    benefits: ['Unlimited tournaments', '15% prize boost', 'VIP support', 'Exclusive events', 'Monthly rewards']
  },
  [MEMBERSHIP_TIERS.PLATINUM]: {
    name: 'Platinum Member',
    price: 999, 
    color: 'cyan',
    benefits: ['Unlimited tournaments', '25% prize boost', '24/7 VIP support', 'All exclusive events', 'Monthly rewards + bonus']
  }
};

// Recharge Packages
export const RECHARGE_PACKAGES = [
  { amount: 100, bonus: 10, cost: 99, icon: 'fa-wallet' },
  { amount: 500, bonus: 60, cost: 499, icon: 'fa-money-bill' },
  { amount: 1000, bonus: 150, cost: 999, icon: 'fa-coins' },
  { amount: 2500, bonus: 500, cost: 2599, icon: 'fa-money-bill-wave' },
  { amount: 5000, bonus: 1250, cost: 5999, icon: 'fa-gem' }
];

// Transaction Types
export const TRANSACTION_TYPES = {
  RECHARGE: 'recharge',
  MEMBERSHIP_PURCHASE: 'membership_purchase',
  TOURNAMENT_ENTRY: 'tournament_entry',
  PRIZE_REWARD: 'prize_reward',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
  REFUND: 'refund'
};

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Purchase Request Types
export const REQUEST_TYPES = {
  RECHARGE: 'recharge',
  MEMBERSHIP: 'membership'
};

// Purchase Request Status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  COMPLETED: 'completed'
};

// Admin WhatsApp Configuration
export const ADMIN_WHATSAPP = {
  number: '+9779766115626', // Replace with actual admin WhatsApp number (with country code)
  displayNumber: '+977 97661 15626', // Formatted for display
  name: 'Taigours Admin',
  message: 'Payment & Membership Requests'
};
