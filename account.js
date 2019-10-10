const assert = require('assert')

// GET /api/message
// list messages
// GET /api/message/{messageId}
// Retrieve a message
// Enter username, then proofrequest should be received --> alias field of NYM could also be used, if that is unique on a specific microledger
// --> do it with verifiable credentials --> Send proof request for account credential, then verify proof
// --> send the relevant contents of the account credential upon user consent as JWT to the relying party and login
// authorization flow should either be implicit or code (info via backchannel)

// API authentication credentials need to be stored

// TODO: get users should either be identified by a private DID or some label for the connection
// TODO: get users from proof request

const ACCOUNTS = []

class Account {
  constructor (account) {
    this.accountId = account.id // the property named accountId is important to oidc-provider
    this.data = account
  }

  // claims() should return or resolve with an object with claims that are mapped 1:1 to
  // what your OP supports, oidc-provider will cherry-pick the requested ones automatically
  claims () {
    return Object.assign({}, this.data, {
      sub: this.accountId
    })
  }

  static async findById (ctx, id) {
    return ACCOUNTS.find(v => v.data.id === id)
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

// for dev purposes
ACCOUNTS.push(new Account({
  id: '23121d3c-84df-44ac-b458-3d63a9a05497',
  email: 'foo@example.com',
  email_verified: true
}))
ACCOUNTS.push(new Account({
  id: 'c2ac2b4a-2262-4e2f-847a-a40dd3c4dcd5',
  email: 'bar@example.com',
  email_verified: false
}))

module.exports = Account
