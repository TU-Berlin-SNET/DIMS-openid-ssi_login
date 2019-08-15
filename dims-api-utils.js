const axios = require('axios')
const Constants = require("./constants")

async function fetchTransactions(from, to,token){
    let headers = {
        'Content-Type': 'application/json',
        'Authorization': token
    }
    var result = axios.get(Constants.DIMS_API_URL + "transactions?from="+ from + "&to=" + to, {headers: headers})
    .then(function (response) {
        if (response.status === 200) {
            return(response.data)
        }
    }).catch(function (error){
        console.log(error)
        return([])
    })
    return(result)
}

async function apiLogin(username, pass) {
    var self = this;
    var token = null
    var payload = {
        "username": username,
        "password": pass
    }
    await axios.post(Constants.DIMS_API_URL + 'login', payload)
        .then(function (response) {
            if (response.status === 200) {
                console.log("Login successfull");
                token = response.data.token

            }
            else if (response.status === 204) {
                console.log("Username password do not match");
            }
            else {
                console.log("Username does not exists");
            }
        })
        .catch(function (error) {
            console.log(error);
        });
        return(token);
}

async function apiLogin() {
    var self = this;
    var token = null
    var payload = {
        "username": Constants.DIMS_API_USER,
        "password": Constants.DIMS_API_PASS
    }
    await axios.post(Constants.DIMS_API_URL + 'login', payload)
        .then(function (response) {
            if (response.status === 200) {
                console.log("Login successfull");
                token = response.data.token

            }
            else if (response.status === 204) {
                console.log("Username password do not match");
            }
            else {
                console.log("Username does not exists");
            }
        })
        .catch(function (error) {
            console.log(error);
        });
        return(token);

  /* GET /api/proof
  */
  async function listProofs(){
   var self = this;
   var headers = {
    'Content-Type': 'application/json',
    'Authorization': localStorage.getItem("token") 
   }
   await axios.get(Constants.DIMS_API_URL + 'proof' , {headers: headers}).then(function (response) {
      console.log(response);
      console.log(response.status);
      if (response.status === 200) {
        return(response.data)
      }
    }).catch(function (error) {
    console.log(error);
  })

// GET wallet/default/connection
async function listPairwiseConnectionOptions(){
    var self = this;
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem("token")
    }
    await axios.get(apiBaseUrl + "wallet/default/connection", {headers: headers}).then(function(response){
        console.log(response);
        console.log(response.status);
        if (response.status === 200) {
          let pairwiseConnections = response.data.map((conn) => {
              return(
                {
                    value: conn.their_did,
                    label: conn.metadata.username 
                }
              )
          })
          self.setState({
              pairwiseConnectionsOptions: pairwiseConnections
          })
        }
      }).catch(function (error) {
      console.log(error);
      });
  }

async function sendProofRequest(){
    var self = this;
    var headers = {
     'Content-Type': 'application/json',
     'Authorization': localStorage.getItem("token") 
    }
   
   let requestedAttrs = this.state.requested_attributes.reduce(function(map, obj) {
     map["map"][obj[0].toLowerCase().replace(/\s/g, "_") + "_referent"] = {"name": obj[0].toLowerCase().replace(/\s/g, ""), "restrictions": [{ "cred_def_id": obj[1] }]};
     map["index"] = map["index"] + 1;
     return map;
   }, {"map":{},"index":1})["map"];
   var payload =  {
       "recipientDid": this.state.recipientDid,
       "proofRequest": {
         "name": this.state.proofRequestName,
         "version": this.state.proofRequestVersion,
         "requested_attributes": requestedAttrs,
         "requested_predicates": { }
       }
     }
    axios.post(apiBaseUrl + 'proofrequest' ,payload, {headers: headers}).then(function (response) {
     console.log(response);
     console.log(response.status);
     if (response.status === 201) {
       alert("proof request successfully sent")
     }
   }).catch(function (error) {
   //alert(error);
   //alert(JSON.stringify(payload))
   console.log(error);
   });
   }

   async function verifyProof(){
    var self = this;
     var headers = {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem("token") 
     }
     await axios.get(apiBaseUrl + 'proof/' + this.state.proofId , {headers: headers}).then(function (response) {
        console.log(response);
        console.log(response.status);
        if (response.status === 200) {
          let proof = response.data
          if(typeof(proof.isValid) == 'undefined'){
            alert("Verification failed. Please try again!")
          } else {
            let isValid = proof.isValid ? "is" : "is not"
            alert("Proof " + isValid + " valid!")
        }
        }
      }).catch(function (error) {
      console.log(error);
    })
    }

async function registerUser(username, password){
    var self = this;
    var result = "pending"
    let payload = {
        "username": username,
        "password": password,
        "wallet": {
          "name": username + "-wallet",
          "credentials": { "key" : "testkey" }
        }
      }
    await axios.post(Constants.DIMS_API_URL + 'user', payload)
        .then(function (response) {
            if (response.status === 201) {
                console.log("Registration successfull");
                result = response.data.id
            } else {
                console.log("Registration unsuccessfull");
                result = "Registration unsuccessfulls"
            }
        })
        .catch(function (error) {
            console.log(error);
        });
        return(result);
}

module.exports.fetchTransactions = fetchTransactions
module.exports.apiLogin = apiLogin
module.exports.registerUser = registerUser