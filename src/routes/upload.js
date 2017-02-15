'use strict'

import Router from 'koa-router'
import * as auth from '../services/auth'
import uploader from '../services/uploader'

const router = new Router({ prefix: '/api/upload' })

/**
 * Upload an image
 */
router.post('/image',
	auth.isAuthenticated(),
	uploader({
		mimetypes: ['image/jpg','image/jpeg','image/png','image/gif'],
		folder: 'images'
	})
)

export default router