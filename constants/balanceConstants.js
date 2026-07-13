// Membership Tiers
export const MEMBERSHIP_TIERS = {
  NONE: 'none',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
};

const DEFAULT_MEMBERSHIP_BENEFITS = {
  [MEMBERSHIP_TIERS.NONE]: {
    name: 'Free Player',
    price: 0,
    color: 'gray',
    benefits: ['Basic tournament access', 'Limited daily tournaments']
  }
};

const DEFAULT_MEMBERSHIP_STYLE = {
  [MEMBERSHIP_TIERS.NONE]: { label: 'Free Player', short: 'FREE', color: '#9CA3AF', icon: 'user' }
};

const DEFAULT_RECHARGE_PACKAGES = [];

const COLOR_MAP = {
  gray: '#9CA3AF',
  amber: '#F59E0B',
  slate: '#64748B',
  yellow: '#FACC15',
  cyan: '#22D3EE',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  white: '#F8FAFC',
};

const normalizeTierColor = (color) => {
  if (!color) return '#9CA3AF';
  const key = String(color).toLowerCase();
  return COLOR_MAP[key] || color;
};

export let MEMBERSHIP_BENEFITS = DEFAULT_MEMBERSHIP_BENEFITS;
export let MEMBERSHIP_STYLE = DEFAULT_MEMBERSHIP_STYLE;
export let RECHARGE_PACKAGES = DEFAULT_RECHARGE_PACKAGES;

export const hydrateCatalogFromSupabase = (rows = {}) => {
  const tiers = {};
  const style = {};
  const packages = [];

  // Accept multiple shapes: { membershipTiers, rechargePackages },
  // { membership_tiers, recharge_packages }, or Supabase style { data: { membership_tiers, recharge_packages } }
  const src = rows?.data || rows;
  const membershipRows = src?.membershipTiers || src?.membership_tiers || src?.membership || src?.memberships || [];
  const rechargeRows = src?.rechargePackages || src?.recharge_packages || src?.recharge || src?.rechargePackages || [];

  (Array.isArray(membershipRows) ? membershipRows : []).forEach((item) => {
    const slug = item.slug || item.tier || item.name?.toLowerCase?.()?.replace(/\s+/g, '_') || 'none';
    const normalized = {
      name: item.name || slug,
      price: Number(item.price || 0),
      color: item.color || 'gray',
      benefits: Array.isArray(item.benefits) ? item.benefits : (item.benefit || item.benefits || []),
      shortName: item.short_name || item.shortName || item.short || slug.toUpperCase(),
      icon: item.icon || 'user',
      description: item.description || item.desc || null,
      badgeLabel: item.badge_label || item.badgeLabel || null,
      isPopular: Boolean(item.is_popular || item.isPopular),
    };

    tiers[slug] = normalized;
    style[slug] = {
      label: normalized.name,
      short: normalized.badgeLabel || normalized.shortName || slug.toUpperCase(),
      color: normalizeTierColor(normalized.color),
      icon: normalized.icon,
      description: normalized.description,
      isPopular: normalized.isPopular,
    };
  });

  if (!tiers[MEMBERSHIP_TIERS.NONE]) {
    tiers[MEMBERSHIP_TIERS.NONE] = DEFAULT_MEMBERSHIP_BENEFITS[MEMBERSHIP_TIERS.NONE];
    style[MEMBERSHIP_TIERS.NONE] = DEFAULT_MEMBERSHIP_STYLE[MEMBERSHIP_TIERS.NONE];
  }

  if (Object.keys(tiers).length === 0) {
    Object.assign(tiers, DEFAULT_MEMBERSHIP_BENEFITS);
    Object.assign(style, DEFAULT_MEMBERSHIP_STYLE);
  }

  (Array.isArray(rechargeRows) ? rechargeRows : []).forEach((item) => {
    packages.push({
      amount: Number(item.amount || 0),
      bonus: Number(item.bonus || 0),
      cost: Number(item.cost || 0),
      icon: item.icon || 'fa-wallet',
    });
  });

  if (packages.length === 0) {
    packages.push(...DEFAULT_RECHARGE_PACKAGES);
  }

  MEMBERSHIP_BENEFITS = tiers;
  MEMBERSHIP_STYLE = style;
  RECHARGE_PACKAGES = packages;
};

// Normalize any tier value (unknown/missing -> none) to its style entry.
export const getTierStyle = (tier) =>
  MEMBERSHIP_STYLE[tier] || MEMBERSHIP_STYLE[MEMBERSHIP_TIERS.NONE];

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
  name: 'Taigour Admin',
  message: 'Payment & Membership Requests'
};
