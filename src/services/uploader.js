'use strict'

import fs from 'fs'
import uuid from 'uuid'
import path from 'path'
import mkdirp from 'mkdirp'
import parse from 'async-busboy'

/**
 * Upload files to server
 *
 * @param options { folder, mimetypes }
 * @returns middleware function
 */
export default (options) => {
	options = Object.assign({ folder: '' }, options)

	return async (ctx, next) => {

		// Validate Request
		if ('POST' !== ctx.method && !ctx.request.is('multipart/*')) {
			return await next()
		}

		// Parse request for multipart
		const {files, fields} = await parse(ctx.req)

		// Check if any file is not valid mimetype
		if (options.mimetypes) {
			const invalid = files.filter(file => {
				return !options.mimetypes.includes(file.mimeType)
			})

			// Return err if any not valid
			if (invalid.length !== 0) {
				ctx.status = 400
				ctx.body = `Error: Invalid type of files ${invalid.map(file => { return `${file.filename}[${file.mimeType}]` })}`
				return
			}
		}

		// generate folder path by date
		let date = new Date()
		let folder = `${date.getUTCFullYear()}/${date.getUTCMonth()+1}/${date.getUTCDate()}`
		let filenames = []

		// upload
		try {
			await Promise.all(files.map(file => {
				let filename = `${uuid.v4()}${path.extname(file.filename)}`
				return new Promise((resolve, reject) => {
					// set path
					const filepath = path.join(process.cwd(), 'public', options.folder, folder, filename)
					// create folder
					mkdirp.sync(path.dirname(filepath))
					// upload file
					const stream = fs.createWriteStream(filepath)
					file.pipe(stream)
					file.on("end", () => {
						let file_url = path.join(options.folder, folder, filename)
						filenames.push(`${ctx.config.app_url}/${file_url}`)
						resolve()
					})
				})
			}))
		} catch (err) {
			ctx.status = 500
			ctx.body = `Error: ${err}`
			return
		}

		ctx.body = filenames
	}
}