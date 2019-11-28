/**
 * Scope <-> Claim Mapper
 */
'use strict'

module.exports = exports = {}

exports.supportedScopes = {
  openid: ['sub'],
  email: ['email', 'email_verified'],
  address: ['address'],
  phone: ['phone_number', 'phone_number_verified'],
  profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name',
    'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo']
}
