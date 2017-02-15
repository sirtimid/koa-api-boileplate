'use strict'

import combineRouters from 'koa-combine-routers'
import auth from './auth'
import user from './user'
import posts from './posts'
import upload from './upload'

export default combineRouters([
	auth,
	user,
	posts,
	upload
])