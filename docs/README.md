# OIDC VC Authn/Authz Prototype

## Components

- Test-OIDC-Client (Medya Market Website)
- OpenID-SSI_Login (OIDC Provider)
- User Browser
- User Device with walleted app / credentials (walleted device, simulated using curl on terminal)

NOTE: User browser and device may be on the same device.

## Summary

1. User browser loads Medya Market Website, user clicks oidc-login and initiates oidc authorization code flow.

2. Browser redirect to oidc provider which shows a proof request as a qrcode. Browser also establishes websocket connection with oidc-provider backend. Proof request contains response endpoint information so no prior did-exchange is needed.

3. User scans QR Code using walleted app, or prompts opening of app using deep-link (if browser is on the same device). Prototype copies interaction uid from url for response call.

4. User accepts proof request. Prototype shows example response call using `curl`.

5. Browser is notified of valid reception of proof using websocket connection and shows oidc authorize prompt for new scopes.

6. User accepts, browser is redirected back to client website with authorization code in url query string.

7. Client website fetches tokens using authorization code and presents information.

