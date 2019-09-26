/***********************************************************************************************
* Utilized online examples:
* - Scott Brady Example:
*   - https://github.com/scottbrady91/node-oidc-provider-example
* - Scott Brady Page:
*   - https://www.scottbrady91.com/OpenID-Connect/Getting-Started-with-oidc-provider
* - Panva example:
*   - https://github.com/panva/node-oidc-provider-example/tree/master/03-oidc-views-accounts
* -  More examples from Panva:
*   - https://github.com/panva/node-oidc-provider/tree/master/example
* - Some more panva documentation:
*   - https://github.com/panva/node-oidc-provider/blob/master/docs/README.md
***********************************************************************************************/
const http = require('http');
const Provider = require('oidc-provider');
const Account = require('./account');
const express = require('express');
const assert = require('assert');
const path = require('path');
const bodyParser = require('body-parser');
const Constants = require('./constants')
const WebSocketServer = require('./websocket')
const TicketService = require('./ticket-service')

//const RedisAdapter = require('./redis_adapter');
//https://self-issued.info/docs/draft-ietf-jose-json-web-key.html
//const jwks = require('./jwks.json');
console.log("Example keys in jwks.json and jwks2.json have been taken from https://self-issued.info/docs/draft-ietf-jose-json-web-key.html\nChange them, and generate your own keys!")
const jwks = require('./jwks2.json');

async function findById(ctx, id) {
  return {
      accountId: id,
      async claims() { return { sub: id }; },
  };
}

//const oidc = new Provider('http://localhost:3000', configuration);
// express/nodejs style application callback (req, res, next) for use with express apps, see /examples/express.js
//oidc.callback

// koa application for use with koa apps, see /examples/koa.js
//oidc.app

// or just expose a server standalone, see /examples/standalone.js
//const server = oidc.listen(3000, () => {
//  console.log('oidc-provider listening on port 3000, check http://localhost:3000/.well-known/openid-configuration');
//});

//Test requests:
//http://localhost:3000/auth?client_id=test_implicit_app&redirect_uri=https://testapp/signin-oidc&response_type=id_token&scope=openid profile&nonce=123&state=321
//https://testapp/signin-oidc#id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleXN0b3JlLUNIQU5HRS1NRSJ9.eyJzdWIiOiJzY290dCIsIm5vbmNlIjoiMTIzIiwic19oYXNoIjoialNQUGJJYm9OS2VxYnQ3VlRDYk9LdyIsImF1ZCI6InRlc3RfaW1wbGljaXRfYXBwIiwiZXhwIjoxNTY1Nzk3ODc1LCJpYXQiOjE1NjU3OTQyNzUsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9.kc8TXzRsrN8f9vspIx1x_u2f9kHmbIAfJSd_ApoUKMEZVuhyIx70aNRzzs-P8wsWV64xQ-yDrtkhsL_-GGexQQfMdT7QWfHYwdnuulE9Al85k5rx4x0p35Q9SuCJMewpwdMOjYTIV9k6FqeH3wXRkiPlV_htVAv7PyU7lIODJZUls3aSrxe8ea17Ivr-ucsqf6trauCFuMZ4DhZh_qjLRf5vrZ9gyHLn1WGddCY_--BU2z5MOs3HAqSVGOdJfH1bmIEz4CEZW3B9STCasheot-CUzyGe1OO9HaVLRgT_yhwN5GXhdhGQaMMveL2QhNkq-ueSlSHyWsxp36gkqfF4BQ&state=321

const oidc = new Provider(Constants.OIDC_URL, {
  //adapter: RedisAdapter,
  clients: [
    {
      client_id: 'dev-client',
      client_secret: 'dev-secret',
      redirect_uris: ['http://localhost:3000/cb'],
    },
  ],
  // jwks,

  // oidc-provider only looks up the accounts by their ID when it has to read the claims,
  // passing it our Account model method is sufficient, it should return a Promise that resolves
  // with an object with accountId property and a claims method.
  findAccount: TicketService.getAsClaims,

  // let's tell oidc-provider you also support the email scope, which will contain email and
  // email_verified claims
  //TODO: think about how to configure arbitrary scopes, or dynamically change and adapt them
  claims: {
    openid: ['sub'],
    email: ['email', 'email_verified'],
    profile: ['given_name', 'family_name']
  },

  // let's tell oidc-provider where our own interactions will be
  // setting a nested route is just good practice so that users
  // don't run into weird issues with multiple interactions open
  // at a time.
  interactionUrl(ctx) {
    return `/interaction/${ctx.oidc.uid}`;
  },
  formats: {
    AccessToken: 'jwt',
  },
  features: {
    // disable the packaged interactions
    devInteractions: { enabled: false },

    encryption: { enabled: true },
    introspection: { enabled: true },
    revocation: { enabled: true },
  },
});

oidc.proxy = true;
oidc.keys = Constants.SECURE_KEY.split(',');

// let's work with express here, below is just the interaction definition
const expressApp = express();
const server = http.createServer(expressApp)

expressApp.set('trust proxy', true);
expressApp.set('view engine', 'ejs');
expressApp.set('views', path.resolve(__dirname, 'views'));
expressApp.use(express.static('public'));

const parse = bodyParser.urlencoded({ extended: false });
const jsonParse = bodyParser.json()

function setNoCache(req, res, next) {
  res.set('Pragma', 'no-cache');
  res.set('Cache-Control', 'no-cache, no-store');
  next();
}

expressApp.get('/interaction/:uid', setNoCache, async (req, res, next) => {
  try {
    const details = await oidc.interactionDetails(req);
    console.log('see what else is available to you for interaction views', details);
    const { uid, prompt, params } = details;

    const client = await oidc.Client.find(params.client_id);

    if (prompt.name === 'login') {
      // TODO signed envelope
      const request = {
        id: uid,
        name: 'Identity',
        version: '0.1',
        requested_attributes: {
          attr1_referent: {
            name: 'firstName'
          },
          attr2_referent: {
            name: 'lastName'
          },
          attr3_referent: {
            name: 'email'
          }
        },
        requested_predicates: {}
      }

      const proofrequest = JSON.stringify({
        '@id': uid,
        '@type': 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/present-proof/1.0/request-presentation',
        comment: 'test-proof-request',
        '~service': {
          recipientKeys: ['somekeys'],
          routingKeys: ['somekeys'],
          serviceEndpoint: 'http://172.16.0.100:8000/indy'
        },
        'request_presentations~attach': {
          '@id': uid,
          'mime-type': 'application/json',
          data: { base64: Buffer.from(JSON.stringify(request), 'utf-8').toString('base64') }
        }
      })

      return res.render('login', {
        client,
        uid,
        proofrequest,
        details: prompt.details,
        params,
        title: 'Sign-in',
        flash: undefined,
      });
    }

    return res.render('interaction', {
      client,
      uid,
      details: prompt.details,
      params,
      title: 'Authorize',
    });
  } catch (err) {
    return next(err);
  }
});

expressApp.post('/interaction/:uid/login', setNoCache, parse, async (req, res, next) => {
  try {
    const { uid, prompt, params } = await oidc.interactionDetails(req);
    const client = await oidc.Client.find(params.client_id);

    // const account = await Account.authenticate(req.body.email, req.body.password);
    const ticket = await TicketService.getProof(req.body.ticket);

    if (!ticket) {
      res.render('login', {
        client,
        uid,
        details: prompt.details,
        params: {
          ...params,
          login_hint: req.body.email,
        },
        title: 'Sign-in',
        flash: 'Invalid email or password.',
      });
      return;
    }

    const result = {
      login: {
        account: ticket.id,
      },
    };

    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
  } catch (err) {
    next(err);
  }
});

expressApp.post('/interaction/:uid/confirm', setNoCache, parse, async (req, res, next) => {
  try {
    const result = {
      consent: {
        // rejectedScopes: [], // < uncomment and add rejections here
        // rejectedClaims: [], // < uncomment and add rejections here
      },
    };
    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
  } catch (err) {
    next(err);
  }
});

expressApp.get('/interaction/:uid/abort', setNoCache, async (req, res, next) => {
  try {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction',
    };
    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
  } catch (err) {
    next(err);
  }
});

expressApp.post('/indy', jsonParse, (req, res, next) => {
  TicketService.receiveProof(req.body)
  res.status(202).end()
})

// leave the rest of the requests to be handled by oidc-provider, there's a catch all 404 there
expressApp.use(oidc.callback);

// register websockets
WebSocketServer(server)

// express listen
server.listen(Constants.PORT);
console.log('up at %s:%s', server.address().address, server.address().port)

//Example call:
//http://localhost:3001/auth?client_id=foo&response_type=id_token&scope=openid+email&nonce=foobar&prompt=login
//resulting URL: https://example.com/#id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleXN0b3JlLUNIQU5HRS1NRSJ9.eyJzdWIiOiIyMzEyMWQzYy04NGRmLTQ0YWMtYjQ1OC0zZDYzYTlhMDU0OTciLCJlbWFpbCI6ImZvb0BleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdXRoX3RpbWUiOjE1NjU4ODI5ODcsIm5vbmNlIjoiZm9vYmFyIiwiYXVkIjoiZm9vIiwiZXhwIjoxNTY1ODg2NTg3LCJpYXQiOjE1NjU4ODI5ODcsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9.Mm_BNTzmG48Jq6jIJjhFofNgCJaDSlE41HbJeRfyahDU5kZFTK2Zu435ifCc8snRQ2JnSoU0oEKlavWdLLNil2nrXceXt0b-ESkZQ5r7NWrhdNAaeIAVTuVnWglqeBylBuzuoPav_zCHhKKFfkGmYTPPCqdv4yjQQqafk3dDTJXIcicQKlqrCSw---0F0U7b9X5Tq1WF5Teb8wPrPcyqR_C8j_K3hLrczNTLVpzi6yOJBBG57PLTHRTALIYlUgKmmVmg9dL2HUKj2SWTTDOpYCAcprN2NIqfRqGSQDRwVo3TzHCgZFEthQH5yEJwIPkZfq5aFTs6pgc4bW-_glOHvQ