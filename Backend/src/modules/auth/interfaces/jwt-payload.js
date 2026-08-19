/**
 * @typedef {Object} JwtPayload
 * @property {string} sub - Standard JWT convention: subject = user ID.
 * @property {string} email
 * @property {'STUDENT'|'TEACHER'|'ADMIN'} role
 */

/**
 * What request.user looks like on every guarded controller/gateway,
 * after jwt.strategy.js's validate() runs.
 *
 * @typedef {Object} AuthenticatedUser
 * @property {string} id
 * @property {string} email
 * @property {'STUDENT'|'TEACHER'|'ADMIN'} role
 */

module.exports = {};
