const assert = require('assert');
const _ = require('lodash');

// 
/*TODO: send message
 with API (it has to be authcrypted)
// (After pairwise connection has been established)
// POST /api/message
// 
{
  "wallet": "string",
  "did": "string",
  "message": "string"
}*/
// GET /api/message
// list messages
// GET /api/message/{messageId}
// Retrieve a message
// Enter username, then proofrequest should be received --> alias field of NYM could also be used, if that is unique on a specific microledger
// --> do it with verifiable credentials --> Send proof request for account credential, then verify proof
// --> send the relevant contents of the account credential upon user consent as JWT to the relying party and login
// authorization flow should either be implicit or code (info via backchannel)

// API authentication credentials need to be stored

//TODO: get users should either be identified by a private DID or some label for the connection
//TODO: get users from proof request
const USERS = {
  '23121d3c-84df-44ac-b458-3d63a9a05497': {
    email: 'foo@example.com',
    email_verified: true,
  },
  'c2ac2b4a-2262-4e2f-847a-a40dd3c4dcd5': {
    email: 'bar@example.com',
    email_verified: false,
  },
};

class Account {
  constructor(id) {
    this.accountId = id; // the property named accountId is important to oidc-provider
  }

  // claims() should return or resolve with an object with claims that are mapped 1:1 to
  // what your OP supports, oidc-provider will cherry-pick the requested ones automatically
  claims() {
    return Object.assign({}, USERS[this.accountId], {
      sub: this.accountId,
    });
  }

  static async findById(ctx, id) {
    // this is usually a db lookup, so let's just wrap the thing in a promise, oidc-provider expects
    // one
    return new Account(id);
  }

  static async authenticate(email, password) {
    try {
      assert(password, 'password must be provided');
      assert(email, 'email must be provided');
      const lowercased = String(email).toLowerCase();
      const id = _.findKey(USERS, { email: lowercased });
      assert(id, 'invalid credentials provided');

      // this is usually a db lookup, so let's just wrap the thing in a promise
      return new this(id);
    } catch (err) {
      return undefined;
    }
  }

  static async authenticateUsername(username) {
    try {
      assert(username, 'username must be provided');

      //TODO: perform VC based authentication
      const proof = null//
      assert(proof, 'authentication unsuccesful');

      //TODO: verify proof
      // this is usually a db lookup, so let's just wrap the thing in a promise
      //promise is not needed anmyore, all the requested info is in the proof
      return new this(proof);
    } catch (err) {
      return undefined;
    }
  }
  static async authenticateDID(recipientDID) {
    try {
      assert(recipientDID, 'DID must be provided');
      //TODO: perform VC based authentication
      const proof = null//
      assert(proof, 'authentication unsuccesful');

      //TODO: verify proof
      // this is usually a db lookup, so let's just wrap the thing in a promise
      //Comment promise is not needed anmyore, all the requested info is in the proof
      return new this(proof);
    } catch (err) {
      return undefined;
    }
  }
}

module.exports = Account;