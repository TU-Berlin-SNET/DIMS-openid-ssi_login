/**
 * Scope <-> Claim Mapper
 */
'use strict'
const config = require('./config')

module.exports = exports = {}

/**
 * Check if scopes can be fulfilled
 * Required attributes which end with _verified are ignored
 * since attributes are based on indy proofs and therefore
 * should always be verified=true
 * @param {Object} claims key-value object containing claims
 * @param {scopes} scopes array of scope names
 * @return {Boolean} true if claims can fulfill scopes, false otherwise
 */
exports.fulfillsScopes = (claims = {}, scopes = []) => {
  return scopes.every(scope =>
    config.SUPPORTED_SCOPES[scope].every(attr =>
      !!claims[attr] || typeof claims[attr] === 'boolean' || attr.endsWith('_verified')))
}

/**
 * Get attributes which are missing to fulfill scopes
 * Required attributes which end with _verified are ignored
 * since attributes are based on indy proofs and therefore
 * should always be verified=true
 * @param {Object} claims key-value object containing claims
 * @param {scopes} scopes array of scope names
 * @return {Array} array of attribute names
 */
exports.getMissingAttributes = (claims = {}, scopes = []) => {
  const scopeAttrs = scopes.flatMap(scope => config.SUPPORTED_SCOPES[scope])
  // exclude fields ending on _verified
  // since attributes are based on indy proofs
  // and therefore should always be verified=true
  const missingAttributes = scopeAttrs.filter(attr =>
    !claims[attr] && typeof claims[attr] !== 'boolean' && !attr.endsWith('_verified'))
  return missingAttributes
}
