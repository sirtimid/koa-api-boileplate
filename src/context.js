'use strict'

import config from 'config'
import bunyan from 'bunyan'
import path from 'path'
import Redis from 'ioredis'
import { debuglog } from 'util'

export { config }

// create logger
export const log = bunyan.createLogger({
	name: config.get('log.name'),
	level: config.get('log.level'),
	serializers: bunyan.stdSerializers,
	src: config.get('log.src')
})

// create db connection
export const knex = require('knex')(config.get('knex'))
knex.on('query', debuglog('knex'))

// create redis connection
export const redis = new Redis(config.get('redis.url'))

// load models
export const models = require('./models').default(knex)