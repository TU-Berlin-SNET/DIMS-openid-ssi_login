/**
 * Accounts
 */
'use strict'

const assert = require('assert')

const ACCOUNTS = []

class Account {
  constructor (account) {
    this.accountId = account.id // the property named accountId is important to oidc-provider
    this.data = account
  }

  // claims() should return or resolve with an object with claims that are mapped 1:1 to
  // what your OP supports, oidc-provider will cherry-pick the requested ones automatically
  claims () {
    const claims = Object.assign({}, this.data, {
      sub: this.accountId
    })
    // data source is always a proof, therefore email is always verified
    // same for phone_number
    // TODO what about self attested attributes? this needs better handling
    if (this.data.email) {
      claims.email_verified = true
    }
    if (this.data.phone_number) {
      claims.phone_number_verified = true
    }
    return claims
  }

  static async register (did) {
    console.log('Account register')
    console.log(did)
    const newAccount = new Account({ id: did })
    console.log(newAccount)
    ACCOUNTS.push(newAccount)
    return newAccount
  }

  static async findById (ctx, id) {
    console.log('Account findById')
    console.log(ctx)
    console.log(id)
    return ACCOUNTS.find(v => v.accountId === id)
  }

  static async findByMyDid (myDid) {
    return ACCOUNTS.find(v => v.data.myDid === myDid)
  }

  static async findByTheirDid (theirDid) {
    return ACCOUNTS.find(v => v.data.theirDid === theirDid)
  }

  static async authenticate (email, password) {
    try {
      assert(password, 'password must be provided')
      assert(email, 'email must be provided')
      const lowercased = String(email).toLowerCase()
      const acc = ACCOUNTS.find(v => v.data.email === lowercased)
      assert(acc.data.id, 'invalid credentials provided')
      return acc
    } catch (err) {
      console.log(err)
      return undefined
    }
  }
}

module.exports = Account
