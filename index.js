'use strict'

const env = process.env.NODE_ENV || 'development'
const src = env === 'production' ? './lib/app' : './src/app'

require('babel-polyfill')
if (env === 'development') {
	// used for development for faster runtime compilation
	require('babel-register')
}

exports = module.exports = require(src)