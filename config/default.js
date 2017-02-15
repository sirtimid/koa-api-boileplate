var defer = require('config/defer').deferConfig
var knexfile = require('../knexfile')

var env = process.env.NODE_ENV || 'development'

var all = {

	env: env,

	ip: process.env.IP || undefined,

	port: process.env.PORT || 8080,

	app_name: 'API Boilerplate',

	app_url: 'http://localhost:8080',

	// List of user roles
	user_roles: ['guest', 'user', 'admin'],

	log: {
		name: 'api-boilerplate',
		level: 'debug',
		src: true
	},

	// knex configuration from root obj
	knex: knexfile[env],

	redis:{
		url: "redis://127.0.0.1/0?keyPrefix=adx:"
	},

	mail:{
		from: 'API Boilerplate <noreply@api.temp>',
		transport: {
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			ignoreTLS: true,
			logger: false,
			auth: {
				user: 'email',
				pass: 'password'
			}
		}
	},

	// Secrets
	secrets: {
		session: process.env.SESSION_SECRET || 'SOME_SESSION_SECRET',
	},

	facebook: {
		clientID:     process.env.FACEBOOK_ID || 'id',
		clientSecret: process.env.FACEBOOK_SECRET || 'secret',
		callbackURL:  (process.env.DOMAIN || '') + '/auth/facebook/callback'
	},

	twitter: {
		clientID:     process.env.TWITTER_ID || 'id',
		clientSecret: process.env.TWITTER_SECRET || 'secret',
		callbackURL:  (process.env.DOMAIN || '') + '/auth/twitter/callback'
	},

	google: {
		clientID:     process.env.GOOGLE_ID || 'id',
		clientSecret: process.env.GOOGLE_SECRET || 'secret',
		callbackURL:  (process.env.DOMAIN || '') + '/auth/google/callback'
	},

	github: {
		clientID:     process.env.GOOGLE_ID || 'id',
		clientSecret: process.env.GOOGLE_SECRET || 'secret',
		callbackURL:  (process.env.DOMAIN || '') + '/auth/github/callback'
	},

	results_limit: 15

}

module.exports = all