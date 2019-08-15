// TODO: do not use such a method for storing passwords, this is only for development purposes
// API user with trust anchor privileges is needed
//const API_USER = "igdzb2i8"
//const API_USER = "igdzb2i8"
const DIMS_API_USER = "Italian Gov"
const DIMS_API_PASS = "test123test"
const DIMS_API_URL = "http://"REPLACE":8005"
const PORT = 3001
const OIDC_URL = "http://localhost:3000"
//Not so secure...
//TODO: generate your own keys
// example https://securekey.heroku.com/
const SECURE_KEY = "4pndhwz8dk57la2fqz0rdakseofsnzqbuz8a0vcwirjkpypcb7,59b26bion3ow0o46hkw8laij99sm4gxe766q5iztumy7pz6o2m"

module.exports.DIMS_API_USER = DIMS_API_USER
module.exports.DIMS_API_PASS = DIMS_API_PASS
module.exports.DIMS_API_URL = DIMS_API_URL
module.exports.PORT = PORT
module.exports.OIDC_URL = OIDC_URL
module.exports.SECURE_KEY = SECURE_KEY
