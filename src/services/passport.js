'use strict'

import passport from 'koa-passport'
import {Strategy as LocalStrategy} from 'passport-local'
import {Strategy as TwitterStrategy} from 'passport-twitter'
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import {Strategy as FacebookStrategy} from 'passport-facebook'
import {Strategy as GithubStrategy} from 'passport-github'

export function setup(User, config) {

	/*
	 * Local Strategy
	 */
	passport.use(new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password'
	}, function(email, password, done) {
		User.find({ email: email.toLowerCase() })
		.then(user => {
			if (!user) {
				return done(null, false, {
					message: 'This email is not registered.'
				})
			}

			if(!user.active) {
				return done(null, false, { message: 'INNACTIVE' })
			}

			if(!User.authenticate(user, password)) {
				return done(null, false, { message: 'This password is not correct.' })
			}

			return done(null, user)
		})
		.catch(err => done(err))
	}))

	/*
	 * Facebook Strategy
	 */
	passport.use(new FacebookStrategy({
		clientID: config.get('facebook.clientID'),
		clientSecret: config.get('facebook.clientSecret'),
		callbackURL: config.get('facebook.callbackURL'),
		profileFields: ['id', 'displayName', 'emails', 'photos']
	},
	async function(accessToken, refreshToken, profile, done) {
		const email = (profile.emails && profile.emails.length) ? profile.emails[0].value : null

		let user = await User.findByProviderOrEmail(email, 'facebook_id', profile.id)
		if (user) {
			return done(null, user)
		}

		try{
			user = await User.create({
				name: profile.displayName,
				username: 'f'+profile.id,
				password: Math.random().toString(36).slice(-16), // TODO: make password null
				email: email,
				photo: (profile.photos && profile.photos.length) ? profile.photos[0].value : null,
				role: 'user',
				provider: 'facebook',
				facebook_id: profile.id,
				user_data: JSON.stringify(profile._json),
				active:1
			})
			return done(null, user)
		}catch(err){
			return done(err)
		}
	}))

	/*
	 * Twitter Strategy
	 */
	passport.use(new TwitterStrategy({
		consumerKey: config.get('twitter.clientID'),
		consumerSecret: config.get('twitter.clientSecret'),
		callbackURL: config.get('twitter.callbackURL')
	},
	async function(token, tokenSecret, profile, done) {
		const email = (profile.emails && profile.emails.length) ? profile.emails[0].value : null

		let user = await User.findByProviderOrEmail(email, 'twitter_id', profile.id)
		if (user) {
			return done(null, user)
		}

		try{
			user = await User.create({
				name: profile.displayName,
				username: profile.username || 't'+profile.id,
				password: Math.random().toString(36).slice(-16), // TODO: make password null
				email: email,
				photo: (profile.photos && profile.photos.length) ? profile.photos[0].value : null,
				role: 'user',
				provider: 'twitter',
				twitter_id: profile.id,
				user_data: JSON.stringify(profile._json),
				active:1
			})
			return done(null, user)
		}catch(err){
			return done(err)
		}
	}))

	/*
	 * Google Strategy
	 */
	passport.use(new GoogleStrategy({
		clientID: config.get('google.clientID'),
		clientSecret: config.get('google.clientSecret'),
		callbackURL: config.get('google.callbackURL')
	},
	async function(accessToken, refreshToken, profile, done) {
		const email = (profile.emails && profile.emails.length) ? profile.emails[0].value : null

		let user = await User.findByProviderOrEmail(email, 'google_id', profile.id)
		if (user) {
			return done(null, user)
		}

		try{
			user = await User.create({
				name: profile.displayName,
				username: profile.username || 'g'+profile.id,
				password: Math.random().toString(36).slice(-16), // TODO: make password null
				email: email,
				photo: (profile.photos && profile.photos.length) ? profile.photos[0].value : null,
				role: 'user',
				provider: 'google',
				google_id: profile.id,
				user_data: JSON.stringify(profile._json),
				active:1
			})
			return done(null, user)
		}catch(err){
			return done(err)
		}
	}))

	/*
	 * Github Strategy
	 */
	passport.use(new GithubStrategy({
		clientID: config.get('github.clientID'),
		clientSecret: config.get('github.clientSecret'),
		callbackURL: config.get('github.callbackURL')
	},
	async function(accessToken, refreshToken, profile, done) {
		const email = (profile.emails && profile.emails.length) ? profile.emails[0].value : null

		let user = await User.findByProviderOrEmail(email, 'github_id', profile.id)
		if (user) {
			return done(null, user)
		}

		try{
			user = await User.create({
				name: profile.displayName,
				username: profile.username || 'git'+profile.id,
				password: Math.random().toString(36).slice(-16), // TODO: make password null
				email: email,
				photo: (profile.photos && profile.photos.length) ? profile.photos[0].value : null,
				role: 'user',
				provider: 'github',
				github_id: profile.id,
				user_data: JSON.stringify(profile._json),
				active:1
			})
			return done(null, user)
		}catch(err){
			return done(err)
		}
	}))

}