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
 */
export const Tournament = {};

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
