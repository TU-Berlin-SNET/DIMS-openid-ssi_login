/**
 * Wrapper to use async functions with express
 */
'use strict'

module.exports = fn => (req, res, next) => fn(req, res, next).catch(next)
