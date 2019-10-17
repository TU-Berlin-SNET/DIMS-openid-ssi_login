# OpenID-SSI_Login

A bridge between the OpenID-Connect and Self-Sovereign Identity / DIDComm World.

Implements `2-Step DID-Auth + Proof Exchange` Variation (see [docs/variants.md](docs/variants.md#2-step-did-auth-proof-exchange)). Also see [docs](docs) for various documentation and screencast.

## Configuration

See `config.js`

## Requirements

- A configured and running instance of the [dims-api](https://git.snet.tu-berlin.de/blockchain/dims/api)

  NOTE 2019-10-17: tested with the newer protocol versions, i.e. the `develop` branch of [dims-api](https://git.snet.tu-berlin.de/blockchain/dims/api)

## How to run

```shell
npm install

npm start
```

The OIDC-Provider registers and logs in at the DIMS-API on startup.

## How to run the testclient
```shell
# npm install

# how to run a single client
npm run testclient

# how to run multiple testclients
# 1. Start testclient-1 and keep it running:
npm run testclient

# 2. change configuration for testclient-2 in ./test-client/index.js and run it
# specifically: change port, sessionConfig.key, oidcClient.{clientId, clientSecret, redirectUri}
vim test-client/index.js
npm run testclient
```

## FAQ

### create user failed: Request failed with status code 400

In most cases this is not an issue and only means that the user at the DIMS-API already exists and therefore could not be created.
