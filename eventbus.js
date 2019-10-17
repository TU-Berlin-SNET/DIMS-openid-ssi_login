/**
 * Event Bus
 */
'use strict'

const EventEmitter = require('events')

/**
 * EventBus Class
 */
class EventBus extends EventEmitter {}

const eventBus = new EventBus()

module.exports = eventBus
