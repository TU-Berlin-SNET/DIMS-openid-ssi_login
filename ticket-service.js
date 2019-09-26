/**
 * Ticket Service
 * Matches incoming proofs to uids and sends out events
 */
const uuidv4 = require('uuid/v4');
const eventbus = require('./eventbus');

// map uid:proofs
const tickets = {};

module.exports = exports = {};

exports.receiveProof = proof => {
  console.log('ticket-service receiveProof', proof);
  const ticket = { id: uuidv4(), proof };
  tickets[ticket.id] = ticket;
  eventbus.emit('ticket.created', ticket);
}

exports.getProof = id => {
  console.log('ticket-service getProof', id);
  return tickets[id]
}

exports.getAsClaims = async (ctx, id) => {
  console.log('ticket-service getAsClaims', id);
  const ticket = tickets[id]
  if (!ticket) {
    return ticket
  }
  return {
    accountId: ticket.id,

    claims() {
      return {
        sub: ticket.id,
        given_name: ticket.proof.firstname,
        family_name: ticket.proof.lastname,
        email: ticket.proof.email,
        email_verified: true
      }
    }
  }
}