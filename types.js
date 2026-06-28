export const GameType = {
  FREE_FIRE: 'freefire',
  PUBG: 'pubg',
  LUDO: 'ludo'
}

/**
 * @typedef {Object} Tournament
 * @property {string} id
 * @property {string} title
 * @property {string} [game]
 * @property {string} [type]
 * @property {string} image
 * @property {string} date
 * @property {string} time
 * @property {string} location
 * @property {string} entry_fee
 * @property {string} prize
 * @property {string} [registration_start_date]
 * @property {string} [registration_end_date]
 * @property {string} registration_url 
 * @property {string} [stream_id]
 * @property {string} [description]
 * @property {string[]} [rules]
 * @property {{position: string, reward: string}[]} [prize_breakdown]
 * @property {number} [max_slots]
 * @property {boolean} [login_required] - Whether users must login to register
 * @property {string} [payment_method] - 'tgc_coin' or 'direct_payment'
 * @property {string} [payment_type] - Alias for payment_method
 * @property {Date} [created_at]
 * @property {Date} [updated_at]
 */
export const Tournament = {};

/**
 * @typedef {Object} TeamPlayer
 * @property {string} id
 * @property {string} player_name
 * @property {string} player_uid - Game ID/UID
 * @property {string} player_citizenship_photo - Photo URL or base64
 * @property {Date} created_at
 */
export const TeamPlayer = {};

/**
 * @typedef {Object} TeamRegistration
 * @property {string} id
 * @property {string} tournament_id
 * @property {string} team_name
 * @property {string} team_tag
 * @property {string} [team_logo]
 * @property {string} manager_name
 * @property {string} manager_contact
 * @property {string} registrar_email
 * @property {string} payment_method - 'tgc_coin' or 'direct_payment'
 * @property {string} payment_status - 'pending', 'completed', 'failed'
 * @property {string} [payment_reference_id]
 * @property {number} total_players
 * @property {string} [notes]
 * @property {Date} registration_date
 * @property {Date} created_at
 * @property {Date} updated_at
 */
export const TeamRegistration = {};

/**
 * @typedef {Object} PaymentConfig
 * @property {'tgc_coin' | 'direct_payment'} method
 * @property {boolean} login_required
 */
export const PaymentConfig = {};

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} id
 * @property {number} rank
 * @property {string} teamname
 * @property {string} avatar
 * @property {number} kills
 * @property {number} wins
 * @property {number} points
 * @property {string} game
 */
export const LeaderboardEntry = {};

/**
 * @typedef {Object} ChatReaction
 * @property {string} emoji
 * @property {number} count
 */
export const ChatReaction = {};

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} username
 * @property {string} text
 * @property {number} timestamp
 * @property {ChatReaction[]} [reactions]
 * @property {boolean} [isSystem]
 */
export const ChatMessage = {};

/**
 * @typedef {Object} StreamHighlight
 * @property {string} time
 * @property {string} title
 * @property {string} subtitle
 */
export const StreamHighlight = {};

/**
 * @typedef {Object} StreamVideo
 * @property {string} id
 * @property {string} title
 * @property {string} youtubeid
 * @property {boolean} islive
 * @property {number} [like_count]
 * @property {number} [share_count]
 * @property {number} [viewer_count]
 */
export const StreamVideo = {};

/**
 * @typedef {Object} Registration
 * @property {string} id
 * @property {string} tournamentid
 * @property {string} tournamenttitle
 * @property {string} playername
 * @property {string} playeremail
 * @property {string} playercontact
 * @property {string} gameuid
 * @property {number|string} [Player_Age]
 * @property {string|null} [Promo_Code]
 * @property {number} registrationdate
 */
export const Registration = {};

/**
 * @typedef {Object} LogEntry
 * @property {number} id
 * @property {string} timestamp 
 * @property {string} method
 * @property {string} endpoint
 * @property {number} status
 */
export const LogEntry = {};
